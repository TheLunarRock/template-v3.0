# SuperClaude Template v3.0

最高の開発体験を提供する、フィーチャーベース開発 + SuperClaude + 完全なテスト環境を備えたNext.jsテンプレート。

## 🚀 Quick Start

```bash
# Clone the repository
git clone [your-repo-url] my-app
cd my-app

# Install dependencies
pnpm install

# Run complete setup (recommended)
pnpm setup:project

# Start development
pnpm dev
```

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

## 📦 Available Scripts

### Development
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm setup:project` - Complete initial setup (recommended)
- `pnpm setup:quick` - Quick setup without browser install

### Testing
- `pnpm test:unit` - Run unit tests
- `pnpm test:e2e` - Run E2E tests
- `pnpm test:e2e:ui` - Playwright UI mode
- `pnpm test` - Run all tests

### Quality Checks
- `pnpm check` - Run health checks
- `pnpm check:boundaries` - Check feature boundaries
- `pnpm preflight` - Pre-deployment verification
- `pnpm validate:all` - Run all validations

### Feature Creation
- `pnpm create:feature [name]` - Create new feature with tests

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