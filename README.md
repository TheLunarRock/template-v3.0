# Claude Code 個人開発用 Next.js テンプレート

[![Framework](https://img.shields.io/badge/SuperClaude-v4-blue)](https://github.com/SuperClaude-Org/SuperClaude_Framework)
[![Architecture](https://img.shields.io/badge/Architecture-Feature--based-orange)](CLAUDE.md)

Claude Code に書かせる個人開発向け Next.js テンプレート。フィーチャーベース開発の境界保護、9層セキュリティ防御、SuperClaude コンテキストファイル同梱、整合性テストによるドキュメント乖離防止を提供する。

## 同梱内容

- **SuperClaude コンテキストファイル**（`superclaude/` に14ファイル同梱・MCPは別途登録）
- **フィーチャーベース開発**（境界違反検出スクリプト + Git Hook + 中間保護層パターン）
- **9層セキュリティ防御**（gitleaks pre-commit / GitHub Secret Scanning + Push Protection / セキュリティヘッダー7種 / CodeQL / pnpm audit / Claude Code denyルール / DB破壊系 ask + Hook 二重防御 等）
- **PR運用モード切替**（個人開発OFF ⇄ チーム開発ON を `pnpm sc:enable-pr` / `sc:disable-pr` で可逆切替）
- **ドキュメント整合性テスト**（57テスト・Vitest）
- **Claude Code 通知システム**（macOS sound + 通知センター + Slack）

詳細は [CLAUDE.md](./CLAUDE.md) と [SPECIFICATION.md](./SPECIFICATION.md) を参照。

## 📖 セットアップガイド

詳細なセットアップ手順は **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** を参照してください。

## ⚠️ 前提条件

このテンプレートは **SuperClaude v4** を使用したClaude Code開発に最適化されています。

### 必須

- **Node.js** >= 20.19.0（`.nvmrc` 参照）
- **pnpm** 9.x
- **Claude Code** CLI

### 推奨（フル機能を使用する場合）

- **MCPサーバー**（Cursor / Claude Code に登録）— 詳細は [SETUP_GUIDE.md](./SETUP_GUIDE.md) と [CLAUDE.md](./CLAUDE.md) 参照
  - Serena（セマンティック検索・必須）
  - Supabase（DB操作・必須／使う場合）
  - Context7（公式ドキュメント参照・推奨）
  - Stitch（UIデザイン・推奨）

> SuperClaude のコンテキストファイルは `superclaude/` に同梱済み。クローンしただけで Claude Code が読み込みます。

## 🚀 Quick Start

```bash
# クローン
git clone [your-repo-url] my-app
cd my-app

# セットアップ（依存関係 + Git Hooks + CI設定 + セキュリティ）
pnpm setup:sc

# Claude Code 起動して自然言語で実装依頼
claude
```

動作確認したいときだけ `pnpm dev` を起動します。詳細は [SETUP_GUIDE.md](./SETUP_GUIDE.md) を参照。

### 🔧 Git Hooksの自動設定

このテンプレートは**最初から機能するGit Hooks**を提供します：

- **postinstall時**: `pnpm install`実行時にgit hooksへ自動的に実行権限付与
- **pre-commit**: 境界違反チェック + 複数フィーチャー同時コミット防止
- **commit-msg**: コミットメッセージの標準化強制

新規プロジェクトでも即座に境界保護が有効になります。

> `pnpm setup:sc` は依存関係のインストールも内包します。

## 📋 Features

- ⚡ **Next.js 15.5.x** with App Router / React 19
- 🎨 **Tailwind CSS**
- 📁 **Feature-based architecture** with boundary enforcement
- 🤖 **SuperClaude integration** (コンテキストファイル同梱)
- 🧪 **Vitest** unit tests + 整合性テスト
- 📊 **Supabase ready** with MCP server support
- 🔒 **9層セキュリティ防御**（gitleaks / Secret Scanning / Push Protection / CSP 等）
- 🎯 **CI/CD Pipeline** with GitHub Actions（個人開発前提・main push トリガー）

## 🏗️ Project Structure

```
src/
├── app/          # Next.js App Router
├── features/     # Feature-based modules
├── components/   # Shared components
└── styles/       # Global styles
```

## 🧪 テストとカバレッジ

### テストコマンド

```bash
pnpm test              # ユニットテスト実行
pnpm test:unit:watch   # ウォッチモード
pnpm test:coverage     # カバレッジ計測（閾値強制なし・計測のみ）
pnpm test:regression   # 回帰テスト
```

### カバレッジレポート

```bash
# HTMLレポートの生成と表示
pnpm test:coverage:ui
```

## 📊 Bundle分析

```bash
# Bundle分析レポートの生成
pnpm build:analyze

# 最適化の機会を自動的に可視化
```

## 🌍 国際化（i18n）

### 対応言語

- 🇯🇵 日本語（デフォルト）
- 🇺🇸 英語

### 使用方法

```typescript
import { useI18n } from '@/hooks/useI18n'

function Component() {
  const { locale, t, setLocale } = useI18n()
  return <button>{t('common.actions.save')}</button>
}
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

## 🔧 MCP (Model Context Protocol) サーバー設定

詳細なティア分類と設定手順は [SPECIFICATION.md §20](./SPECIFICATION.md) を参照。本テンプレートで利用する主要MCPは以下の通り：

| ティア | サーバー                       | 用途                                 |
| ------ | ------------------------------ | ------------------------------------ |
| 必須   | Serena                         | セマンティック検索・プロジェクト記憶 |
| 必須   | Supabase                       | DB操作・Edge Functions（使う場合）   |
| 推奨   | Context7                       | 公式ドキュメント参照                 |
| 推奨   | Stitch                         | UIデザイン・プロトタイピング         |
| 補助   | Sequential-thinking / Morphllm | 構造化思考 / 一括編集                |

```bash
# 接続確認
claude mcp list
```

詳細設定は [MCP Setup Guide](docs/MCP_SETUP.md) を参照。

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
