# SuperClaude v4 コンテキストフレームワーク - Claude Code行動ガイド

## 📚 参照ドキュメント

| ドキュメント                               | 内容                                 |
| ------------------------------------------ | ------------------------------------ |
| **[SPECIFICATION.md](./SPECIFICATION.md)** | 技術仕様書（アプリ再現レベルの詳細） |
| **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**     | セットアップ手順                     |
| **[PROJECT_INFO.md](./PROJECT_INFO.md)**   | プロジェクト固有情報                 |
| **[README.md](./README.md)**               | プロジェクト概要                     |

## 🧠 SuperClaude コンテキストファイル（自動読み込み）

@superclaude/FLAGS.md
@superclaude/PRINCIPLES.md
@superclaude/RULES.md
@superclaude/MCP_Context7.md
@superclaude/MCP_Magic.md
@superclaude/MCP_Morphllm.md
@superclaude/MCP_Playwright.md
@superclaude/MCP_Sequential.md
@superclaude/MCP_Serena.md
@superclaude/MODE_Brainstorming.md
@superclaude/MODE_Introspection.md
@superclaude/MODE_Orchestration.md
@superclaude/MODE_Task_Management.md
@superclaude/MODE_Token_Efficiency.md

# ═══════════════════════════════════════════════════

# 🔐 セキュリティ多層防御（最優先・絶対遵守）

# ═══════════════════════════════════════════════════

## セキュリティ体制（9層防御）

| レイヤー  | 対策                                                                         | 場所           |
| --------- | ---------------------------------------------------------------------------- | -------------- |
| **第1層** | `.gitignore`（秘密鍵・認証・DB・ログ等の包括的除外）                         | ローカル       |
| **第2層** | `gitleaks` pre-commit（パターンマッチで秘密情報検出）                        | ローカル       |
| **第3層** | `~/.gitignore_global`（全プロジェクト共通セーフティネット）                  | ローカル       |
| **第4層** | Claude Code denyルール（破壊的操作・秘密情報読み取り防止）                   | Claude Code    |
| **第5層** | GitHub Secret Scanning（push済みコードのトークン検出）                       | GitHub         |
| **第6層** | GitHub Push Protection（秘密情報を含むpushをブロック）                       | GitHub         |
| **第7層** | Dependabot（脆弱性自動検出・修正PR自動作成）                                 | GitHub         |
| **第8層** | セキュリティヘッダー7種（CSP・クリックジャッキング・MIME・HSTS等）           | ブラウザ       |
| **第9層** | CI/CDパイプライン防御（CodeQL SAST・`pnpm audit`・gitleaks Actions二重防御） | GitHub Actions |

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション12.9・12.14を参照。

## Claude Code denyルール（settings.json）

**評価優先順位:** `deny` → `ask` → `allow`（denyが最優先）

| カテゴリ     | denyルール                                                                                       | 防止する操作                 |
| ------------ | ------------------------------------------------------------------------------------------------ | ---------------------------- |
| システム破壊 | `rm -rf /`, `rm -rf ~`, `mkfs*`, `dd`, `> /dev/*`                                                | OS・ディスクの破壊           |
| 権限破壊     | `chmod 777 *`                                                                                    | 全ファイルのworld-writable化 |
| Git保護      | `git push --force origin main/master`                                                            | 本番ブランチの履歴破壊       |
| 秘密情報保護 | `Read(**/*.pem)`, `Read(**/*.key)`, `Read(~/.ssh/*)`, `Read(~/.aws/*)`, `Read(**/*credentials*)` | 秘密鍵・認証情報の読み取り   |

**通常の開発操作には影響しない:** `rm src/...`、`chmod +x`、`git push origin feature/...`等は許可。

## クローンから開発開始までの完全フロー（友人向け含む）

```bash
# 1. GitHub Desktopまたはgit cloneでクローン（Chrome 146のボタン無効化問題に注意）
git clone [url] my-app && cd my-app

# 2. Cursor内ターミナルで自動セットアップ
pnpm setup:sc
#   ↓ Pre-check: 前提ツール6種を自動検出（不足あればコピペ用コマンド表示）
#   ↓ Step 0: pnpm install（node_modules不在時のみ）
#   ↓ Step 1〜7: 設定/テスト/CI/通知/セキュリティ自動化

# 3. Claude Code 起動
claude

# 4. 自然言語で機能実装を依頼（pnpm dev は不要）
# 例: 「ユーザー認証機能を追加して」

# 5. 動作確認が必要なときだけ
pnpm dev
```

### Pre-check が検出する前提ツール

| 区分    | ツール   | 不足時の挙動                           |
| ------- | -------- | -------------------------------------- |
| 🔴 必須 | Node.js  | exit 1 + `brew install node` 案内      |
| 🔴 必須 | pnpm     | exit 1 + `brew install pnpm` 案内      |
| 🟡 任意 | gh       | warning + `brew install gh` 案内       |
| 🟡 任意 | gitleaks | warning + `brew install gitleaks` 案内 |
| 🟡 任意 | uv       | warning + 案内 (Serena MCP に必要)     |
| 🟡 任意 | claude   | warning + 案内 (Claude Code CLI)       |
| 🟢 推奨 | MCP4種   | warning + 各 `claude mcp add` 案内     |

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション14（特に14.2「Pre-check機能」）を参照。

## 全自動開発設定（settings.local.json）

`pnpm setup:sc`で自動生成される許可設定により、開発中の確認プロンプトはほぼゼロ。

| 区分      | 対象                                       | 備考                                                                                                               |
| --------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **allow** | `Edit`, `Write`, `Bash`, 全MCP, `Skill` 等 | 開発操作は全て自動実行                                                                                             |
| **ask**   | Supabase MCP の DB破壊系5種                | execute_sql / apply_migration / delete_branch / reset_branch / merge_branch — 実行前に承認プロンプト＋警告Hook表示 |
| **deny**  | なし（settings.json側で保護）              | 上記のdenyルールが最優先で適用                                                                                     |

**二重防御:** DB破壊系MCP操作は以下2段階で守られる。

1. **第1段: 警告Hook** — `PreToolUse`フックで `.claude/hooks/db-destructive-warning.sh` が実行され、過去事故の説明+4項目チェックリスト+実行内容プレビューを表示
2. **第2段: ask承認プロンプト** — Claude Code標準の承認UIで最終確認

```
対象Hook対応ツール（本番DB削除事故の再発防止）:
  - mcp__supabase__execute_sql       : 生SQL実行
  - mcp__supabase__apply_migration   : DROP TABLE 等のDDLマイグレーション
  - mcp__supabase__delete_branch     : Supabaseブランチ削除
  - mcp__supabase__reset_branch      : ブランチデータリセット
  - mcp__supabase__merge_branch      : 本番へのスキーマ変更マージ
```

**重要:** 上記5操作以外のSupabase MCP（`list_tables`, `get_logs` 等の読取系）は自動実行される。書込・削除系のみ人間の確認が入る設計。

**Bash経由の単層防御:** Bash の Supabase CLI（`supabase db reset/push/drop`, `supabase migration repair`, `psql`）は ask のみ発火し Hook警告は表示されない（PreToolUse Hook の matcher が MCP 限定のため）。承認プロンプトで意図確認は行われる。

**設計思想と限界:** この防御は「完璧防御」ではなく「うっかりミス防止」に最適化されている。Hook は exit 0 固定（情報提供のみ・ブロックしない）、ask は「always allow」でバイパス可能。意図的な誤操作・外部経路は防げない。完璧防御を求める場合は運用層（PITR・トークン最小権限・dev/prod 物理分離）で補完する。詳細は [SPECIFICATION.md セクション12.15.8](./SPECIFICATION.md) 参照。

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション12.12 / 12.15 を参照。

## セキュリティに関するClaude Code絶対ルール

