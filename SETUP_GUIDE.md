# 🚀 SuperClaude v4 Production Edition - セットアップガイド

このガイドでは、SuperClaude v4 Production Editionテンプレートを使用して、エンタープライズグレードのNext.jsアプリケーションを開始する方法を説明します。

## 📋 初回PCチェックリスト（新規PC・友人向け）

> **既存PC（既にこのテンプレートを使ったことがある）の方は、このセクションをスキップしてOK。**
> `pnpm setup:sc` 実行時に Pre-check が自動的に不足を検出して案内します。

新しいPCで初めてこのテンプレートを使う場合、`pnpm setup:sc` を実行する前に以下のツールが必要です。

### 🔴 必須（これがないと `pnpm setup:sc` 自体が動かない）

```bash
# macOS の場合（Homebrew前提）
brew install node pnpm
```

| ツール      | バージョン  | 用途                                      |
| ----------- | ----------- | ----------------------------------------- |
| **Node.js** | `>=20.19.0` | Next.js / pnpm scriptsの実行環境          |
| **pnpm**    | `>=9.0.0`   | 依存パッケージ管理 + setup スクリプト実行 |

### 🟡 強く推奨（フル機能のため）

```bash
# macOS の場合
brew install gh gitleaks
gh auth login

# Python パッケージマネージャー（Serena MCP用）
curl -LsSf https://astral.sh/uv/install.sh | sh

# Claude Code CLI
npm install -g @anthropic-ai/claude-code
```

| ツール       | 用途                                                                          |
| ------------ | ----------------------------------------------------------------------------- |
| **gh**       | 第5-6層セキュリティ自動化（Secret Scanning / Push Protection / ブランチ保護） |
| **gitleaks** | 第2層 pre-commit シークレット検出 + 第9層 二重防御                            |
| **uv**       | Serena MCP（セマンティック検索・プロジェクト記憶）                            |
| **claude**   | SuperClaude統合・MCPサーバー登録                                              |

### 🟢 MCPサーバー登録（claude CLI インストール後・初回のみ）

```bash
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
claude mcp add morphllm-fast-apply -- npx @morph-llm/morph-fast-apply /home/

# 確認
claude mcp list
```

> **これらが不足していても `pnpm setup:sc` の Pre-check が自動的に検出し、コピペできるコマンドを表示します。** 完全自動化していない理由は、グローバルツールのインストールは権限・環境差異の問題があり、ユーザーの判断に委ねるべきだからです。

## 🎯 クイックスタート（3ステップ）

### ステップ1: テンプレートをクローン

**推奨: GitHub Desktop から直接クローン**

GitHub Desktop を開き、`File → Clone Repository → URL` でリポジトリURLを貼り付けてクローン。

> **既知の問題（2026-03-15）**: Chrome 146以降では GitHub Web UI の「Open with GitHub Desktop」ボタンが動作しません。GitHub Desktop から直接クローンしてください。

```bash
# CLI からクローンする場合
git clone https://github.com/[your-username]/template-v3.0 my-awesome-app
cd my-awesome-app
```

### ステップ2: セットアップ（依存関係インストール＋環境構築）

Cursor 等のエディタでプロジェクトを開き、内蔵ターミナルで実行:

```bash
pnpm setup:sc
```

このコマンドで以下が自動実行されます:

- **Pre-check**: 前提ツール（Node.js/pnpm/gh/gitleaks/uv/claude/MCP）の確認
- **Step 0**: `pnpm install`（node_modules不在時のみ）
- **Step 1**: `.claude/settings.local.json` + `.env.local` 生成
- **Step 2-3**: テスト環境構築（Vitest）
- **Step 4**: GitHub Actions ワークフロー（`ci.yml` + `security.yml`）
- **Step 5-5.7**: SuperClaude統合 / Claude Code通知 / セキュリティ自動化（gitleaks + GitHub設定）
- **Step 6**: VS Code設定
- **Step 7**: 完了レポート

### ステップ3: Claude Code 起動と開発開始

```bash
# Cursor 内ターミナルで Claude Code を起動
claude

# Claude Code に自然言語で機能実装を依頼
# 例: 「ユーザー認証機能を追加して」
```

実装した機能の動作確認が必要になったときに、別途:

```bash
pnpm dev
# ブラウザで http://localhost:3000 を開く
```

> **注**: `pnpm dev` はセットアップ完了の必須ステップではありません。実装の動作確認が必要になったタイミングで起動するコマンドです。型チェック・テスト・ESLintは pre-commit フックで自動実行されるため、コミット時に自動的に品質が保証されます。

