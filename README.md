# SuperClaude v4 Production Edition - Enterprise Template

[![Framework](https://img.shields.io/badge/SuperClaude-v4.0.8-blue)](https://github.com/SuperClaude-Org/SuperClaude_Framework)
[![Template](https://img.shields.io/badge/Edition-Production-green)](CLAUDE.md)
[![Architecture](https://img.shields.io/badge/Architecture-Feature--based-orange)](docs/architecture.md)

100% Claude Code実装用のエンタープライズグレードNext.jsテンプレート。
**SuperClaude v4.0.8** + **14専門エージェント** + **フィーチャーベース開発** + **完全自動化**

## 🆕 v4 Production Edition の特徴

### 14の専門エージェント
- 🏗️ **system-architect**: スケーラブルなシステム設計
- 🛡️ **security-engineer**: セキュリティ脆弱性の特定
- ⚡ **performance-engineer**: パフォーマンス最適化
- 🎨 **frontend-architect**: アクセシブルなUI設計
- 🔧 **backend-architect**: 信頼性の高いバックエンド
- その他9つの専門エージェント

### /sc: 統一コマンド体系
```bash
/sc:start          # セッション開始
/sc:feature        # フィーチャー作成
/sc:boundaries     # 境界チェック
/sc:business-panel # ビジネス分析（新機能）
```

### 6つの適応モード
- **Business Panel** 🆕: 戦略的ビジネス分析
- **Brainstorming**: 要件探索
- **Orchestration**: 並列実行最適化
- **Token-Efficiency**: 30-50%トークン削減
- **Task Management**: 体系的タスク管理
- **Introspection**: メタ認知分析

## 📖 セットアップガイド

詳細なセットアップ手順は **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** を参照してください。

## 🚀 Quick Start

```bash
# Clone the repository
git clone [your-repo-url] my-app
cd my-app

# Run complete setup (dependencies + configuration)
pnpm setup:project

# Start development
pnpm dev
```

> 💡 `pnpm setup:project`は依存関係のインストールも自動で行います

## 📋 Features

- ⚡ **Next.js 14.2.31** with App Router
- 🎨 **Tailwind CSS** with 11 UI design styles (Neumorphism, Glassmorphism, Cyberpunk, etc.)
- 📁 **Feature-based architecture** with boundary enforcement
- 🤖 **SuperClaude integration** for maximum AI development power
- 🧪 **Complete testing** - Playwright E2E + Vitest unit tests
- 📊 **Supabase ready** with MCP server support
- 🔒 **Security-first** with automated vulnerability fixes
- 🎯 **CI/CD Pipeline** with GitHub Actions
- 🎨 **UI Showcase** at `/ui-demo` with all design styles

## 🏗️ Project Structure

```
src/
├── app/          # Next.js App Router
├── features/     # Feature-based modules
├── components/   # Shared components
└── styles/       # Global styles
```

## 📦 Claude Code専用コマンド

### Claude Code実装フロー
```bash
pnpm claude:start      # 実装開始（状態確認）
pnpm claude:implement  # フィーチャー作成
pnpm claude:validate   # 実装検証
pnpm claude:complete   # 完了確認
```

### 自動化コマンド
- `pnpm create:feature [name]` - フィーチャー自動生成（手動作成禁止）
- `pnpm check:boundaries` - 境界違反検出
- `pnpm fix:boundaries` - 違反自動修正
- `pnpm validate:all` - 全検証実行（完了条件）

### 開発コマンド
- `pnpm dev` - 開発サーバー起動
- `pnpm build` - プロダクションビルド
- `pnpm test` - テスト実行
- `pnpm typecheck` - 型チェック

## 🤖 Claude Code Integration

1. Install [Claude Code GitHub App](https://github.com/apps/claude-code)
2. Add `CLAUDE_CODE_OAUTH_TOKEN` to repository secrets
3. Create issues with `@claude` to trigger automated implementation

## 📊 Supabase MCP Integration (Optional)

Claude Code/CursorでSupabaseデータベースを直接操作する場合：

```bash
# Supabase MCPサーバーを追加（各開発者が個別に設定）
claude mcp add supabase \
  -s local \
  -e SUPABASE_ACCESS_TOKEN=your_token_here \
  -- npx -y @supabase/mcp-server-supabase@latest
```

**注意**: 
- MCPサーバー設定は**開発環境側の設定**です
- テンプレート自体には影響しません
- 各開発者が個別にトークンを設定します

詳細は [Supabase MCP Setup Guide](docs/SUPABASE_MCP_SETUP.md) を参照。

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.