1. **秘密情報をコードにハードコードしない** — 環境変数（`.env.local`）を使用
2. **`.gitignore`のセキュリティパターンを削除しない** — 追加のみ許可
3. **gitleaksが検出した問題を無視しない** — 根本原因を修正
4. **`--no-verify`でコミットフックを回避しない** — セキュリティチェックは必須
5. **依存パッケージの脆弱性警告を無視しない** — Dependabot PRを確認
6. **denyルールを削除・緩和しない** — 解除が必要な場合は`settings.local.json`で個別override
7. **整合性テスト（`tests/consistency/`）を回避しない** — ドキュメントと実装の乖離は AI の信頼性を破壊するため、必ず両方を同時更新
8. **force pushは必ず `--force-with-lease` を使用** — 素の`--force`は他者のコミットを問答無用で上書きする。`--force-with-lease`はリモートが想定状態と一致する時のみpush成功するため、並行作業中の事故を防ぐ
9. **外部API呼出しはリトライ上限 + exponential backoff を必須** — 無限リトライは課金爆発・レート制限違反・障害拡大の原因。最大試行回数（例: 5回）とバックオフ（例: 2^n秒）を必ず設定
10. **Supabase/GitHubトークンはOwner権限禁止** — 必要最小限のロール（read-only / 特定リソースのwrite等）で発行。Owner権限はroot権限と同等のリスク
11. **DB破壊系Hookと ask 設定を削除・無効化しない** — `.claude/hooks/db-destructive-warning.sh` および settings.json の Supabase MCP破壊系 ask 5種は、過去の本番DB削除事故の再発防止策。解除が必要な場合は`settings.local.json`で個別override（テンプレートのsettings.jsonは触らない）

## GitHub側セキュリティ設定のvisibility分岐

`pnpm setup:sc`はリポジトリのvisibilityを自動判定し、GitHubプラン制限に応じて適用機能を分岐する。

| 機能                   | publicリポジトリ | privateリポジトリ（Free） |
| ---------------------- | ---------------- | ------------------------- |
| **Secret Scanning**    | ✅ 有効化        | ⏭️ スキップ               |
| **Push Protection**    | ✅ 有効化        | ⏭️ スキップ               |
| **Dependabot自動修正** | ✅ 有効化        | ⏭️ スキップ               |
| **Dependabotアラート** | ✅ 有効化        | ✅ 有効化                 |
| **ブランチ保護**       | ✅ 有効化        | ⏭️ スキップ               |

privateリポジトリではスキップ理由を`ℹ`（情報）として表示し、`⚠`（警告）は出さない。

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション12.4を参照。

## リポジトリ公開ポリシー

| 公開状態    | 対象              | 方針                                   |
| ----------- | ----------------- | -------------------------------------- |
| **public**  | template-v3.0のみ | 友人向けテンプレート。ブランチ保護済み |
| **private** | その他全て（44）  | 不要な公開リスクを排除                 |

## 全リポジトリ一括セキュリティコマンド

| コマンド                  | 用途                                                    |
| ------------------------- | ------------------------------------------------------- |
| `pnpm security:scan-all`  | 全ローカルリポジトリをgitleaksで診断（読み取り専用）    |
| `pnpm security:setup-all` | 全GitHubリポジトリにセキュリティ設定を一括適用（3段階） |

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション12を参照。

# ═══════════════════════════════════════════════════

# 🔒 設定ファイル保護ルール（最優先・絶対遵守）

# ═══════════════════════════════════════════════════

## ⛔ 絶対に変更してはいけない設定ファイル

**以下のファイルは品質保証の要であり、絶対に変更してはいけません：**

| ファイル                                    | 役割           | 変更禁止の理由                   |
| ------------------------------------------- | -------------- | -------------------------------- |
| **tsconfig.json**                           | TypeScript設定 | 型安全性を保証                   |
| **eslint.config.mjs**                       | ESLint設定     | コード品質基準を維持             |
| **vitest.config.ts**                        | Vitest設定     | テスト実行環境を保護             |
| **next.config.mjs**                         | Next.js設定    | ビルド設定の一貫性               |
| **tailwind.config.ts**                      | Tailwind設定   | スタイルの一貫性                 |
| **postcss.config.js**                       | PostCSS設定    | CSS処理の安定性                  |
| **.claude/hooks/db-destructive-warning.sh** | DB破壊警告Hook | 過去の本番DB削除事故の再発防止策 |

## 🚨 エラー時の対処法（設定変更は絶対禁止）

| エラー種別       | ❌ 絶対にやってはいけない         | ✅ 正しい対処法            |
| ---------------- | --------------------------------- | -------------------------- |
| **型エラー**     | `// @ts-ignore`追加、tsconfig緩和 | 適切な型定義を実装         |
| **ESLintエラー** | ルール無効化、eslintrc編集        | コードを規約に合わせて修正 |
| **テスト失敗**   | テストスキップ、設定変更          | 実装を修正してテストを通す |
| **ビルドエラー** | 設定ファイル編集                  | 根本原因のコードを修正     |

## 🔒 自動保護機能

```bash
# 設定ファイル保護チェック（コミット時自動実行）
node scripts/protect-config.js

# チェックサムで変更を検出
# 変更が検出されたらコミットをブロック
```

## 📋 Claude Codeへの絶対指示

1. **設定ファイルは読み取り専用** - 参照のみ、編集禁止
2. **エラーは設定変更ではなくコード修正で解決** - 品質基準を維持
3. **テストやリントのルールは不可侵** - 品質の妥協は許されない
4. **困難な場合は質問** - 設定変更ではなく相談を選択

**理由**: このテンプレートの価値は「厳格な品質管理」にあります。設定を緩めることは、テンプレートの存在意義を否定する行為です。

# ═══════════════════════════════════════════════════

# 📁 Claude Code設定ファイル構造

# ═══════════════════════════════════════════════════

## ⚙️ 設定ファイルの種類と役割

`.claude`ディレクトリには2種類の設定ファイルがあります：

| ファイル                            | Git管理 | 役割                                     | 優先度 |
| ----------------------------------- | ------- | ---------------------------------------- | ------ |
| **settings.json**                   | ✅ 管理 | テンプレートのデフォルト設定（全員共通） | 低     |
| **settings.local.json**             | ❌ 除外 | 個人用カスタマイズ設定（上書き）         | 高     |
| **protected-features.example.json** | ✅ 管理 | フィーチャー保護設定のサンプル           | -      |
| **protected-features.json**         | ❌ 除外 | 実際のフィーチャー保護設定               | -      |

## 🔄 設定の読み込み優先順位

Claude Codeは以下の順序で設定を読み込み、後から読み込んだ設定が優先されます：

```
1. settings.json (デフォルト)
   ↓ 上書き
2. settings.local.json (個人用カスタマイズ)
```

## 📝 使い方

### テンプレートをクローンした場合

```bash
# settings.jsonが自動的に含まれる
git clone <template-repo>

# ✅ すぐにSuperClaude機能が使える
/sc:save    # 動作する
/sc:load    # 動作する
```

### 個人用カスタマイズが必要な場合

```bash
# settings.local.jsonを作成（任意）
cp .claude/settings.json .claude/settings.local.json

# settings.local.jsonを編集
# この変更はgit管理外（コミットされない）
```

## ⚠️ 重要な注意事項

1. **settings.jsonは編集しない**
   - テンプレートのデフォルト設定として維持
   - 変更が必要な場合はsettings.local.jsonを使用

2. **settings.local.jsonはコミットしない**
   - .gitignoreで自動除外
   - 個人用設定なのでチームで共有不要

3. **テンプレート更新時**
   - settings.jsonの更新をpull
   - settings.local.jsonは影響を受けない

# ═══════════════════════════════════════════════════

# 🔔 Claude Code通知システム

# ═══════════════════════════════════════════════════

## 自動セットアップ

```bash
# テンプレートクローン後に実行
pnpm setup:sc

# 対話式で通知設定
# 1. 「通知を設定しますか？ (y/N):」→ y
# 2. 「Webhook URL:」→ Slack Webhook URLを入力（空欄可）
```

## 通知タイミング

