# Feature-Based Next.js Template

A modern Next.js template with feature-based architecture, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

```bash
# Clone the repository
git clone [your-repo-url] my-app
cd my-app

# Run setup (recommended)
npm run setup:project
# or
pnpm setup:project
```

## 📋 Features

- ⚡ **Next.js 14** with App Router
- 🎨 **Tailwind CSS** with custom rounded font (M PLUS Rounded 1c)
- 📁 **Feature-based architecture**
- 🤖 **Claude Code integration** for automated development
- 🔒 **Security-first approach** with automatic vulnerability fixes
- 🧪 **Built-in health checks** (`pnpm check` and `pnpm preflight`)
- 🔄 **GitHub Actions** for CI/CD and automated PR creation

## 🏗️ Project Structure

```
src/
├── app/          # Next.js App Router
├── features/     # Feature-based modules
├── components/   # Shared components
└── styles/       # Global styles
```

## 📦 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm setup:project` - Initial project setup
- `pnpm check` - Run health checks
- `pnpm preflight` - Pre-deployment verification

## 🤖 Claude Code Integration

1. Install [Claude Code GitHub App](https://github.com/apps/claude-code)
2. Add `CLAUDE_CODE_OAUTH_TOKEN` to repository secrets
3. Create issues with `@claude` to trigger automated implementation

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.