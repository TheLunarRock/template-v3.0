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