| フック                                 | 発火条件       | 用途                 |
| -------------------------------------- | -------------- | -------------------- |
| **Stop**                               | タスク完了時   | 作業終了の通知       |
| **Notification** (`permission_prompt`) | 承認待ち時     | ツール使用許可の通知 |
| **Notification** (`idle_prompt`)       | 60秒アイドル時 | 応答待ちの通知       |

## 通知方法（3重通知）

1. **macOSサウンド** - Glass.aiff（即時）
2. **macOS通知センター** - プロジェクト名表示
3. **Slack** - Webhook経由（設定時のみ）

## 設定ファイル

| ファイル          | 場所         | 用途                |
| ----------------- | ------------ | ------------------- |
| `settings.json`   | `~/.claude/` | グローバルhooks設定 |
| `slack-notify.sh` | `~/.claude/` | 通知スクリプト      |

## プロジェクト固有設定の注意

**重要**: プロジェクトに`.claude/settings.local.json`がある場合、hooksも含める必要があります。

```json
{
  "hooks": {
    "Stop": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude/slack-notify.sh" }] }
    ],
    "Notification": [
      {
        "matcher": "permission_prompt|idle_prompt",
        "hooks": [{ "type": "command", "command": "~/.claude/slack-notify.sh" }]
      }
    ]
  },
  "permissions": {
    /* 既存設定 */
  }
}
```

## トラブルシューティング

| 問題                      | 解決策                                           |
| ------------------------- | ------------------------------------------------ |
| 通知が来ない              | プロジェクトの`settings.local.json`にhooksを追加 |
| Slackのみ来ない           | Webhook URLを確認・再設定                        |
| Cursor/VSCodeで動作しない | 既知のバグ、Stopフックのみ動作（修正待ち）       |

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション11を参照。

# ═══════════════════════════════════════════════════

# 🔄 CI/CDパイプライン

# ═══════════════════════════════════════════════════

## テスト戦略

| テスト種別         | ツール | CI実行  | 方針                                         |
| ------------------ | ------ | ------- | -------------------------------------------- |
| **ユニットテスト** | Vitest | ✅ 自動 | テンプレート標準。全プロジェクトで実行       |
| **回帰テスト**     | Vitest | ✅ 自動 | バグ修正時に必ず作成（test:regression）      |
| **E2Eテスト**      | なし   | ❌ 削除 | テンプレートには含まない（下記設計判断参照） |

## CI/CDパイプライン構成（GitHub Actions）

```
push/PR → quality（型+境界+lint） ─┐
                                    ├→ build（ビルド+preflight）
       → test（Vitest+カバレッジ計測） ─┘
```

- **quality**と**test**は並列実行（依存関係なし）
- **build**はquality・test両方の成功後に実行
- 実行環境: ubuntu-latest / Node.js は **`.nvmrc` 参照（v3.7.2〜）** / pnpm 9
- **test ジョブはカバレッジを計測**し `coverage/` を `actions/upload-artifact@v4` で14日保持（v3.7.2〜）
- **`pnpm validate` が coverage 計測まで統合**（v3.7.5〜）— ローカルでも `coverage/index.html` が常に最新

### カバレッジ閾値（thresholds）について

テンプレートデフォルトでは **閾値強制を行わない**（v3.7.5〜）。理由は個人開発デフォルト（PR運用OFF）でレビュアー不在のため。**Claude Codeルール**: テンプレート段階で `vitest.config.ts` に `thresholds` を追加しない。チーム移行プロジェクトで必要なら、SPECIFICATION.md §17.2 の v3 系フラット記法で追加すること。

### Node.js バージョン管理の単一の真実の源

`.nvmrc` を唯一の真実の源として、CI（`node-version-file: '.nvmrc'`）・ローカル（`nvm use`）・`engines.node`（範囲指定）が同期される。`.nvmrc` を更新するだけで全環境のバージョンが切り替わる。**Claude Codeルール**: CI/security ワークフローの Node バージョンを直書きせず、必ず `.nvmrc` 参照を使用すること。

## E2Eテスト削除の設計判断（2026-03-13）

| 項目     | 内容                                                                                    |
| -------- | --------------------------------------------------------------------------------------- |
| **問題** | テンプレートからクローンした全リポジトリでPlaywrightが自動実行されActions分数を大量消費 |
| **対策** | テンプレートからE2Eテスト（Playwright）を完全削除                                       |
| **方針** | Vitestによるユニットテスト・回帰テストのみ提供。E2Eは各プロジェクトで個別導入           |
| **影響** | 既存クローン済み23リポジトリのci.ymlからもE2Eステップを一括削除済み                     |

**Claude Codeルール**: このテンプレートにPlaywright/E2Eテストを追加しないこと。E2Eが必要な場合は個別プロジェクトのci.ymlに追加する。

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション9を参照。

# ═══════════════════════════════════════════════════

# ⚠️ 既知の問題

# ═══════════════════════════════════════════════════

## Chrome 146 + GitHub Desktop 問題（2026-03-15）

| 項目         | 内容                                                      |
| ------------ | --------------------------------------------------------- |
| **問題**     | GitHubの「Open with GitHub Desktop」ボタンが動作しない    |
| **原因**     | Chrome 146がJavaScriptからの外部プロトコル起動をブロック  |
| **バグ報告** | Chromium Issue #492668894                                 |
| **回避策**   | GitHub Desktopから直接クローン（File → Clone Repository） |
| **影響**     | テンプレート機能自体には影響なし。クローン操作のみ        |

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション18を参照。

# ═══════════════════════════════════════════════════

# 🟡 MCP優先原則（推奨レベル）

# ═══════════════════════════════════════════════════

### コンテキスト駆動フロー

```bash
1. mcp__serena__activate_project  # セッション開始時必須（記憶読み込み）
2. TodoWrite([...])               # 2ステップ以上で必須
3. 使用ツールを宣言               # 複雑タスク時は推奨（MCP利用有無を含む）
4. 並列実行（独立操作は必ず）      # 効率化必須
```

### 🧠 Serenaメモリパターン

```typescript
// 以下のタイミングで保存パターンを適用
const MEMORY_PATTERNS = {
  タスク完了時: "mcp__serena__write_memory('task_完了', result)",
  エラー解決時: "mcp__serena__write_memory('solution_エラー名', fix)",
  新パターン発見: "mcp__serena__write_memory('pattern_名前', code)",
  '30分経過': "mcp__serena__write_memory('checkpoint_時刻', state)",
  重要な決定: "mcp__serena__write_memory('decision_内容', reason)",
  セッション終了: "mcp__serena__write_memory('session_summary', all)",
}
```

### 🎮 /sc:コマンドコンテキストトリガー

```typescript
// キーワード検出時にコンテキストを読み込み
const SC_CONTEXT_TRIGGERS = {
  // セッション管理
  作業開始: 'pnpm sc:start', // git status + 境界チェック
  セッション開始: 'pnpm sc:start',

  // フィーチャー開発
  新機能: 'pnpm sc:feature', // フィーチャー作成ウィザード
  フィーチャー作成: 'pnpm sc:feature',
  コンポーネント追加: 'pnpm sc:feature',

  // 品質管理
  境界チェック: 'pnpm sc:boundaries', // 境界違反検出
  境界違反: 'pnpm sc:boundaries',
  依存関係: 'pnpm sc:analyze', // 依存関係分析

  // テスト・検証
  テスト実行: 'pnpm sc:test', // フィーチャー単位テスト
  品質チェック: 'pnpm sc:validate', // 包括的検証
  リリース前: 'pnpm sc:validate',

  // リファクタリング
  リファクタリング: 'pnpm sc:refactor', // 境界維持リファクタ
  コード改善: 'pnpm sc:refactor',

  // ビジネス分析（v4新機能）
  ROI: 'pnpm sc:business-panel', // ビジネス価値分析
  優先順位: 'pnpm sc:business-panel',
  ビジネス価値: 'pnpm sc:business-panel',
}

// コンテキスト適用例：タスク開始時にパターン判断
if (task.includes('新機能')) {
  loadContext('commands/sc/feature.md') // コンテキスト読み込み
}
```

