# AGENTS.md — Cross-AI Tool Compatibility Guide

このファイルは Cursor / GitHub Codex / Aider など Claude Code 以外の AI コーディングツールが、本テンプレートの **always-on ルール** に従えるようにするための抜粋版です。

完全な仕様は [CLAUDE.md](./CLAUDE.md) と [SPECIFICATION.md](./SPECIFICATION.md) を参照してください。

> **設計思想**: 本テンプレートは Claude Code を主軸に設計されていますが、リポジトリの基本ルール(セキュリティ・フィーチャー境界・テスト方針)は AI ツールに依存せず常に適用されます。

---

## 🔴 always-on ルール（削除・無効化禁止）

### 1. フィーチャーベース開発（最重要）

- フィーチャーは `src/features/[名前]/` に配置し、`index.ts` を公開APIとする
- **フックは絶対にindex.tsから公開しない**(リアクティブ状態がフィーチャーをまたいで癒着するため)
- 他フィーチャーのデータは **純粋関数経由でのみ取得**(例: `getUserData()` であって `useUserData()` ではない)
- import形式は `@/features/[名前]` のみ。ディープパス(`@/features/foo/components/...`)禁止
- UIコンポーネントは各フィーチャーが独自実装(共有禁止・重複を許容して独立性を維持)
- 状態管理は各フィーチャーが独自に保持(グローバル状態禁止)

### 2. 計算済みデータ参照原則

- 各フィーチャーは自身のドメインの計算に責任を持つ
- 他フィーチャーは **計算済みの結果を参照**(再計算禁止)
- 例: 会計フィーチャーは売上管理フィーチャーから計算済み売上を取得し、自分で再計算しない
- 同じ計算ロジックを複数箇所に実装しない(単一の真実の源)

### 3. セキュリティ多層防御

- 秘密情報をコードにハードコードしない(`.env.local` を使用)
- `.gitignore` のセキュリティパターンを削除しない(追加のみ許可)
- gitleaks の検出を `--no-verify` で回避しない(根本原因を修正)
- force push は `--force-with-lease` を必須(素の `--force` 禁止)
- 外部API呼出しは **リトライ上限 + exponential backoff** を必須
- Supabase/GitHubトークンは **Owner権限禁止**(必要最小限のロール)
- DB破壊系の警告 Hook と ask 設定を削除・無効化しない
- `public` スキーマに新規テーブルを作成したら明示的に GRANT を付与する(2026-05-30 以降の Supabase は public テーブルをデフォルトで Data API 非公開化。migration に `grant ... on table public.<table> to authenticated, service_role` を含める。未認証公開が必要な場合のみ anon を明示追加し RLS を併用。既存テーブルの遡及対応は不要。**このルールは Supabase 固有で Neon 等の素の PostgreSQL には該当しない**(クライアント直叩き型のみ。Neon はアプリ層で認可))
- Neon 利用時は学習データに頼らず現行仕様を都度確認する(Neon は破壊的変更が頻繁: Auth SDK 書き換え・Snapshot 課金・拡張/API 廃止等。Auth SDK / Management API / 拡張は実装前に Context7 か公式 changelog で現行仕様を確認。コスト系は使用前に料金影響を確認。個別 API 名は陳腐化するため先回り文書化せず実使用後にルール化＝YAGNI)

### 4. 設定ファイル保護

以下を変更してはならない。エラー時はコードを修正する：

- `tsconfig.json` / `eslint.config.mjs` / `vitest.config.ts`
- `next.config.mjs` / `tailwind.config.ts` / `postcss.config.js`
- `.claude/hooks/db-destructive-warning.sh`(過去の本番DB削除事故の再発防止策)

### 5. バグ修正プロトコル

- バグ修正は **回帰テストファースト**(例外なし)
- 配置: tests/regression/YYYY-MM-DD-NNN-description.test.ts（プレースホルダーは実際の日付・連番・説明で置換）
- 失敗確認 → 根本原因修正 → 成功確認 → このテストは削除禁止

### 6. ドキュメント整合性

- ドキュメントと実装は常にセットで更新する
- `tests/consistency/` 配下のテストが乖離をブロックする
- 「とりあえず通す」ための回避コードは書かない

### 7. PR運用モード

現在: **OFF(個人開発デフォルト)**

- main直push可
- ブランチ保護なし
- チーム移行時は `pnpm sc:enable-pr` で切替

### 7.1. ブランチ運用ルール（PR運用OFF時)

**feature branch をリモートに push しない**

- ローカルブランチでの作業は可。merge後にローカルで削除
- 実装後は main に直接 commit & push する
- `git push origin feature/xxx` は禁止
- 理由: 不要な Vercel preview deployment / GitHub Actions 二重実行を防ぐ
- 過去事例: 2026-04-24 に silver-hp で7連投ビルドが発生

### 8. 開発サーバー起動禁止（Cursor / Codex / Aider / Claude Code 共通）

