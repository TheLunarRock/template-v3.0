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

| 変数                       | 効果                                             |
| -------------------------- | ------------------------------------------------ |
| `CLAUDE_NOTIFY_DISABLED=1` | 通知を完全に無効化する                           |
| `CLAUDE_NOTIFY_DRY_RUN=1`  | 副作用を起こさず判定結果のみ出力する（テスト用） |

CI 環境（`CI` 変数あり）では通知しない。

## トラブルシューティング

| 問題                   | 原因                                                        | 解決策                                                               |
| ---------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| 通知が2回来る          | `~/.claude/settings.json` に旧グローバル hooks が残っている | グローバル側スクリプトに譲渡ガードを入れる（SPECIFICATION.md §11.8） |
| 通知が来ない           | ターミナル／エディタに通知権限がない                        | システム設定 → 通知 で該当アプリを許可                               |
| 音は鳴るが通知が出ない | 同上（音は `afplay` で別経路のため鳴る）                    | 同上                                                                 |
| macOS 以外で動かない   | 通知センター・`afplay`・`pbcopy` は macOS 前提              | Slack 連携のみ利用（macOS 依存部分は自動でスキップされる）           |

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