### 🎯 並列実行の推奨パターン

```typescript
// ❌ 絶対禁止：順次実行
file1 = read(); file2 = read(); file3 = read();

// ✅ 必須：並列実行
[file1, file2, file3] = await Promise.all([...])
```

詳細は以下を参照：

- **[SUPERCLAUDE_FINAL.md](./SUPERCLAUDE_FINAL.md)** - SuperClaude v4.0.8完全ガイド（統合版）

# ═══════════════════════════════════════════════════

# 🚀 SuperClaude v4 Production Edition の新機能

# ═══════════════════════════════════════════════════

## 📊 バージョン情報

| 項目                  | 内容                                 |
| --------------------- | ------------------------------------ |
| **Framework Version** | SuperClaude v4.0.8                   |
| **Template Edition**  | Production (Enterprise-ready)        |
| **Architecture**      | Feature-based with strict boundaries |
| **Context Bundling**  | テンプレート同梱済み（superclaude/） |
| **Last Updated**      | 2026-03-30                           |

## 🎯 v4新機能：本テンプレートで想定する主要エージェント

### プロダクション開発に最適化されたエージェント

> SuperClaude本家v4.3.0には20エージェントが存在するが、本テンプレートは以下14種をフィーチャー境界設計と整合する範囲で主要セットとして扱う。残り（business-panel-experts / deep-research-agent / pm-agent / repo-index / self-review / socratic-mentor 等）は必要に応じて個別に呼び出す。

| エージェント             | 役割                               | フィーチャー境界との統合           |
| ------------------------ | ---------------------------------- | ---------------------------------- |
| **general-purpose**      | 複雑な質問の調査と多段階タスク     | 全フィーチャー横断的な分析         |
| **python-expert**        | SOLID原則に基づくPythonコード      | フィーチャー内のPython実装         |
| **system-architect**     | スケーラブルなシステム設計         | フィーチャー間の依存関係設計       |
| **refactoring-expert**   | 技術的負債の削減とリファクタリング | 境界を維持したリファクタリング     |
| **devops-architect**     | インフラとデプロイメントの自動化   | CI/CDパイプライン統合              |
| **security-engineer**    | セキュリティ脆弱性の特定と対策     | フィーチャー単位のセキュリティ監査 |
| **frontend-architect**   | アクセシブルで高性能なUI           | フィーチャー内UIコンポーネント設計 |
| **backend-architect**    | 信頼性の高いバックエンドシステム   | APIフィーチャーの設計              |
| **quality-engineer**     | 包括的なテスト戦略                 | フィーチャー単位のテスト           |
| **performance-engineer** | システムパフォーマンス最適化       | ボトルネック分析と改善             |
| **requirements-analyst** | 要件定義と仕様化                   | フィーチャー要件の明確化           |
| **technical-writer**     | 技術文書の作成                     | フィーチャードキュメント           |
| **root-cause-analyst**   | 複雑な問題の根本原因分析           | 境界違反の原因特定                 |
| **learning-guide**       | プログラミング概念の教育           | チームへの知識共有                 |

## 🎮 `pnpm sc:*` コマンド体系（v4統一名前空間）

**⚠️ 重要な区別**:

- **`pnpm sc:*`** — 本テンプレート同梱の **16種**のnpmスクリプト（`package.json` の `scripts` に実装）。クローンした全環境で動作。
- **`/sc:*`** — SuperClaude フレームワーク本家の Claude Code スラッシュコマンド（`~/.claude/commands/sc/`）。ユーザーグローバルインストールが必要で、本テンプレート同梱ではない。

**本プロジェクトで使うのは原則 `pnpm sc:*`**。16種の完全カタログは [SPECIFICATION.md セクション7.5](./SPECIFICATION.md) を参照。

### フィーチャー開発で常用する7コマンド

| コマンド             | 機能                           | 使用タイミング         |
| -------------------- | ------------------------------ | ---------------------- |
| `pnpm sc:start`      | セッション開始＋境界チェック   | 作業開始時             |
| `pnpm sc:feature`    | フィーチャー作成ウィザード     | 新機能追加時           |
| `pnpm sc:boundaries` | 境界違反の検出                 | 実装後の検証           |
| `pnpm sc:analyze`    | フィーチャー依存関係分析       | アーキテクチャレビュー |
| `pnpm sc:test`       | テスト実行                     | 品質保証               |
| `pnpm sc:refactor`   | 境界を維持したリファクタリング | コード改善             |
| `pnpm sc:validate`   | 包括的な品質チェック           | リリース前             |

**残り9コマンド**: `sc:plan` / `sc:brainstorm` / `sc:parallel` / `sc:mcp` / `sc:implement` / `sc:optimize` / `sc:review` / `sc:debug` / `sc:business-panel` — 詳細は [SPECIFICATION.md セクション7.5](./SPECIFICATION.md) 参照。

## 🎭 6つの行動モード（v4完全版）

| モード                | 用途         | フィーチャー開発での活用   |
| --------------------- | ------------ | -------------------------- |
| **Brainstorming**     | 要件探索     | 新フィーチャーの概念設計   |
| **Business Panel** 🆕 | 戦略的分析   | ビジネス価値とROI評価      |
| **Orchestration**     | 効率的な実行 | 並列タスクの最適化         |
| **Token-Efficiency**  | リソース節約 | 大規模リファクタリング時   |
| **Task Management**   | 体系的管理   | フィーチャー実装の進捗管理 |
| **Introspection**     | メタ認知分析 | 境界違反の深層分析         |

# ═══════════════════════════════════════════════════

# ⚡ MCP活用ルール - MCP-Aware（適材適所）

# ═══════════════════════════════════════════════════

## 🚀 MCPサーバー活用方針

**MCPサーバーはネイティブツールを補完する拡張能力として、適材適所で使用します。**
**Read/Edit/Grep/Glob 等のネイティブツールは一次選択肢。MCPは質的に異なる価値を提供する場面で選択します。**
**Opus 4.7 はネイティブで構造化推論を行うため、Sequential-thinking は必須ではなく効果的な場面で選択します。**

### ⚠️ MCPサーバー初回セットアップ（別PCでのクローン時）

SuperClaudeのコンテキストファイルはテンプレートに同梱済み（`superclaude/` ディレクトリ、CLAUDE.mdの `@` 参照で自動読み込み）。
MCPサーバーのみユーザーレベル設定のため、テンプレートをクローンした各PC上で初回のみ手動設定が必要。`pnpm setup:sc`の完了メッセージに手順が表示される。

```bash
# 前提: uv をインストール（Serenaに必要）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 必須MCPサーバーを登録
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
claude mcp add morphllm-fast-apply -- npx @morph-llm/morph-fast-apply /home/

# 設定確認
claude mcp list
```

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション20を参照。

### 🎯 利用可能なMCPサーバー（ティア別）

本テンプレートは以下3ティアでMCPを整理する。ティアは「プロンプトで代替不可能か」を基準に分類。

#### 🟢 ティア1: 必須（プロンプト代替不可）

| MCPサーバー  | 用途                             | 使用すべきタイミング                                 |
| ------------ | -------------------------------- | ---------------------------------------------------- |
| **Serena**   | セマンティック検索・シンボル操作 | コード検索、関数定義、依存関係分析、プロジェクト記憶 |
| **Supabase** | Supabaseプロジェクト管理         | DB操作、Edge Functions、認証設定                     |

#### 🟡 ティア2: 推奨（質的価値あり・ケース次第）

| MCPサーバー  | 用途                         | 使用すべきタイミング                             |
| ------------ | ---------------------------- | ------------------------------------------------ |
| **Context7** | 公式ドキュメント参照         | ライブラリAPI のハルシネーション防止が必要な場面 |
| **Stitch**   | UIデザイン・プロトタイピング | デザイン成果物生成が必要な場面（UI作業時のみ）   |

