# SuperClaude v4 Production Edition - 技術仕様書

> このドキュメントは、アプリケーションを完全に再現するための詳細な技術仕様です。

## 1. プロジェクト概要

| 項目               | 値                                               |
| ------------------ | ------------------------------------------------ |
| **名称**           | SuperClaude v4 Production Edition Template       |
| **バージョン**     | 0.1.0                                            |
| **用途**           | Claude Code開発に最適化されたNext.jsテンプレート |
| **アーキテクチャ** | フィーチャーベース開発（厳格な境界管理）         |
| **ライセンス**     | MIT                                              |

## 2. 技術スタック

### 2.1 コアフレームワーク

| パッケージ | バージョン | 用途                              |
| ---------- | ---------- | --------------------------------- |
| Next.js    | ^15.3.3    | Reactフレームワーク（App Router） |
| React      | ^19.1.0    | UIライブラリ                      |
| React DOM  | ^19.1.0    | DOMレンダリング                   |
| TypeScript | ^5.8.3     | 型安全な開発                      |

### 2.2 スタイリング

| パッケージ   | バージョン | 用途                           |
| ------------ | ---------- | ------------------------------ |
| Tailwind CSS | ^3.4.17    | ユーティリティファーストCSS    |
| PostCSS      | ^8.5.3     | CSSプロセッサ                  |
| Autoprefixer | ^10.4.21   | ベンダープレフィックス自動付与 |

### 2.3 状態管理・データ

| パッケージ            | バージョン | 用途                 |
| --------------------- | ---------- | -------------------- |
| Zustand               | ^5.0.5     | 軽量状態管理         |
| @supabase/supabase-js | ^2.49.4    | Supabaseクライアント |

### 2.4 国際化

| パッケージ    | バージョン | 用途                      |
| ------------- | ---------- | ------------------------- |
| i18next       | ^25.2.1    | 国際化フレームワーク      |
| react-i18next | ^16.4.1    | React用i18nバインディング |
| next-i18next  | ^15.4.2    | Next.js用i18n統合         |

### 2.5 テスト

| パッケージ             | バージョン | 用途                         |
| ---------------------- | ---------- | ---------------------------- |
| Vitest                 | ^3.1.4     | ユニットテストフレームワーク |
| @testing-library/react | ^16.3.0    | Reactコンポーネントテスト    |
| Playwright             | ^1.52.0    | E2Eテスト                    |

### 2.6 品質管理

| パッケージ  | バージョン | 用途                   |
| ----------- | ---------- | ---------------------- |
| ESLint      | ^9.28.0    | コード品質チェック     |
| Prettier    | ^3.5.3     | コードフォーマット     |
| Husky       | ^9.1.7     | Git hooks管理          |
| lint-staged | ^16.1.0    | ステージファイルのlint |

## 3. ディレクトリ構造

```
template-v3.0/
├── .claude/                    # Claude Code設定
│   ├── settings.json          # プロジェクト設定（Git管理）
│   └── settings.local.json    # ローカル設定（Git除外）
├── .github/
│   └── workflows/             # GitHub Actions
├── .husky/                    # Git hooks
│   ├── pre-commit            # コミット前チェック
│   └── commit-msg            # コミットメッセージ検証
├── docs/                      # ドキュメント
├── scripts/                   # ユーティリティスクリプト
│   ├── setup.js              # プロジェクトセットアップ
│   ├── check.js              # 品質チェック
│   ├── check-boundaries.js   # 境界違反検出
│   ├── create-feature.js     # フィーチャー作成
│   └── preflight.js          # デプロイ前チェック
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # ルートレイアウト
│   │   └── page.tsx          # ホームページ
│   ├── components/           # 共有コンポーネント
│   │   └── ErrorBoundary.tsx # エラー境界
│   ├── features/             # フィーチャーモジュール
│   │   └── _template/        # フィーチャーテンプレート
│   ├── hooks/                # 共有フック
│   │   ├── useI18n.ts        # 国際化フック
│   │   └── useInfiniteLoopDetector.ts
│   ├── styles/               # グローバルスタイル
│   │   └── globals.css       # Tailwind CSS
│   └── utils/                # ユーティリティ
│       ├── cache/            # キャッシュ機能
│       └── error-handling/   # エラーハンドリング
├── tests/
│   ├── e2e/                  # E2Eテスト
│   │   ├── fixtures/         # テストフィクスチャ
│   │   └── helpers/          # テストヘルパー
│   ├── regression/           # 回帰テスト
│   └── unit/                 # ユニットテスト
├── CLAUDE.md                 # Claude Code実装ガイド
├── PROJECT_INFO.md           # プロジェクト情報
├── SETUP_GUIDE.md            # セットアップガイド
├── package.json              # パッケージ設定
├── tsconfig.json             # TypeScript設定
├── tailwind.config.ts        # Tailwind設定
├── next.config.js            # Next.js設定
├── vitest.config.ts          # Vitest設定
└── playwright.config.ts      # Playwright設定
```