## ✨ テンプレートの機能

### 🤖 SuperClaude v4 統合

- **14の専門エージェント**: system-architect、security-engineer、performance-engineer等
- **/sc:コマンド体系**: 22の統一コマンド
- **6つの適応モード**: Business Panel、Brainstorming、Orchestration等

### 📦 フィーチャーベース開発

- **厳格な境界管理**: フィーチャー間の独立性を保証
- **自動境界チェック**: `pnpm sc:boundaries`
- **フィーチャー作成ウィザード**: `pnpm sc:feature [name]`

### 🎨 デザインシステム

- **Rounded M+ フォント**: 日本語に最適化
- **7つのUIスタイル**: Glassmorphism、Neumorphism、Cyberpunk等
- **ダークモード対応**: 自動切り替え可能

## 📝 使用可能なコマンド

### 開発コマンド

```bash
pnpm dev              # 開発サーバー起動
pnpm build            # プロダクションビルド
pnpm start            # プロダクションサーバー起動
pnpm test             # テスト実行
```

### SuperClaude v4コマンド（/sc:）

```bash
pnpm sc:start         # セッション開始＋境界チェック
pnpm sc:feature       # 新フィーチャー作成
pnpm sc:boundaries    # 境界違反チェック
pnpm sc:analyze       # 依存関係分析
pnpm sc:validate      # 包括的品質チェック
pnpm sc:business-panel # ビジネス分析モード
```

### 品質管理コマンド

```bash
pnpm check:boundaries # 境界違反の検出
pnpm fix:boundaries   # 境界違反の自動修正
pnpm typecheck       # 型チェック
pnpm lint            # ESLintチェック
pnpm validate:all    # 全品質チェック
```

## 🔧 MCPサーバーについて

MCPサーバーはステップ2で手動登録が必要です。ツールの使用許可は `.claude/settings.json` にテンプレートとして同梱済みです。

| サーバー       | 機能                                 | APIキー |
| -------------- | ------------------------------------ | ------- |
| **Serena**     | セッション永続性、プロジェクトメモリ | 不要    |
| **Morphllm**   | パターンベース一括編集               | 不要    |
| **Sequential** | 複雑な分析、思考チェーン             | 不要    |
| **Context7**   | 公式ドキュメント取得                 | 不要    |

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション20を参照。

## 🎯 Claude Codeでの使い方

### 自然言語で依頼するだけ

```
あなた: 「ユーザー認証機能を追加して」

Claude Code（自動的に）:
1. requirements-analyst → 要件分析
2. system-architect → アーキテクチャ設計
3. backend-architect → 実装
4. security-engineer → セキュリティチェック
5. quality-engineer → テスト作成
```

### 14の専門エージェントが自動協調

- **要件分析**: requirements-analyst
- **設計**: system-architect、frontend-architect、backend-architect
- **実装**: python-expert、refactoring-expert
- **品質**: quality-engineer、security-engineer、performance-engineer
- **運用**: devops-architect、root-cause-analyst
- **ドキュメント**: technical-writer、learning-guide

## 🚨 トラブルシューティング

### 境界違反が検出される場合

```bash
# 自動修正を実行
pnpm fix:boundaries

# 手動で確認
pnpm check:boundaries --verbose
```

### MCPサーバーが動作しない場合

1. ターミナルを再起動（`source ~/.zshrc`）
2. `claude mcp list` で登録状態を確認
3. 詳細は [SPECIFICATION.md](./SPECIFICATION.md) のセクション20.6を参照

## 📚 詳細ドキュメント

- **[CLAUDE.md](./CLAUDE.md)**: Claude Code専用の実装ガイド
- **[PROJECT_INFO.md](./PROJECT_INFO.md)**: プロジェクト固有の設定
- **[README.md](./README.md)**: プロジェクト概要

## 🤝 サポート

### 質問・問題がある場合

1. **このテンプレート**: プロジェクトのIssuesセクション

## 📋 チェックリスト

セットアップが完了したことを確認：

- [ ] テンプレートをクローンした
- [ ] `pnpm setup:project`を実行した
- [ ] MCPサーバーを登録した（ステップ2）
- [ ] `claude mcp list` で全MCPが表示される
- [ ] `pnpm dev`で開発サーバーが起動した
- [ ] `pnpm sc:boundaries`で境界チェックが動作した

すべてチェックできたら、準備完了です！🎉

---

**Happy Coding with SuperClaude v4 Production Edition!** 🚀