**AI エージェントは開発サーバーを起動しない。動作確認は `pnpm build` で行う。**

- 実行禁止: `pnpm dev` / `pnpm run dev` / `pnpm dev:safe` / `npm run dev` / `yarn dev` / `bun dev` / `next dev` / `vercel dev`
- 代わりに使う: `pnpm build`（ビルド・型エラー検出） / `pnpm typecheck` / `pnpm validate` / `pnpm test`
- 理由: 常駐プロセスがターミナルを占有し、エージェントの作業がそこで停止するため
- ブラウザ確認が必要なときは自分で起動せず、ユーザーに `ALLOW_DEV_SERVER=1 pnpm dev` の実行を依頼する
- 機械的強制: `scripts/dev-guard.js`（自動化環境を検出して起動拒否・ツール非依存）と `.claude/hooks/dev-server-guard.sh`（Claude Code の Bash を exit 2 でブロック）の二層。Cursor 向けには `.cursor/rules/no-dev-server.mdc` が always-on で適用される
- Cursor の command denylist は v1.3 で公式に非推奨化されている（バイパス経路が複数報告されたため）。エディタ設定に頼らず、起動される側で止める設計
- ガードの削除・改変、`ALLOW_DEV_SERVER=1` の自己付与による回避は禁止

### 9. 長時間ブロック操作の禁止（Cursor / Codex / Aider / Claude Code 共通）

**AI エージェントは「戻ってこない操作」を実行しない。確認は品質ゲートまでとし、実画面は人間が見る。**

- **A. ブラウザ自動操作を使わない**: claude-in-chrome / Playwright / Puppeteer の MCP・CLI、`npx playwright`、`lighthouse`、`chromedriver`。本番URLを自分で開いて測定することも含む
- **B. 常駐プロセスを起動しない**: `pnpm start` / `next start`、`test:unit:watch` / `test:unit:ui` / `test:coverage:ui` / `sc:debug` / `fix:bug`、`--watch` 全般、`vitest`（`run` なし）、`serve` / `http-server` / `ngrok` / `supabase start` / `docker compose up`（`-d` なし）
- **C. ログ追従・長時間待機をしない**: `tail -f`、`docker logs -f`、`kubectl logs -f`、`gh run watch`、`vercel logs --follow`、`sleep 60` 以上
- 代わりに使う: `pnpm build` / `pnpm typecheck` / `pnpm validate` / `pnpm test`（単発実行）、`tail -n 200`、`gh run list` / `gh run view`、`docker compose up -d`
- 理由: 終了条件が自分の手を離れている操作は戻ってこず、作業が長時間停止する。実例として dev サーバー禁止後にブラウザ自動操作へ流れ、拡張との往復が 13 回続いて停止した
- 実画面の確認が必要なときは自分で確認せず、**確認してほしい点を箇条書きにして報告する**（ローカル確認の案内は `ALLOW_DEV_SERVER=1 pnpm dev`）
- 機械的強制: `.claude/settings.json` の deny（ブラウザ自動操作 MCP をサーバー単位で拒否）と `.claude/hooks/blocking-op-guard.sh`（MCP・Bash 双方を exit 2 でブロック）。Cursor 向けには `.cursor/rules/no-blocking-operations.mdc` が always-on で適用される
- ガードの削除・改変、deny の緩和、別名コマンドでの迂回は禁止。必要な場合は自己判断せずユーザーに承認を求める

---

## 🟡 重要パターン

### 境界チェック

```bash
pnpm check:boundaries  # コミット前必須
```

### 品質ゲート

```bash
pnpm validate          # lint + typecheck + test + boundaries の全実行
```

### フィーチャー作成

```bash
pnpm create:feature    # 手動でディレクトリを作らない
```

### バグ修正

```bash
pnpm fix:bug           # 回帰テスト作成モード
```

---

## 🔧 ツール別の補足

### Cursor / GitHub Codex / Aider

- 本ファイルが正典です
- Claude Code 固有機能(skills / hooks / subagents / MCP統合)は [CLAUDE.md](./CLAUDE.md) を参照
- 全文仕様は [SPECIFICATION.md](./SPECIFICATION.md) を参照

### Claude Code

- 本ファイルは [CLAUDE.md](./CLAUDE.md) の always-on ルール抜粋です
- 同期は `tests/consistency/agents-sync.test.ts` で自動検証

---

## 📚 詳細参照

| トピック             | ドキュメント                           |
| -------------------- | -------------------------------------- |
| プロジェクト全文仕様 | [SPECIFICATION.md](./SPECIFICATION.md) |
| セットアップ手順     | [SETUP_GUIDE.md](./SETUP_GUIDE.md)     |
| プロジェクト固有情報 | [PROJECT_INFO.md](./PROJECT_INFO.md)   |
| Claude Code 設定     | [CLAUDE.md](./CLAUDE.md)               |