## 4. フィーチャーベース開発

### 4.1 フィーチャー構造

```
src/features/[feature-name]/
├── api/              # API関数（公開推奨）
│   └── featureApi.ts
├── components/       # UIコンポーネント（内部使用のみ）
│   └── Component.tsx
├── hooks/            # カスタムフック（内部使用のみ）
│   └── useFeature.ts
├── types/            # 型定義
│   └── index.ts
├── utils/            # ヘルパー関数（内部使用のみ）
├── store/            # 状態管理（内部使用のみ）
├── __tests__/        # テストファイル
└── index.ts          # 公開API（最小限）
```

### 4.2 境界ルール（絶対遵守）

| ルール                 | 説明                                    |
| ---------------------- | --------------------------------------- |
| フック非公開           | `index.ts`からフックを絶対に公開しない  |
| UIコンポーネント非公開 | 各フィーチャーが独自UIを実装            |
| API関数公開            | データ取得は純粋関数として公開          |
| import形式             | `@/features/[name]`のみ使用可能         |
| 内部アクセス禁止       | `/components`、`/hooks`への直接参照禁止 |

### 4.3 正しいindex.tsの例

```typescript
// src/features/[feature-name]/index.ts

// ✅ API関数（公開推奨）
export { getFeatureData, createItem } from './api/featureApi'

// ✅ ドメイン型のみ（公開可）
export type { FeatureItem, FeatureConfig } from './types'

// ❌ フック（公開禁止）
// export { useFeature } from './hooks/useFeature'

// ❌ UIコンポーネント（公開禁止）
// export { FeatureComponent } from './components/FeatureComponent'
```

## 5. 設定ファイル仕様

### 5.1 TypeScript設定（tsconfig.json）

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"]
    }
  }
}
```

### 5.2 Tailwind CSS設定

**フォント:**

- `font-rounded`: M PLUS Rounded 1c（日本語最適化）
- `font-mono`: Fira Code
- `font-cyber`: Orbitron

**カラーパレット:**

- Neon: `neon-green`, `neon-pink`, `neon-blue`, `neon-yellow`
- Glass: `glass-white`, `glass-black`
- Bauhaus: `bauhaus-red`, `bauhaus-blue`, `bauhaus-yellow`
- Natural: `earth-brown`, `leaf-green`, `sky-blue`

**ユーティリティクラス:**

- `.glass`: Glassmorphismスタイル
- `.neumorphism`: Neumorphismスタイル
- `.text-neon`: ネオンテキストエフェクト
- `.text-gradient`: グラデーションテキスト

### 5.3 環境変数

```bash
# .env.example
NEXT_PUBLIC_APP_NAME=your-app-name
NODE_ENV=development

# オプション
# NEXT_PUBLIC_API_URL=http://localhost:3000/api
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 6. コマンド一覧

### 6.1 開発コマンド

| コマンド         | 説明                   |
| ---------------- | ---------------------- |
| `pnpm dev`       | 開発サーバー起動       |
| `pnpm build`     | プロダクションビルド   |
| `pnpm start`     | プロダクションサーバー |
| `pnpm lint`      | ESLintチェック         |
| `pnpm typecheck` | 型チェック             |

### 6.2 テストコマンド

