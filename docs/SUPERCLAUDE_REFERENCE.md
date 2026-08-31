# SuperClaude リファレンス（常時読み込み対象外）

CLAUDE.md から分離した「必要になった時に読む」資料。バージョン情報・エージェント/コマンド/モードのカタログ・
MCP 初回セットアップ手順・通知の詳細・CI 構成・過去の設計経緯・既知の問題を収録する。

**行動ルールはここには置かない。** Claude Code が常に守るべきルールは [CLAUDE.md](../CLAUDE.md) 側に残してある。
このファイルは CLAUDE.md の `@` 参照に含めていないため、セッション開始時には読み込まれない。必要になったときに読むこと。

| 収録内容                                                                         | 元の場所                                                   |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 通知システムの詳細（発火タイミング / Slack / 環境変数 / トラブルシューティング） | CLAUDE.md「🔔 Claude Code通知システム」                    |
| CI/CD パイプライン構成・E2E 削除の設計判断                                       | CLAUDE.md「🔄 CI/CDパイプライン」                          |
| Chrome 146 + GitHub Desktop 問題                                                 | CLAUDE.md「⚠️ 既知の問題」                                 |
| バージョン情報・主要エージェント・`pnpm sc:*` カタログ・行動モード               | CLAUDE.md「🚀 SuperClaude v4 Production Edition の新機能」 |
| MCP サーバー活用方針・初回セットアップ（`claude mcp add`）                       | CLAUDE.md「⚡ MCP活用ルール」                              |
| MCP 併用パターン・宣言例・活用のコツ                                             | CLAUDE.md「⚡ MCP活用ルール」                              |
| settings.local.json の allow/ask 設計                                            | CLAUDE.md「🔐 セキュリティ多層防御」                       |
| SuperClaude 統合（MCP適用ガイド・フラグトリガー）・`sc:` 実装フロー              | CLAUDE.md「🔴 Feature-Based Development Rules」            |

# ═══════════════════════════════════════════════════

# 🔔 Claude Code通知システム（詳細）

# ═══════════════════════════════════════════════════

## 発火タイミングと通知内容

| イベント                             | 通知内容                                           | 音    |
| ------------------------------------ | -------------------------------------------------- | ----- |
| **Stop**                             | 作業が終わりました。報告はクリップボードにあります | Glass |
| **Notification** `permission_prompt` | 確認待ちで止まっています（ツール使用の承認）       | Ping  |
| **Notification** `idle_prompt`       | 応答がないまま止まっています                       | Ping  |
| **Notification** `elicitation_*`     | 入力／URL の入力を求めて止まっています             | Ping  |
| **Notification** `agent_needs_input` | サブエージェントが入力を待っています               | Ping  |

**クリップボード連携:** `Stop` フックのペイロードに含まれる `last_assistant_message`（その turn の最終回答）を `pbcopy` でクリップボードへ入れる。通知に気付いた時点で報告本文がそのまま貼り付けられる。

**「長時間止まっている」の検知範囲:** Claude Code に「同じ作業でループしている」ことを直接知らせるイベントは存在しない。60秒無応答で発火する `idle_prompt` と、承認待ちの `permission_prompt` がその代替になる。

## Slack 連携（任意）

Webhook URL は git 管理下に置かず、以下の順で解決する。

1. 環境変数 `CLAUDE_NOTIFY_WEBHOOK`
2. `~/.claude/notify-webhook.txt`（`pnpm setup:sc` が `chmod 600` で作成）

どちらも無ければ Slack 送信はスキップし、macOS 通知のみ行う。

## 制御用の環境変数

| 変数                        | 効果                                             |
| --------------------------- | ------------------------------------------------ |
| `CLAUDE_NOTIFY_DISABLED=1`  | 通知を完全に無効化する                           |
| `CLAUDE_NOTIFY_DRY_RUN=1`   | 副作用を起こさず判定結果のみ出力する（テスト用） |
| `CLAUDE_NOTIFY_INTERVAL=15` | 繰り返しの間隔（秒）※フォールバック経路のみ有効  |
| `CLAUDE_NOTIFY_MAX=10`      | 繰り返しの上限回数（上限到達で自然終了）※同上    |
| `CLAUDE_NOTIFY_ALERTER`     | `alerter` の配置を上書きする（`none` で無効化）  |

`CLAUDE_NOTIFY_INTERVAL` / `CLAUDE_NOTIFY_MAX` は **`alerter` が無い環境のフォールバック経路でのみ有効**。`alerter` 経路では通知を1回出して消されるまで待つため、間隔も上限回数も使われない。`CLAUDE_NOTIFY_ALERTER=none` を指定すると `alerter` が入っていてもフォールバック経路を通せる（回帰テストがこれを利用している）。

