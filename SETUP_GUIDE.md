# 🚀 SuperClaude v4 Production Edition - セットアップガイド

このガイドでは、SuperClaude v4 Production Editionテンプレートを使用して、エンタープライズグレードのNext.jsアプリケーションを開始する方法を説明します。

## 📋 前提条件

- **Node.js**: 18.0.0以上
- **pnpm**: 8.0.0以上（`npm install -g pnpm`でインストール）
- **Git**: 最新版
- **Claude.ai**: アカウント（無料プランでOK）

## 🎯 クイックスタート（3ステップ）

### ステップ1: テンプレートをクローン

```bash
# リポジトリをクローン
git clone https://github.com/[your-username]/template-v3.0 my-awesome-app
cd my-awesome-app

# プロジェクトをセットアップ（依存関係のインストール含む）
pnpm setup:project
```

### ステップ2: SuperClaude v4をインストール（初回のみ）

#### 方法A: npm使用（推奨・全OS対応）

```bash
npm install -g @bifrost_inc/superclaude && superclaude install
```

#### 方法B: pipx使用（Mac/Linux）

```bash
# pipxがない場合は先にインストール
brew install pipx  # Mac
# または
python3 -m pip install --user pipx

# SuperClaudeをインストール
pipx install SuperClaude && SuperClaude install
```

### ステップ3: 開発開始

```bash
# 開発サーバーを起動
pnpm dev

# ブラウザで http://localhost:3000 を開く
```

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

SuperClaude v4インストール時に、以下の5つのMCPサーバーが自動設定されます：

| サーバー       | 機能                                 | APIキー            |
| -------------- | ------------------------------------ | ------------------ |
| **Serena**     | セッション永続性、プロジェクトメモリ | 不要               |
| **Morphllm**   | パターンベース一括編集               | 不要               |
| **Sequential** | 複雑な分析、思考チェーン             | 不要               |
| **Context7**   | 公式ドキュメント取得                 | 不要               |
| **Magic**      | UI自動生成（21st.dev）               | 必要（オプション） |

### Magic MCPのAPIキー設定（オプション）

UI自動生成機能を使用する場合：

1. [21st.dev](https://21st.dev)でAPIキーを取得
2. Claude.aiの設定でMagic MCPにAPIキーを設定

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

### SuperClaudeインストールでエラーが出る場合

#### pipxが見つからない（Mac/Linux）

```bash
# Homebrewでインストール
brew install pipx
pipx ensurepath

# または pip経由
python3 -m pip install --user pipx
```

#### npmコマンドが見つからない

```bash
# Node.jsをインストール
# https://nodejs.org/ からダウンロード
# またはnvmを使用
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

### 境界違反が検出される場合

```bash
# 自動修正を実行
pnpm fix:boundaries

# 手動で確認
pnpm check:boundaries --verbose
```

### MCPサーバーが動作しない場合

1. Claude.aiを完全に再起動（ブラウザを閉じて開く）
2. SuperClaudeの再インストール

```bash
superclaude uninstall && superclaude install
```

## 📚 詳細ドキュメント

- **[CLAUDE.md](./CLAUDE.md)**: Claude Code専用の実装ガイド
- **[PROJECT_INFO.md](./PROJECT_INFO.md)**: プロジェクト固有の設定
- **[README.md](./README.md)**: プロジェクト概要

## 🤝 サポート

### 質問・問題がある場合

1. **SuperClaude Framework**: [GitHub Issues](https://github.com/SuperClaude-Org/SuperClaude_Framework/issues)
2. **このテンプレート**: プロジェクトのIssuesセクション

## 📋 チェックリスト

セットアップが完了したことを確認：

- [ ] テンプレートをクローンした
- [ ] `pnpm setup:project`を実行した
- [ ] SuperClaude v4をインストールした
- [ ] `pnpm dev`で開発サーバーが起動した
- [ ] `pnpm sc:boundaries`で境界チェックが動作した
- [ ] Claude.aiでMCPサーバーが認識されている

すべてチェックできたら、準備完了です！🎉

---

**Happy Coding with SuperClaude v4 Production Edition!** 🚀