#### 🟠 ティア3: 補助（ネイティブで十分な場面多い）

| MCPサーバー             | 用途             | 補足                                                            |
| ----------------------- | ---------------- | --------------------------------------------------------------- |
| **Morphllm-fast-apply** | 高速パターン編集 | 10ファイル超の一括置換で有効。3〜5ファイル程度はMultiEditで十分 |
| **Sequential-thinking** | 構造化思考       | Opus 4.7はネイティブで構造化推論するため、多くの場面で不要      |
| **IDE**                 | VS Code連携      | 診断情報取得。`pnpm typecheck` 等で代替可                       |

詳細なティア分類基準・設計変更の経緯・今後の運用方針は [SPECIFICATION.md §20.8](./SPECIFICATION.md) を参照。

### 📋 タスク別のツール選択指針

| タスク種別                   | 一次選択            | 補足                                               |
| ---------------------------- | ------------------- | -------------------------------------------------- |
| **コード検索・分析**         | Serena (semantic)   | 純粋なテキスト検索は Grep/Glob で十分              |
| **ファイル操作**             | Read/Edit/MultiEdit | 10ファイル超の一括パターン置換のみ Morphllm        |
| **複雑な分析・デバッグ**     | ネイティブ推論      | 多段階の構造化が有益な場面のみ Sequential-thinking |
| **ドキュメント参照**         | Context7            | 公式パターン厳守の場面。一般知識は native で十分   |
| **DB操作（Supabase）**       | Supabase MCP        | 破壊系5種は ask + Hook 警告が発動                  |
| **UIデザイン・プロトタイプ** | Stitch MCP          | 手動 CSS/HTML より効率的                           |

### 💡 MCP 適用が効果的なキーワード

```typescript
// 以下のキーワードが出現した場合、MCP 適用を検討する（必須ではない）
// Opus 4.7 のネイティブ推論で十分な場面では MCP を省略してよい
const MCP_HINTS = {
  // Serena: セマンティック検索・プロジェクト記憶
  関数: 'mcp__serena__find_symbol',
  クラス: 'mcp__serena__find_symbol',
  シンボル: 'mcp__serena__find_symbol',
  依存関係: 'mcp__serena__find_referencing_symbols',
  プロジェクト: 'mcp__serena__activate_project',
  記憶: 'mcp__serena__write_memory',

  // Morphllm: 高速ファイル操作
  複数ファイル: 'mcp__morphllm-fast-apply__read_multiple_files',
  ディレクトリ: 'mcp__morphllm-fast-apply__list_directory',
  ファイル作成: 'mcp__morphllm-fast-apply__write_file',
  一括編集: 'mcp__morphllm-fast-apply__tiny_edit_file',

  // Sequential: 構造化思考
  なぜ: 'mcp__sequential-thinking__sequentialthinking',
  原因: 'mcp__sequential-thinking__sequentialthinking',
  設計: 'mcp__sequential-thinking__sequentialthinking',
  デバッグ: 'mcp__sequential-thinking__sequentialthinking',
  分析: 'mcp__sequential-thinking__sequentialthinking',

  // Context7: 公式ドキュメント
  React: 'mcp__context7__resolve-library-id → get-library-docs',
  'Next.js': 'mcp__context7__resolve-library-id → get-library-docs',
  Vue: 'mcp__context7__resolve-library-id → get-library-docs',
  Tailwind: 'mcp__context7__resolve-library-id → get-library-docs',

  // Supabase: DB/認証管理
  データベース: 'mcp__supabase__list_tables',
  マイグレーション: 'mcp__supabase__apply_migration',
  'Edge Function': 'mcp__supabase__deploy_edge_function',
  Supabase: 'mcp__supabase__search_docs',

  // Stitch: UIデザイン・プロトタイピング
  UIデザイン: 'mcp__stitch__list_projects',
  プロトタイプ: 'mcp__stitch__create_project',
  スクリーン: 'mcp__stitch__list_screens',
  デザイン生成: 'mcp__stitch__generate_screen_from_text',
  バリアント: 'mcp__stitch__generate_variants',
}
```

### 💡 MCPサーバー併用パターン（SuperClaude最大活用）

```bash
# パターン1: 分析→実装（最頻出）
mcp__sequential-thinking → mcp__morphllm-fast-apply
"複雑な問題を分析してから効率的に実装"

# パターン2: 検索→編集（リファクタリング）
mcp__serena__find_symbol → mcp__morphllm-fast-apply__tiny_edit_file
"シンボル検索して正確な場所を特定してから編集"

# パターン3: ドキュメント→実装（新機能）
mcp__context7__get-library-docs → mcp__serena__write_memory
"公式パターンを確認して記憶に保存してから実装"

# パターン4: DB設計→実装（Supabase）
mcp__supabase__list_tables → mcp__supabase__apply_migration
"既存テーブル確認してからマイグレーション適用"

# パターン5: デザイン→実装（Stitch→コード）
mcp__stitch__get_screen → mcp__morphllm-fast-apply__write_file
"Stitchデザインのカラー・タイポグラフィ仕様を取得してコード実装"
```

### 💬 MCP使用の明示的宣言（複雑タスク時は推奨）

```bash
# 複雑タスクでは使用ツールを宣言すると効果的
"🎯 このタスクで使用するMCP:"
"1. Serenaでシンボル検索と依存関係分析"
"2. Sequential-thinkingで実装戦略を構造化"
"3. Morphllm-fast-applyで効率的な一括編集"

# 実例
"認証機能の実装:"
"→ Context7でNext-Auth公式パターン確認"
"→ Serenaで既存認証コード検索"
"→ Sequential-thinkingで設計分析"
"→ Morphllm-fast-applyで実装"
"→ Supabaseで認証DB設定"
```

### 🚀 SuperClaudeの価値を最大化する使い方

1. **ネイティブツールは一次選択、MCPは拡張能力**: Read/Edit/Grep/Glob は日常的に最初の選択肢
2. **並列実行を活用**: 独立した操作は並列実行で時間短縮
3. **記憶を活用**: Serena のメモリ機能でセッション間の知識を蓄積
4. **公式パターン厳守が必要な場面**: Context7 でハルシネーション防止
5. **構造化思考が有益な場面**: Sequential-thinking を適用（Opus 4.7 のネイティブ推論で十分な場面も多い）

# ═══════════════════════════════════════════════════

# 🛡️ 中間保護層パターン（エラーループ対策）

# ═══════════════════════════════════════════════════

## 🔥 なぜ中間保護層パターンが必要か

### 問題：エラー修正の無限ループ

```
フィーチャーA実装 → エラー修正 → フィーチャーBが壊れる
→ フィーチャーB修正 → フィーチャーAが壊れる → 無限ループ
```

### 解決：中間保護層による物理的隔離

```
┌──────────────────────────────────────┐
│  App Layer (page.tsx)                │
│  ┌──────────────────────────────┐   │
│  │  🛡️ ErrorBoundary            │   │ ← エラーをここで止める
│  │  ┌──────────────────────┐    │   │
│  │  │  PageContent（中間層）│    │   │ ← フィーチャー間の緩衝材
│  │  └──────────────────────┘    │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
         ↑ 公開APIのみアクセス
┌──────────────────────────────────────┐
│  Feature Layer                       │
│  • 内部実装（外部から見えない）      │
│  • 公開API（純粋関数のみ）          │
└──────────────────────────────────────┘
```

## 📝 実装パターン（自動生成済み）

### 1. ページ構造（src/app/[feature]/page.tsx）

```typescript
// ✅ 正しい実装（pnpm create:featureで自動生成）
export default function FeaturePage() {
  return (
    <FeatureErrorBoundary featureName="feature-name">
      <FeaturePageContent />  // 中間保護層
    </FeatureErrorBoundary>
  )
}

async function FeaturePageContent() {
  // フィーチャーAPIのみ使用（フック・コンポーネント禁止）
  const data = await getFeatureData()

  // 独自UI実装（フィーチャーコンポーネント使用禁止）
  return <div>{/* 独自実装 */}</div>
}
```