| コマンド               | 説明               |
| ---------------------- | ------------------ |
| `pnpm test`            | ユニットテスト実行 |
| `pnpm test:unit`       | Vitestでテスト     |
| `pnpm test:e2e`        | Playwrightでテスト |
| `pnpm test:coverage`   | カバレッジ測定     |
| `pnpm test:regression` | 回帰テスト         |

### 6.3 品質管理コマンド

| コマンド                | 説明               |
| ----------------------- | ------------------ |
| `pnpm check`            | 包括的品質チェック |
| `pnpm check:boundaries` | 境界違反検出       |
| `pnpm fix:boundaries`   | 境界違反自動修正   |
| `pnpm validate:all`     | 全検証実行         |

### 6.4 フィーチャー開発コマンド

| コマンド                     | 説明                       |
| ---------------------------- | -------------------------- |
| `pnpm create:feature [name]` | フィーチャー作成           |
| `pnpm sc:start`              | セッション開始             |
| `pnpm sc:feature`            | フィーチャー作成ウィザード |
| `pnpm sc:boundaries`         | 境界チェック               |
| `pnpm sc:validate`           | 包括的検証                 |

## 7. 開発ワークフロー

### 7.1 新機能開発フロー

```bash
# 1. セッション開始
pnpm sc:start

# 2. フィーチャー作成
pnpm create:feature user-profile

# 3. 実装（src/features/user-profile/内で作業）

# 4. 境界チェック
pnpm check:boundaries

# 5. テスト
pnpm test

# 6. 検証
pnpm validate:all

# 7. コミット
git add .
git commit -m "feat(user-profile): ユーザープロフィール機能を追加"
```

### 7.2 バグ修正フロー

```bash
# 1. 回帰テスト作成（必須）
# tests/regression/YYYY-MM-DD-NNN-description.test.ts

# 2. テスト失敗確認
pnpm test:regression

# 3. 修正実装

# 4. テスト成功確認
pnpm test:regression

# 5. 全体検証
pnpm validate:all
```

## 8. Git Hooks

### 8.1 pre-commit

- 設定ファイル整合性チェック
- 単一フィーチャーチェック（複数フィーチャー同時コミット防止）
- 境界違反チェック
- ESLint + TypeScript チェック
- ユニットテスト実行

### 8.2 commit-msg

- コミットメッセージ形式検証
- 形式: `type(scope): description`
- 許可されるtype: feat, fix, docs, style, refactor, test, chore

## 9. 前提条件

### 9.1 必須

- Node.js >= 20.19.0
- pnpm >= 8.0.0
- Git

### 9.2 推奨（フル機能使用時）

- Claude Code CLI
- SuperClaude v4.0.8
- MCPサーバー
  - Serena（セマンティック検索）
  - Context7（ドキュメント参照）
  - Sequential-thinking（構造化分析）
  - Morphllm（高速編集）
  - Playwright（E2Eテスト）

## 10. セットアップ手順

```bash
# 1. リポジトリクローン
git clone [repository-url] my-app
cd my-app

# 2. 依存関係インストール
pnpm install

# 3. 環境変数設定
cp .env.example .env.local
# .env.localを編集

# 4. 開発サーバー起動
pnpm dev

# ブラウザで http://localhost:3000 を開く
```

## 11. デプロイ

### 11.1 Vercel（推奨）

```bash
# Vercel CLIでデプロイ
vercel

# または GitHub連携で自動デプロイ
```

### 11.2 ビルド設定

| 設定             | 値             |
| ---------------- | -------------- |
| Build Command    | `pnpm build`   |
| Output Directory | `.next`        |
| Install Command  | `pnpm install` |
| Node.js Version  | 20.x           |

## 12. パフォーマンス指標

| 指標          | 目標値  | 現在値  |
| ------------- | ------- | ------- |
| First Load JS | < 150KB | 102KB   |
| ビルド時間    | < 5秒   | ~2秒    |
| 境界チェック  | < 500ms | < 100ms |
| テスト実行    | < 10秒  | ~1秒    |

---

**最終更新**: 2025-12-23
**バージョン**: 1.0.0