CI 環境（`CI` 変数あり）では通知しない。

## トラブルシューティング

| 問題                                  | 原因                                                         | 解決策                                                                                                |
| ------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 通知が2回来る                         | `~/.claude/settings.json` に旧グローバル hooks が残っている  | グローバル側スクリプトに譲渡ガードを入れる（SPECIFICATION.md §11.8）                                  |
| 通知が来ない                          | ターミナル／エディタに通知権限がない                         | システム設定 → 通知 で該当アプリを許可                                                                |
| 音は鳴るが通知が出ない                | 同上（音は `afplay` で別経路のため鳴る）                     | 同上                                                                                                  |
| macOS 以外で動かない                  | 通知センター・`afplay`・`pbcopy` は macOS 前提               | Slack 連携のみ利用（macOS 依存部分は自動でスキップされる）                                            |
| 通知が鳴り止まない                    | 停止フックが未登録、または別プロジェクトの通知が残っている   | `bash .claude/hooks/notify-repeat.sh stop-all` で全停止。`ls ~/.claude/notify-repeat/` で稼働中を確認 |
| エディタを閉じた後も鳴る              | セッションの生存監視が効いていない                           | `stop-all` で停止。SPECIFICATION.md §11.10.6 を確認                                                   |
| 通知がすぐ消える                      | `alerter` が未導入でフォールバック経路になっている           | `brew install vjeantet/tap/alerter`。導入後は消すまで残る                                             |
| alerter を入れても出ない              | ターミナルの通知が未許可、または通知スタイルがバナー         | システム設定 → 通知 → ターミナル で「通知を許可」ON・「通知スタイル」を「持続的」に                   |
| 通知は出るが本文が「1件の通知」になる | システム設定 → 通知 →「プレビューを表示」が「表示しない」    | 「常に」または「ロックされていないときのみ表示」に変更する（全アプリ共通の設定）                      |
| 通知一覧に alerter が無い             | `alerter` は `com.apple.Terminal` になりすまして通知を出す   | 設定するのは「ターミナル」の側。`alerter` という項目は現れないのが正常                                |
| バツ印で消しても止まらない            | `alerter` が未導入（繰り返し方式はディスミスを検知できない） | `alerter` を導入する。暫定は `stop-all` で全停止                                                      |

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション11を参照。

# ═══════════════════════════════════════════════════

# 🔄 CI/CDパイプライン（詳細）

# ═══════════════════════════════════════════════════

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

- **`pnpm sc:*`** — 本テンプレート同梱の **18種**のnpmスクリプト（`package.json` の `scripts` に実装）。クローンした全環境で動作。
- **`/sc:*`** — SuperClaude フレームワーク本家の Claude Code スラッシュコマンド（`~/.claude/commands/sc/`）。ユーザーグローバルインストールが必要で、本テンプレート同梱ではない。

**本プロジェクトで使うのは原則 `pnpm sc:*`**。18種の完全カタログは [SPECIFICATION.md セクション7.5](./SPECIFICATION.md) を参照。

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

**残り11コマンド**: `sc:plan` / `sc:brainstorm` / `sc:parallel` / `sc:mcp` / `sc:implement` / `sc:optimize` / `sc:review` / `sc:debug` / `sc:business-panel` / `sc:enable-pr` / `sc:disable-pr` — 詳細は [SPECIFICATION.md セクション7.5](./SPECIFICATION.md) 参照。

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

# ⚡ MCP活用ルール（方針と初回セットアップ）

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

# 🤖 全自動開発設定・SuperClaude統合・実装フロー

# ═══════════════════════════════════════════════════

## 全自動開発設定（settings.local.json）

`pnpm setup:sc`で自動生成される許可設定により、開発中の確認プロンプトはほぼゼロ。

| 区分      | 対象                                       | 備考                                                                                                                                                                                   |
| --------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **allow** | `Edit`, `Write`, `Bash`, 全MCP, `Skill` 等 | 開発操作は全て自動実行                                                                                                                                                                 |
| **ask**   | Supabase MCP の DB破壊系5種                | execute_sql / apply_migration / delete_branch / reset_branch / merge_branch — 実行前に承認プロンプト＋警告Hook表示                                                                     |
| **ask**   | git の事故防止系                           | `git commit/push --no-verify`・feature branch のリモート push・素の `git push --force origin *` — 実行前に承認プロンプト＋警告Hook表示（feature push は過去の課金実害 silver-hp 対策） |
| **deny**  | なし（settings.json側で保護）              | 上記のdenyルールが最優先で適用                                                                                                                                                         |

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