### 2. ErrorBoundaryコンポーネント（作成済み）

- 場所: `src/components/ErrorBoundary.tsx`
- 役割: エラーを捕捉し、他フィーチャーへの伝播を防ぐ
- 効果: 1つのフィーチャーのエラーが全体を壊さない

## 🎯 効果（測定済み）

| 問題         | 従来                 | 中間保護層パターン     | 改善率 |
| ------------ | -------------------- | ---------------------- | ------ |
| エラー伝播   | 全フィーチャーに影響 | 単一フィーチャーに限定 | 100%   |
| 修正の連鎖   | 5-10回のループ       | 1回で完了              | 80-90% |
| デバッグ時間 | 30-60分              | 5-10分                 | 80%    |
| 境界違反     | 頻発                 | 物理的に不可能         | 100%   |

## 🚨 Claude Code実装時の必須指示

```markdown
「新フィーチャー実装：必ず中間保護層パターン（ErrorBoundary→PageContent→API呼び出し）を使用し、作業は現在のフィーチャーディレクトリ内のみ、他フィーチャーのエラーや警告は一切無視、境界違反チェックは現フィーチャーのみ実行、完了後に単独コミットしてから次へ進むこと」
```

## 🔥 React Hooks無限ループ防止（必須対策）

### 実際に発生した無限ループパターン

| 原因                           | 症状                          | 解決策                           |
| ------------------------------ | ----------------------------- | -------------------------------- |
| **オブジェクト参照の不安定性** | API数百回/秒呼び出し          | useMemoで安定化                  |
| **依存配列でのプロパティ参照** | `[config.category]`で検知失敗 | オブジェクト全体`[config]`を使用 |
| **useCallback不適切使用**      | 関数が再作成され続ける        | useCallback削除、直接定義        |
| **エラー時の状態更新ループ**   | 空配列→エラー→再レンダリング  | 空配列は正常として扱う           |

### 🚨 Claude Code必須チェックリスト

```typescript
// ❌ 絶対にやってはいけない（Mac高熱の原因）
const Component = () => {
  const config = { limit: 10 } // 毎回新しいオブジェクト
  useEffect(() => {
    fetch(config)
  }, [config]) // 無限ループ！
}

// ✅ 正しい実装
const Component = () => {
  const config = useMemo(() => ({ limit: 10 }), []) // 安定した参照
  useEffect(() => {
    fetch(config)
  }, [config]) // 安全
}
```

### 無限ループ防止の実装済み対策

1. **フックテンプレート改善済み**
   - useMemoでオプション安定化
   - useRefで前回値記憶
   - クリーンアップ処理追加

2. **ESLintルール追加済み**
   - useEffect内setState警告
   - exhaustive-deps必須化

3. **ドキュメント完備**
   - `/docs/INFINITE_LOOP_PREVENTION.md`参照

## 🔒 Git Hooks（自動エラーループ防止）

### 実装済みの保護機能

1. **複数フィーチャーの同時コミット防止**
   - 1コミット = 1フィーチャーを物理的に強制
   - エラー時は分かりやすい日本語で対処法を表示

2. **コミットメッセージの標準化**
   - feat/fix/chore等の形式を強制
   - フィーチャー名を自動検出して推奨

3. **境界違反の自動検出**
   - コミット前に境界チェック実行
   - 違反があればコミットをブロック

### エラー時の対処法

```bash
# エラー: 複数フィーチャーの同時変更を検出

# 対処法1: フィーチャーごとに分けてコミット
git add src/features/user/
git commit -m "fix(user): 認証エラー修正"

git add src/features/product/
git commit -m "feat(product): 商品一覧追加"

# 対処法2: 支援ツールを使用
pnpm commit:feature  # 対話的にフィーチャーを選択

# 対処法3: Claude Codeに指示
「userフィーチャーだけコミットして」
```

### 利用可能なコマンド

| コマンド                 | 説明                             |
| ------------------------ | -------------------------------- |
| `pnpm commit:feature`    | フィーチャー別コミット支援ツール |
| `pnpm git:check`         | 変更されたフィーチャーを確認     |
| `git commit --no-verify` | 緊急時のフック回避（非推奨）     |

# ═══════════════════════════════════════════════════

# 🔴 CRITICAL: Feature-Based Development Rules (維持)

# ═══════════════════════════════════════════════════

## 🤖 重要：このテンプレートは100% Claude Code実装用

**人間はコードを書きません。全ての実装はClaude Codeが行います。**
このドキュメントはClaude Codeの実装ルールです。曖昧さを排除し、自動判断可能な内容のみ記載しています。

## 🚨 なぜフックを公開してはいけないのか（30秒理解）

| 問題                | 具体的なエラー            | 影響                     |
| ------------------- | ------------------------- | ------------------------ |
| **Reactルール違反** | 関数・ループ内で使用不可  | アプリがクラッシュ       |
| **SSR破壊**         | サーバーサイドで動作不可  | Hydrationエラー          |
| **テスト困難**      | React Testing Library必須 | 単体テスト不可           |
| **強結合**          | Reactに依存               | 他フレームワーク使用不可 |

**→ だから純粋な関数として公開する**

## 🔴 絶対原則（これを破ると実装失敗）

### 7つの鉄則

| ルール               | 内容                                      | 違反時の結果                         |
| -------------------- | ----------------------------------------- | ------------------------------------ |
| **フック**           | フックは絶対にindex.tsから公開しない      | React Rules of Hooks違反でクラッシュ |
| **UIコンポーネント** | 各フィーチャーが独自実装（共有禁止）      | 密結合・責任曖昧化・スタイル競合     |
| **データ取得**       | 純粋な関数として公開（フック禁止）        | どこでも使用可能に                   |
| **import形式**       | `@/features/[name]`のみ                   | ビルドエラー・境界違反               |
| **状態管理**         | 各フィーチャーが独自管理                  | グローバル状態の混乱                 |
| **相対パス**         | `../`での他フィーチャー参照禁止           | 循環参照・ビルドエラー               |
| **内部アクセス**     | `/components`, `/hooks`等への直接参照禁止 | カプセル化の破壊                     |

### 🔴 計算済みデータ参照原則（新規追加）

**重要: 各フィーチャーは自身のドメインの計算に責任を持ち、他のフィーチャーは計算済みデータを参照する**

| 原則                     | 内容                                               | 実装例                               |
| ------------------------ | -------------------------------------------------- | ------------------------------------ |
| **計算責任の一元化**     | 各フィーチャーが自身のドメインの計算に責任を持つ   | 売上管理が売上計算を担当             |
| **計算済みデータの参照** | 他フィーチャーは計算済みの結果を参照（再計算禁止） | 会計は売上管理から計算済み売上を取得 |
| **単一の真実の源**       | 同じ計算ロジックを複数箇所に実装しない             | 売上計算は売上管理のみ               |

```typescript
// ✅ 正しい実装：計算済みデータを参照
// 会計フィーチャー
import { getSalesData } from '@/features/sales'
const periodSales = await getSalesData(startDate, endDate)
const total = periodSales.reduce((sum, d) => sum + d.calculatedAmount, 0)

// ❌ 間違った実装：他フィーチャーで再計算
// 会計フィーチャー
import { getUnitPrice } from '@/features/unit-price'
import { getQuantity } from '@/features/sales'
const sales = unitPrice * quantity // 再計算してはいけない！
```

**なぜ重要か**: 保守性向上、データ整合性確保、テスト容易性、パフォーマンス最適化

### 正しいindex.tsテンプレート

```typescript
// src/features/[feature-name]/index.ts

// ✅ API関数（公開推奨）
export { getFeatureData, createItem, updateItem, deleteItem } from './api/featureApi'

// ✅ ドメイン型のみ（公開可）
export type { FeatureItem, FeatureConfig } from './types'

// ❌ フック（絶対公開禁止） - これが最重要！
// ❌ UIコンポーネント（原則非公開）
// ❌ 内部実装（utils, store等）
```

## 📁 フィーチャー構造

```
src/features/[機能名]/
├── api/          # API関数（公開推奨）
├── components/   # UIコンポーネント（内部のみ）
├── hooks/        # カスタムフック（内部のみ）
├── types/        # 型定義（ドメイン型のみ公開）
├── utils/        # ヘルパー（内部のみ）
├── store/        # 状態管理（内部のみ）
└── index.ts      # 公開API（最小限）
```

## 🔍 境界違反の自動検出

```bash
# package.jsonに追加済みのコマンド
pnpm check:boundaries

# または手動実行
grep -r "from '\.\./'" src/features/ || echo "✅ 境界違反なし"
grep -r "from '@/features/[^']*/\(components\|hooks\|utils\|api\|types\)" src/features/ || echo "✅ 直接参照なし"
```

## 🤖 SuperClaude統合

### 🟡 MCPサーバー適用ガイド

**以下の状況では MCP サーバーの適用が効果的です（ティア別の参考表）**

| 状況             | 推奨MCPサーバー                         | 具体的な使用例                                |
| ---------------- | --------------------------------------- | --------------------------------------------- |
| **コード探索**   | Serena → `mcp__serena__find_symbol`     | シンボル検索、依存関係分析（必須ティア）      |
| **DB操作**       | Supabase → `mcp__supabase`              | テーブル作成、マイグレーション（必須ティア）  |
| **ドキュメント** | Context7 → `mcp__context7`              | ライブラリAPI厳守が必要な場面                 |
| **大量ファイル** | Morphllm → `mcp__morphllm-fast-apply`   | 10ファイル超の一括パターン編集時のみ          |
| **複雑な分析**   | Sequential → `mcp__sequential-thinking` | Opus 4.7 ネイティブ推論で不足する多段階設計時 |

### 自動フラグトリガー

| 状況               | フラグ                                         | 効果                                               |
| ------------------ | ---------------------------------------------- | -------------------------------------------------- |
| 新フィーチャー作成 | `--task-manage --validate --delegate --serena` | タスク管理＋境界検証＋並列実行＋セマンティック検索 |
| 複雑な依存関係     | `--sequential --think-hard`                    | Sequential MCPで深い分析＋循環参照検出             |
| UI開発             | `--frontend-architect --validate`              | frontend-architectエージェント＋境界チェック       |
| リファクタリング   | `--morph --validate --safe-mode`               | Morphllm MCPでパターン適用＋安全実行               |
| バグ修正           | `--think --sequential --validate`              | Sequential MCPで原因分析＋影響範囲確認             |
| テスト作成         | `--delegate`                                   | Vitest単体テスト＋並列実行                         |

### MCPサーバー活用（実際に利用可能なMCP）

| サーバー                | 主要用途                             | 自動トリガーキーワード                           | 状態        |
| ----------------------- | ------------------------------------ | ------------------------------------------------ | ----------- |
| **Serena**              | セマンティック検索・プロジェクト記憶 | find, search, symbol, class, function, メモリ    | ✅ 利用可能 |
| **Morphllm-fast-apply** | 高速ファイル操作・一括編集           | edit, modify, create, write, ディレクトリ        | ✅ 利用可能 |
| **Sequential-thinking** | 構造化分析・問題解決                 | why, debug, analyze, design, 原因, なぜ          | ✅ 利用可能 |
| **Context7**            | 公式ドキュメント参照                 | React, Next.js, Vue, library, 公式, docs         | ✅ 利用可能 |
| **Supabase**            | DB管理・認証・Edge Functions         | database, table, migration, auth, Supabase       | ✅ 利用可能 |
| **Stitch**              | UIデザイン・プロトタイピング         | UIデザイン, プロトタイプ, スクリーン, バリアント | ✅ 利用可能 |
| **IDE**                 | VS Code連携・診断情報                | diagnostic, execute, VS Code                     | ✅ 利用可能 |

**注**: Magic MCPは設定済みですが、Claude Codeのツールとして利用不可（2025-09-02時点）。UI開発にはStitch MCPまたはfrontend-architectエージェントを使用してください。

### TodoWrite自動化（2ステップ以上で必須）

- **2ステップ以上** → 必ずTodoWrite使用（例外なし）
- **タスク開始時** → 最初に必ずタスク分解を実行
- **進捗更新** → 各ステップ完了時に即座にstatus更新
- **並列タスク明記** → どのタスクが並列実行可能か明示
- **フィーチャー作成** → タスク自動生成
- **境界違反チェック** → 各タスクで自動実行

## 📋 実装フロー（/sc:コマンド完全自動化）

### 🔴 必須実行タイミング（例外なし）

```typescript
// Claude Codeが自動判断して実行
const EXECUTION_FLOW = {
  '1. セッション開始時': '必ず pnpm sc:start',
  '2. タスク分析時': 'タスク種別判断 → 適切な/sc:コマンド',
  '3. 実装前': 'pnpm sc:boundaries で現状確認',
  '4. 実装中': 'pnpm sc:analyze で依存関係チェック',
  '5. 実装後': 'pnpm sc:validate で包括的検証',
  '6. エラー時': 'pnpm sc:analyze → sc:refactor',
}
```

### 1. セッション開始（必須自動実行）

```bash
pnpm sc:start            # git status + 境界チェック
mcp__serena__activate_project  # プロジェクト記憶読み込み
TodoWrite([...])         # タスク分解（2ステップ以上）
```

### 2. タスク種別による自動コマンド選択

```bash
# 新機能開発 → 自動実行
pnpm sc:feature [name]   # フィーチャー作成ウィザード
pnpm sc:boundaries       # 境界チェック

# バグ修正 → 自動実行
pnpm sc:analyze          # 原因分析
pnpm sc:refactor         # 修正実行

# リリース前 → 自動実行
pnpm sc:validate         # 全検証
pnpm sc:business-panel   # ビジネス影響分析
```

### 3. 実装中の自動実行

```bash
# 並列実行（自動最適化）
--delegate auto --concurrency 15
--morph --validate       # パターン適用+検証

# 30分ごと（自動）
pnpm sc:boundaries       # 定期境界チェック
mcp__serena__write_memory  # チェックポイント保存
```

### 4. 完了時の自動実行

```bash
pnpm sc:validate         # 包括的検証
pnpm sc:test            # テスト実行
pnpm sc:business-panel  # 価値確認
```

## ⚠️ よくある違反（SuperClaudeが自動修正）

### 最頻出パターンと修正

```typescript
// ❌ 違反例1: フック公開（最も危険）
export { useUser } from './hooks/useUser' // 致命的エラー！

// ✅ 修正後: API関数公開
export { getUserData } from './api/userApi' // 正しい

// 使用側の実装
import { getUserData } from '@/features/user' // API関数を使用
const useMyFeature = () => {
  const [user, setUser] = useState(null)
  useEffect(() => {
    getUserData(id).then(setUser) // 自フィーチャー内でフック化
  }, [id])
  return user
}

// ❌ 違反例2: 相対パスで他フィーチャー参照
import { UserProfile } from '../user/components/UserProfile'

// ✅ 修正後: 独自UI実装
// 各フィーチャーが独自のUIコンポーネントを持つ
const MyUserCard = ({ userId }) => {
  /* 独自実装 */
}
```

**SuperClaude自動修正**: `--morph --validate`で即座に修正

## 🤖 Claude Code実装の自動フロー

### 実装開始時（必須実行）

```bash
git status                    # 現在の状態確認
pnpm check:boundaries        # 既存構造の把握
```

### フィーチャー作成時（必須使用）

```bash
pnpm create:feature [name]   # 自動生成を使用（手動作成禁止）
```

### 実装完了時（必須実行）

```bash
pnpm check:boundaries        # 境界違反チェック
pnpm fix:boundaries          # 違反の自動修正
pnpm typecheck              # 型チェック
pnpm test                   # テスト実行
pnpm build                  # ビルド確認
```

### エラー時の自動対応表

| エラー種別   | 実行コマンド          | 次のアクション   |
| ------------ | --------------------- | ---------------- |
| 境界違反     | `pnpm fix:boundaries` | 自動修正される   |
| 型エラー     | `pnpm typecheck`      | エラー箇所を修正 |
| テスト失敗   | `pnpm test:unit`      | 失敗テストを修正 |
| ビルドエラー | `pnpm build`          | エラーログを解析 |

## 🎯 実装完了の定義

以下が全て成功したら実装完了：

```bash
pnpm validate:all   # 全チェックが通る
```

### Claude Codeの禁止事項（絶対）

1. **フィーチャー間の共有** → 禁止（重複を許容）
2. **フック公開** → 禁止（内部実装）
3. **手動ディレクトリ作成** → 禁止（create:feature使用）
4. **判断の保留** → 禁止（ルールに従う）
5. **any型の使用** → 禁止（適切な型定義）

## 🐛 バグ修正プロトコル（必須）

### バグ報告・エラー修正時の絶対ルール

**バグ修正 = 回帰テストファースト（例外なし）**

#### 1. テストファースト原則

```bash
# 必ず最初に実行
tests/regression/YYYY-MM-DD-NNN-description.test.ts を作成

# 例: 2025-01-15-001-login-infinite-loop.test.ts
```

#### 2. テストテンプレート

```typescript
/**
 * Bug ID: YYYY-MM-DD-NNN
 * Date: YYYY-MM-DD
 * Issue: [具体的な問題の説明]
 * Feature: [関連フィーチャー]
 * Fixed by: [修正コミット]
 */
describe('Regression: [ID] - [説明]', () => {
  it('should [期待動作]', () => {
    // バグ再現テスト
  })
})
```

#### 3. 実行フロー

1. **テスト作成** → tests/regression/に配置
2. **失敗確認** → `pnpm test:regression`で失敗を確認
3. **修正実装** → バグの根本原因を修正
4. **成功確認** → テストが通ることを確認
5. **永続化** → このテストは削除禁止

#### 4. トリガー判定

以下の場合は必ず回帰テストを作成：

- 「バグ」「修正」「fix」「エラー」「動作しない」等のキーワード
- エラーメッセージ・スタックトレースの提供
- 既存機能の不具合報告

**選択制ではない。バグ修正 = 回帰テスト必須。**

## 🔵 Git/GitHub設定

### PR運用モード（個人開発 ⇄ チーム開発の切替）

このテンプレートは **PR運用OFF（個人開発前提）** がデフォルトです。チーム開発に移行する際にコマンド1つでON/OFFを切り替えられます。

<!-- PR_MODE_FLAG_START -->

**PR運用モード**: OFF

<!-- PR_MODE_FLAG_END -->

| モード               | 挙動                                                                    | Claude Code の振る舞い                                 |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| **OFF**（個人開発）  | main直push可。ブランチ保護なし。`claude-code-review.yml` 不在           | feature branch 強制せず、`git push origin main` で完結 |
| **ON**（チーム開発） | main直push禁止（PR必須）。`claude-code-review.yml` でClaude自動レビュー | feature branch + `gh pr create` を毎回実行             |

**切替コマンド:**

```bash
pnpm sc:enable-pr   # OFF → ON: ブランチ保護適用 + claude-code-review.yml 復活 + フラグON
pnpm sc:disable-pr  # ON → OFF: ブランチ保護解除 + workflow削除 + フラグOFF
```

**Claude Code の動作判定:** 上記フラグ（`PR運用モード: ON/OFF`）を読み取り、ONなら feature branch + PR、OFFなら main直push で進めます。プロンプト指示で一時的に切り替えることも可能ですが、永続化したい場合は必ず上記コマンドを実行してください。

詳細は [SPECIFICATION.md セクション24](./SPECIFICATION.md) を参照。

```bash
# SuperClaude自動追跡
--task-manage  # 進捗を自動管理
```

## 💡 SuperClaude活用のコツ

### 重要な理解

1. **フックは内部実装** - 他フィーチャーから使用不可
2. **データ取得は関数** - どこからでも呼び出し可能
3. **UIは独立** - 重複を許容して独立性を維持
4. **SuperClaudeが監視** - 違反は自動検出・修正

### よく使うコマンド組み合わせ

```bash
# 新機能開発の黄金パターン
--task-manage --validate --delegate auto --concurrency 15

# デバッグの黄金パターン
--think-hard --sequential --validate

# リファクタリングの黄金パターン
--morph --validate --safe-mode
```

# ═══════════════════════════════════════════════════

# 🛠️ Skills & Sub-agents（明示呼出し型拡張）

# ═══════════════════════════════════════════════════

## スキル（/.claude/skills/）

明示的に呼び出した時のみ動作する再利用可能なワークフロー。CLAUDE.mdのルールは常時有効のまま。

| スキル       | 呼出し方法              | 用途                                                                                    |
| ------------ | ----------------------- | --------------------------------------------------------------------------------------- |
| **fix-bug**  | `/fix-bug [エラー内容]` | ultrathink + 原因特定→影響範囲→回帰テスト→修正→検証ループ→最終報告の9ステップを自動展開 |
| **security** | `/security [対象領域]`  | ultrathink + セキュリティ診断→提案→実装→検証の6ステップ。引数なしで全スキャン           |

## サブエージェント（/.claude/agents/）

**別コンテキスト**で実行される専門レビューエージェント。メインの作業コンテキストを汚さない。

| エージェント          | 呼出し方法                             | 用途                             |
| --------------------- | -------------------------------------- | -------------------------------- |
| **boundary-reviewer** | 「サブエージェントで境界チェックして」 | フィーチャー境界違反の意味的分析 |

**既存機能との関係**: 補完であり置き換えではない。CLAUDE.mdルール・`pnpm check:boundaries`・9層防御・Git Hooksは従来通り動作する。

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション22を参照。

# ═══════════════════════════════════════════════════

# 📐 ドキュメント整合性チェック（AIファースト時代の型システム）

# ═══════════════════════════════════════════════════

ドキュメントと実装の乖離は AI の信頼性を破壊するため、`tests/consistency/` 配下の **39テスト**で自動検証する。pre-commit と CI で自動実行される。

## 整合性が保証される対象

| カテゴリ               | テストファイル               | 検証内容                                                             |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------- |
| **コードテンプレート** | `setup-templates.test.ts`    | `setup.js` 内の `ci.yml` / `security.yml` テンプレート vs 実ファイル |
| **コマンド参照**       | `command-references.test.ts` | ドキュメント内の pnpm コマンド参照が `package.json` scripts に実在   |
| **ファイルパス参照**   | `file-references.test.ts`    | ドキュメント内のパス参照が実在                                       |
| **バージョン番号**     | `version-numbers.test.ts`    | `package.json` engines.node がワークフローと整合                     |
| **層の数**             | `layer-count.test.ts`        | 「N層防御」が CLAUDE.md と SPECIFICATION.md で一致                   |
| **保護ファイルリスト** | `protected-files.test.ts`    | `protect-config.js` と CLAUDE.md の保護表が一致                      |
| **MCPサーバーリスト**  | `mcp-list.test.ts`           | 必須MCP4種が全ドキュメント・スクリプトに記載                         |

## Claude Code への絶対指示

1. **ドキュメントと実装は常にセットで更新する** — 片方だけ更新すると整合性テストでブロックされる
2. **整合性テストの失敗は無視しない** — 失敗メッセージに修正方法が明記されているので従う
3. **テスト対象を増やしたら検証も増やす** — 新しい構造的整合性が必要なら `tests/consistency/` に追加する
4. **「とりあえず通す」ための回避コードを書かない** — 本物の不整合を直す方が常に正しい

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション23を参照。

---

**このドキュメントはSuperClaudeフレームワークに最適化されています。**
**詳細なプロジェクト固有設定は PROJECT_INFO.md を参照してください。**
