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

> **設計判断（2026-03-13）**: E2Eテスト（Playwright）はテンプレートから完全に削除済み。
> テンプレートからクローンしたリポジトリでGitHub Actions CI上でPlaywrightが自動実行され、
> Actions分数を大量消費する問題が発生したため。テンプレートとしてはVitestによる
> ユニットテスト・回帰テストのみを提供し、E2Eテストは各プロジェクトで必要に応じて個別導入する方針。

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
├── superclaude/               # SuperClaudeコンテキストファイル
│   ├── FLAGS.md              # 行動フラグ定義
│   ├── PRINCIPLES.md         # 設計原則
│   ├── RULES.md              # 行動ルール
│   ├── MCP_*.md              # MCP選択ガイダンス（6ファイル）
│   └── MODE_*.md             # 行動モード定義（5ファイル）
├── tests/
│   ├── regression/           # 回帰テスト
│   └── unit/                 # ユニットテスト
├── CLAUDE.md                 # Claude Code実装ガイド
├── PROJECT_INFO.md           # プロジェクト情報
├── SETUP_GUIDE.md            # セットアップガイド
├── package.json              # パッケージ設定
├── tsconfig.json             # TypeScript設定
├── tailwind.config.ts        # Tailwind設定
├── next.config.mjs           # Next.js設定
└── vitest.config.ts          # Vitest設定
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
    "target": "es2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitOverride": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "exactOptionalPropertyTypes": false,
    "noUncheckedIndexedAccess": false,
    "strictPropertyInitialization": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"],
      "@features/*": ["./src/features/*"]
    }
  }
}
```

### 5.2 Next.js設定（next.config.mjs）

```javascript
import bundleAnalyzer from '@next/bundle-analyzer'

const nextConfig = {
  reactStrictMode: true,
}

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
})

export default process.env.ANALYZE === 'true' ? withBundleAnalyzer(nextConfig) : nextConfig
```

### 5.3 Vitest設定（vitest.config.ts）

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/features/**/': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/features': path.resolve(__dirname, './src/features'),
    },
  },
})
```

### 5.4 Tailwind CSS設定

**フォント:**

- `font-rounded`: M PLUS Rounded 1c（日本語最適化）
- `font-mono`: Fira Code
- `font-cyber`: Orbitron
- `font-retro`: Press Start 2P

**カラーパレット:**

- Neon: `neon-green`, `neon-pink`, `neon-blue`, `neon-yellow`, `neon-orange`
- Glass: `glass-white`, `glass-black`
- Bauhaus: `bauhaus-red`, `bauhaus-blue`, `bauhaus-yellow`
- Natural: `earth-brown`, `leaf-green`, `sky-blue`, `sand-beige`

**ユーティリティクラス:**

- `.glass`: Glassmorphism背景
- `.glass-dark`: ダークGlassmorphism
- `.neumorphism`: Neumorphismスタイル
- `.neumorphism-inset`: 内側Neumorphism
- `.text-neon`: ネオンテキストエフェクト
- `.text-brutal`: Brutalismテキスト
- `.text-retro`: レトロテキスト
- `.text-gradient`: グラデーションテキスト

**アニメーション:**

- `animate-glitch`: グリッチエフェクト
- `animate-pulse-neon`: ネオン点滅
- `animate-float`: フローティング
- `animate-gradient-shift`: グラデーション移動
- `animate-typing`: タイピングエフェクト

### 5.5 環境変数

```bash
# .env.example
NEXT_PUBLIC_APP_NAME=your-app-name
NODE_ENV=development

# オプション
# NEXT_PUBLIC_API_URL=http://localhost:3000/api
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 6. ソースコード仕様

### 6.1 ルートレイアウト（src/app/layout.tsx）

```typescript
import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Feature App',
  description: 'Feature-based development template',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className="font-rounded">{children}</body>
    </html>
  )
}
```

### 6.2 ホームページ（src/app/page.tsx）

```typescript
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 font-rounded">Next.js App Running</p>
    </main>
  )
}
```

### 6.3 エラー境界（src/components/ErrorBoundary.tsx）

フィーチャー間のエラー伝播を防ぐクラスコンポーネント。

**Props:**

- `children`: ReactNode
- `fallback?`: ReactNode（カスタムフォールバックUI）
- `featureName?`: string（エラー特定用）

**State:**

- `hasError`: boolean
- `error?`: Error

**機能:**

- エラー捕捉とログ出力
- 開発環境でのスタックトレース表示
- カスタマイズ可能なフォールバックUI

### 6.4 国際化フック（src/hooks/useI18n.ts）

**型定義:**

```typescript
type Locale = 'ja' | 'en'
```

**戻り値:**

- `locale`: Locale - 現在のロケール
- `locales`: Locale[] - 利用可能なロケール
- `setLocale`: (newLocale: Locale) => void
- `t`: (key: string) => string - 翻訳関数

**機能:**

- ブラウザ言語設定の自動検出
- localStorage永続化
- next-i18next拡張準備

### 6.5 無限ループ検出（src/hooks/useInfiniteLoopDetector.ts）

開発環境専用の無限ループ検出フック。

**オプション:**

```typescript
interface LoopDetectorOptions {
  name: string // 監視名
  threshold?: number // 警告閾値（デフォルト: 10）
  timeWindow?: number // 監視時間窓（デフォルト: 5000ms）
  customMessage?: string // カスタム警告メッセージ
}
```

**機能:**

- useEffect実行回数の監視
- 異常頻度の検出と警告
- デバッガー停止オプション
- `logExecutionStats()`でグローバル統計表示

### 6.6 キャッシュユーティリティ（src/utils/cache/）

**MemoryCacheクラス:**

```typescript
class MemoryCache<T> implements IMemoryCache<T> {
  get(key: string): T | undefined
  set(key: string, value: T, options?: CacheOptions): void
  has(key: string): boolean
  delete(key: string): boolean
  clear(): void
  getStats(): CacheStats
  deleteByTag(tag: string): number
  cleanup(): number
  size(): number
}
```

**キャッシュストラテジー:**

- `lru`: Least Recently Used
- `lfu`: Least Frequently Used
- `fifo`: First In First Out
- `ttl`: Time To Live

**プリセット:**

- `CachePresets.api`: API応答用（短TTL、LRU）
- `CachePresets.session`: セッション用（長TTL）
- `CachePresets.computation`: 計算結果用（TTLなし、LFU）
- `CachePresets.static`: 静的リソース用（大容量）
- `CachePresets.development`: 開発用（デバッグ有効）

### 6.7 エラーハンドリング（src/utils/error-handling/）

**構造化エラー型:**

```typescript
interface StructuredError {
  code?: string
  message: string
  userMessage?: string
  level: 'critical' | 'error' | 'warning' | 'info'
  category: 'network' | 'database' | 'auth' | 'validation' | 'business' | 'system' | 'unknown'
  context?: Record<string, unknown>
  stack?: string
  timestamp: Date
  originalError?: unknown
}
```

**主要関数:**

- `transformError(error, options)`: エラー変換
- `handleError(error, options)`: エラー処理とログ
- `tryCatch<T>(operation, options)`: Promise用ラッパー
- `aggregateErrors(errors)`: 複数エラー集約

**Supabase統合:**

- `isSupabaseError(error)`: Supabaseエラー判定
- `transformSupabaseError(error)`: Supabaseエラー変換
- `safeSupabaseOperation(operation)`: 安全な操作ラッパー

## 7. コマンド一覧

### 7.1 開発コマンド

| コマンド         | 説明                   |
| ---------------- | ---------------------- |
| `pnpm dev`       | 開発サーバー起動       |
| `pnpm build`     | プロダクションビルド   |
| `pnpm start`     | プロダクションサーバー |
| `pnpm lint`      | ESLintチェック         |
| `pnpm typecheck` | 型チェック             |

### 7.2 テストコマンド

| コマンド               | 説明               |
| ---------------------- | ------------------ |
| `pnpm test`            | ユニットテスト実行 |
| `pnpm test:unit`       | Vitestでテスト     |
| `pnpm test:coverage`   | カバレッジ測定     |
| `pnpm test:regression` | 回帰テスト         |

### 7.3 品質管理コマンド

| コマンド                | 説明               |
| ----------------------- | ------------------ |
| `pnpm check`            | 包括的品質チェック |
| `pnpm check:boundaries` | 境界違反検出       |
| `pnpm fix:boundaries`   | 境界違反自動修正   |
| `pnpm validate:all`     | 全検証実行         |

### 7.4 フィーチャー開発コマンド

| コマンド                     | 説明                       |
| ---------------------------- | -------------------------- |
| `pnpm create:feature [name]` | フィーチャー作成           |
| `pnpm sc:start`              | セッション開始             |
| `pnpm sc:feature`            | フィーチャー作成ウィザード |
| `pnpm sc:boundaries`         | 境界チェック               |
| `pnpm sc:validate`           | 包括的検証                 |

## 8. 開発ワークフロー

### 8.1 新機能開発フロー

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

### 8.2 バグ修正フロー

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

## 9. CI/CDパイプライン

### 9.1 GitHub Actions（.github/workflows/ci.yml）

push（main, develop）およびPR（main宛）で自動実行される3ジョブ構成のパイプライン。

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    name: コード品質チェック
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - name: 依存関係インストール
        run: pnpm install --frozen-lockfile
      - name: 型チェック
        run: pnpm typecheck
      - name: フィーチャー境界チェック
        run: pnpm check:boundaries
      - name: 全体チェック
        run: pnpm check

  test:
    name: テスト実行
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - name: 依存関係インストール
        run: pnpm install --frozen-lockfile
      - name: 単体テスト
        run: pnpm test:unit

  build:
    name: ビルドチェック
    runs-on: ubuntu-latest
    needs: [quality, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - name: 依存関係インストール
        run: pnpm install --frozen-lockfile
      - name: プロダクションビルド
        run: pnpm build
      - name: Preflightチェック
        run: pnpm preflight
```

### 9.2 ジョブ構成

| ジョブ      | 依存関係            | 実行内容                                 |
| ----------- | ------------------- | ---------------------------------------- |
| **quality** | なし（並列実行）    | 型チェック → 境界チェック → 全体チェック |
| **test**    | なし（並列実行）    | Vitestユニットテスト                     |
| **build**   | quality, test完了後 | プロダクションビルド → Preflightチェック |

### 9.3 実行環境

| 項目             | 値                                      |
| ---------------- | --------------------------------------- |
| **ランナー**     | ubuntu-latest                           |
| **Node.js**      | 18                                      |
| **パッケージ**   | pnpm 8                                  |
| **インストール** | `--frozen-lockfile`（lockfile厳密一致） |

> **設計判断（2026-03-13）**: CIパイプラインにはE2Eテスト（Playwright）を含まない。
> テンプレートからクローンした全リポジトリでPlaywrightが自動実行されActions分数を大量消費する
> 問題が発生したため、テンプレートのCIはユニットテスト（Vitest）のみとする方針。
> E2Eテストが必要なプロジェクトでは、各リポジトリで個別にci.ymlへステップを追加すること。

## 10. Git Hooks

### 10.1 pre-commit（実行順序）

```
1. 🔐 gitleaksシークレットスキャン（秘密情報の流出検出）
2. 🔒 設定ファイル整合性チェック（protect-config.js）
3. 🔍 単一フィーチャーチェック（複数フィーチャー同時コミット防止）
4. 🔍 フィーチャー境界違反チェック（check-boundaries.js）
5. 🔍 ESLint + TypeScript チェック（lint-staged）
6. 🧪 ユニットテスト実行（vitest run）
```

#### 10.1.1 gitleaksシークレットスキャン

```bash
# ステージングされたファイルからAPIキー・パスワード・トークン等を自動検出
# 検出時はコミットをブロックし、対処法を日本語で表示
# gitleaks未インストール環境では警告のみで続行（ブロックしない）

if command -v gitleaks >/dev/null 2>&1; then
  gitleaks git --pre-commit --staged --verbose
fi
```

**検出対象の例:**

| パターン   | 例                                |
| ---------- | --------------------------------- |
| APIキー    | `AKIA...`, `sk-...`, `ghp_...`    |
| パスワード | `password=`, `secret=`            |
| トークン   | JWTトークン、OAuthトークン        |
| 秘密鍵     | RSA/ECDSA秘密鍵                   |
| 接続文字列 | `postgresql://`, `mongodb+srv://` |

#### 10.1.2 単一フィーチャーチェック

```bash
# git diff --cached から変更されたフィーチャーを検出
# 2つ以上のフィーチャーが同時に変更されている場合はブロック
# 1コミット = 1フィーチャーを物理的に強制
```

### 10.2 commit-msg

- コミットメッセージ形式検証
- 形式: `type(scope): description`
- 許可されるtype: feat, fix, docs, style, refactor, test, chore, perf
- フィーチャー名の自動検出と推奨フォーマット表示

## 11. Claude Code通知システム

### 11.1 概要

Claude Codeがタスク完了時または承認待ち時に、Slack/macOS通知を送信するシステム。

### 11.2 アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│ Claude Code                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Hooks System                                             │ │
│ │ ├─ Stop Event      → タスク完了時に発火                  │ │
│ │ └─ Notification Event → 承認待ち/60秒アイドル時に発火   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                              │                               │
│                              ▼                               │
│ ~/.claude/slack-notify.sh (通知スクリプト)                   │
└─────────────────────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌────────────┐      ┌────────────┐      ┌────────────┐
   │ macOS Sound│      │ macOS      │      │ Slack      │
   │ (afplay)   │      │ Notification│     │ Webhook    │
   └────────────┘      └────────────┘      └────────────┘
```

### 11.3 設定ファイル

#### 11.3.1 グローバル設定（~/.claude/settings.json）

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/[username]/.claude/slack-notify.sh"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "permission_prompt|idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/[username]/.claude/slack-notify.sh"
          }
        ]
      }
    ]
  }
}
```

#### 11.3.2 通知スクリプト（~/.claude/slack-notify.sh）

```bash
#!/bin/bash
# Claude Code Notification Script

WEBHOOK_URL="your-slack-webhook-url"  # Slack Webhook URL（オプション）

# プロジェクト名を取得
PROJECT_NAME=$(basename "$(pwd)")

# メッセージ作成
MESSAGE="Claude Code is waiting in *${PROJECT_NAME}*"

# 1. サウンド再生（macOS）
if [[ "$OSTYPE" == "darwin"* ]]; then
  afplay /System/Library/Sounds/Glass.aiff &
fi

# 2. macOS通知
if [[ "$OSTYPE" == "darwin"* ]]; then
  osascript -e "display notification \"$MESSAGE\" with title \"Claude Code\" sound name \"Glass\""
fi

# 3. Slack通知（設定時のみ）
if [ -n "$WEBHOOK_URL" ]; then
  curl -s -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$MESSAGE\"}" > /dev/null 2>&1
fi
```

### 11.4 Hooks イベント仕様

| イベント         | マッチャー               | 発火タイミング               |
| ---------------- | ------------------------ | ---------------------------- |
| **Stop**         | `""` (空文字 = 全マッチ) | Claude Codeタスク完了時      |
| **Notification** | `permission_prompt`      | 承認待ち（ツール使用許可等） |
| **Notification** | `idle_prompt`            | 60秒間アイドル状態継続時     |

### 11.5 セットアップ方法

#### 自動セットアップ（推奨）

```bash
# テンプレートクローン後に実行
pnpm setup:sc

# 対話プロンプト:
# 1. 「通知を設定しますか？ (y/N):」→ y
# 2. 「Webhook URL:」→ Slack Webhook URLを入力（空欄可）
```

#### 手動セットアップ

```bash
# 1. 通知スクリプト作成
mkdir -p ~/.claude
cat > ~/.claude/slack-notify.sh << 'EOF'
#!/bin/bash
PROJECT_NAME=$(basename "$(pwd)")
MESSAGE="Claude Code is waiting in *${PROJECT_NAME}*"
afplay /System/Library/Sounds/Glass.aiff &
osascript -e "display notification \"$MESSAGE\" with title \"Claude Code\" sound name \"Glass\""
EOF
chmod +x ~/.claude/slack-notify.sh

# 2. settings.jsonにhooks追加（手動編集）
```

### 11.6 Slack Webhook設定手順

1. https://api.slack.com/apps にアクセス
2. 「Create New App」→「From scratch」
3. アプリ名とワークスペースを選択
4. 左メニュー「Incoming Webhooks」をクリック
5. 「Activate Incoming Webhooks」をON
6. 「Add New Webhook to Workspace」をクリック
7. 通知先チャンネルを選択
8. 生成されたWebhook URLをコピー

### 11.7 トラブルシューティング

| 問題                      | 原因                                               | 解決策                                   |
| ------------------------- | -------------------------------------------------- | ---------------------------------------- |
| 通知が来ない              | プロジェクトにsettings.local.jsonがありhooksがない | プロジェクト設定にもhooksを追加          |
| Slackのみ来ない           | Webhook URLが未設定または無効                      | URLを確認して再設定                      |
| 音が鳴らない              | macOS以外のOS                                      | Linuxの場合は`paplay`等に変更            |
| Cursor/VSCodeで動作しない | 既知のバグ（Issue #11156）                         | Stopフックは動作、Notificationは修正待ち |

### 11.8 プロジェクト固有設定

プロジェクトに`.claude/settings.local.json`がある場合、hooksを含める必要があります：

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/[username]/.claude/slack-notify.sh"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "permission_prompt|idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/[username]/.claude/slack-notify.sh"
          }
        ]
      }
    ]
  },
  "permissions": {
    // 既存の権限設定
  }
}
```

## 12. セキュリティ仕様

### 12.1 多層防御アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│ GitHub サーバー側防御                                │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Secret Scanning       : push済みコードから      │ │
│ │                         トークン/鍵を自動検出   │ │
│ │ Push Protection       : 秘密情報を含むpushを    │ │
│ │                         GitHub側でブロック       │ │
│ │ Dependabotアラート    : 依存パッケージの         │ │
│ │                         脆弱性を自動通知         │ │
│ │ Dependabot自動修正    : 脆弱性修正PRを自動作成   │ │
│ │ ブランチ保護          : mainへのforce push/      │ │
│ │                         削除をブロック           │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│ ローカル防御（開発マシン）                           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ gitleaks pre-commit   : コミット時にステージング │ │
│ │                         ファイルの秘密情報を検出 │ │
│ │ .gitignore            : 既知の危険ファイルを     │ │
│ │                         包括的に除外             │ │
│ │ ~/.gitignore_global   : 全プロジェクト共通の     │ │
│ │                         OS/IDE/鍵ファイル除外    │ │
│ │ 設定ファイル保護      : tsconfig等の変更を       │ │
│ │                         チェックサムで検出       │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 12.2 .gitignore除外カテゴリ

| カテゴリ          | 除外パターン                                                                              | 目的                        |
| ----------------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| **環境変数**      | `.env`, `.env.*`（`!.env.example`, `!.env.ci`で例外）                                     | APIキー・パスワード流出防止 |
| **SSH/秘密鍵**    | `id_rsa`, `id_ed25519`, `id_dsa`, `id_ecdsa`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks` | サーバーアクセス権の保護    |
| **証明書**        | `*.crt`, `*.cer`, `*.der`, `*.csr`                                                        | SSL証明書の保護             |
| **クラウド認証**  | `credentials.csv`, `*-service-account.json`, `.aws/`, `.gcp/`, `.azure/`                  | クラウド認証情報の保護      |
| **トークン/秘密** | `*.secret`, `*.secrets`, `.npmrc`, `.pypirc`, `.netrc`, `.htpasswd`                       | 各種トークンの保護          |
| **データベース**  | `*.sqlite`, `*.sqlite3`, `*.db`, `dump.sql`, `*.dump`, `*.sql.gz`, `*.sql.bak`            | 個人情報・本番データの保護  |
| **ログ**          | `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `pnpm-debug.log*`                           | ログ内秘密情報の保護        |
| **OS生成**        | `.DS_Store`, `Thumbs.db`, `Desktop.ini`, `._*`, `$RECYCLE.BIN/`                           | ノイズ除去                  |
| **IDE**           | `.vscode/`, `.idea/`, `*.swp`, `*.swo`, `*~`                                              | 個人設定の除外              |
| **個人メモ**      | `note.txt`, `memo.txt`, `todo.md`, `scratch.*`                                            | うっかり共有防止            |

### 12.3 gitleaks（シークレットスキャンツール）

| 項目               | 値                                      |
| ------------------ | --------------------------------------- |
| **バージョン**     | 8.30.0                                  |
| **実行タイミング** | pre-commit（コミット前に自動実行）      |
| **スキャン対象**   | ステージングされたファイルのみ          |
| **検出エンジン**   | 正規表現ベースのパターンマッチ          |
| **インストール**   | `brew install gitleaks`                 |
| **誤検知対応**     | `.gitleaksignore`ファイルで除外指定可能 |

**未インストール時の動作:** 警告メッセージを表示するが、コミットはブロックしない（友人がgitleaksをインストールしていなくても開発可能）。

### 12.4 GitHub側セキュリティ設定

#### 12.4.1 visibility別の適用範囲

セットアップスクリプト（`scripts/setup.js`）は、リポジトリのvisibilityを `gh repo view --json visibility` で事前判定し、GitHubプランの制限に応じて適用する機能を自動的に分岐する。

| 機能                   | publicリポジトリ | privateリポジトリ（Free） | 必要プラン                 |
| ---------------------- | ---------------- | ------------------------- | -------------------------- |
| **Secret Scanning**    | ✅ 有効化        | ⏭️ スキップ（理由表示）   | GitHub Advanced Security   |
| **Push Protection**    | ✅ 有効化        | ⏭️ スキップ（理由表示）   | GitHub Advanced Security   |
| **Dependabot自動修正** | ✅ 有効化        | ⏭️ スキップ（理由表示）   | GitHub Advanced Security   |
| **Dependabotアラート** | ✅ 有効化        | ✅ 有効化                 | Free（public/private共通） |
| **ブランチ保護**       | ✅ 有効化        | ⏭️ スキップ（理由表示）   | GitHub Pro以上             |

#### 12.4.2 判定ロジック（setup.js内）

```javascript
// 1. リポジトリのvisibilityを取得
const visibility = execSync('gh repo view --json visibility --jq .visibility', {
  stdio: 'pipe',
  encoding: 'utf8',
})
  .trim()
  .toUpperCase()
const isPrivate = visibility === 'PRIVATE'

// 2. privateの場合: スキップ理由を表示し、API呼び出しをスキップ
if (isPrivate) {
  log.info('privateリポジトリを検出しました')
  log.info(
    'Secret Scanning / Push Protection: GitHub Advanced Security（Enterprise）が必要なためスキップ'
  )
  log.info('ブランチ保護: GitHub Pro以上のプランが必要なためスキップ')
}

// 3. Secret Scanning / Push Protection / Dependabot自動修正: publicのみ実行
if (!isPrivate) {
  /* gh api repos/{owner}/{repo} -X PATCH ... */
}

// 4. Dependabotアラート: public/private共通で実行
execSync(`gh api repos/${repoInfo}/vulnerability-alerts -X PUT`, { stdio: 'pipe' })

// 5. ブランチ保護: publicのみ実行
if (!isPrivate) {
  /* gh api repos/{owner}/{repo}/branches/{branch}/protection -X PUT ... */
}
```

#### 12.4.3 privateリポジトリでの出力例

```
ℹ リポジトリ: TheLunarRock/x-postpilot
ℹ privateリポジトリを検出しました
ℹ Secret Scanning / Push Protection: GitHub Advanced Security（Enterprise）が必要なためスキップ
ℹ ブランチ保護: GitHub Pro以上のプランが必要なためスキップ
✓ Dependabotアラート を有効化しました
```

#### 12.4.4 publicリポジトリでの出力例

```
ℹ リポジトリ: TheLunarRock/template-v3.0
✓ Secret Scanning を有効化しました
✓ Push Protection を有効化しました
✓ Dependabot自動修正 を有効化しました
✓ Dependabotアラート を有効化しました
✓ mainブランチ保護を設定しました（force push/削除禁止）
```

#### 12.4.5 セットアップ完了サマリーの分岐

`securityResults`オブジェクトに`isPrivateRepo`フラグを含め、完了サマリーの表示内容を分岐する。

```javascript
const securityResults = {
  gitleaks: false,
  ghCli: false,
  globalGitignore: false,
  githubSettings: false,
  isPrivateRepo: false, // visibility判定結果
}
```

| 条件           | サマリー表示                                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public + 成功  | `GitHub Secret Scanning / Push Protection`, `Dependabot自動修正`, `ブランチ保護 (force push/削除禁止)`                                                                 |
| private + 成功 | `Dependabotアラート`, `Secret Scanning / Push Protection: スキップ（privateリポジトリ - Enterprise必要）`, `ブランチ保護: スキップ（privateリポジトリ - Pro以上必要）` |
| 未認証/失敗    | `GitHub側セキュリティ設定が未完了（gh auth login後に再実行）`                                                                                                          |

#### 12.4.6 機能詳細

| 機能                   | 説明                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **Secret Scanning**    | push済みコードからAPIキー・トークン等を自動検出。GitHubが200以上のサービスパターンを監視 |
| **Push Protection**    | 秘密情報を含むpushをGitHub側でブロック。gitleaksのサーバー版として機能                   |
| **Dependabotアラート** | 依存パッケージの脆弱性を自動検出し通知。CVEデータベースと照合                            |
| **Dependabot自動修正** | 修正パッチがある場合、PRを自動作成                                                       |
| **ブランチ保護**       | mainへのforce push禁止、ブランチ削除禁止。通常pushは許可                                 |

#### 12.4.7 設計判断（2026-03-15）

| 項目                                    | 判断 | 理由                                                            |
| --------------------------------------- | ---- | --------------------------------------------------------------- |
| **visibility事前判定**                  | 採用 | API呼び出し→失敗→曖昧な警告を排除。原因を明確にユーザーに伝える |
| **privateでもDependabotアラート有効化** | 採用 | Free planのprivateリポジトリでも利用可能な唯一のセキュリティAPI |
| **privateでの警告→情報表示に変更**      | 採用 | `⚠`（問題あり）ではなく`ℹ`（プラン制限の説明）が適切            |
| **API呼び出し自体をスキップ**           | 採用 | 失敗するAPIを呼ばないことで実行速度も向上                       |

### 12.5 ブランチ保護ルール（main）

| ルール                     | 設定 | 理由                                                |
| -------------------------- | ---- | --------------------------------------------------- |
| **Force push**             | 禁止 | 履歴の破壊を防止                                    |
| **ブランチ削除**           | 禁止 | mainの誤削除を防止                                  |
| **PR必須**                 | 不要 | 個人/少人数開発では過剰。ワークフローの軽量性を維持 |
| **ステータスチェック必須** | 不要 | CI設定済みだが、個人開発のため強制しない            |
| **管理者への強制**         | 無効 | オーナー自身の柔軟性を維持                          |

### 12.6 グローバルgitignore（~/.gitignore_global）

全プロジェクト共通で適用されるセーフティネット。

```bash
# 設定コマンド
git config --global core.excludesfile ~/.gitignore_global
```

**除外対象:**

- OS生成ファイル（`.DS_Store`, `Thumbs.db`, `._*`等）
- IDE設定（`.vscode/`, `.idea/`, `*.swp`等）
- SSH鍵（`id_rsa`, `id_ed25519`, `*.pem`, `*.key`）

### 12.7 全リポジトリ一括セキュリティ管理

テンプレートリポジトリだけでなく、同一アカウント上の全リポジトリに対してセキュリティを一括適用するスクリプトを提供。

#### 12.7.1 診断スクリプト（security-scan-all.sh）

| 項目             | 値                                                             |
| ---------------- | -------------------------------------------------------------- |
| **コマンド**     | `pnpm security:scan-all`                                       |
| **スクリプト**   | `scripts/security-scan-all.sh`                                 |
| **対象**         | `~/Documents/GitHub/` 配下の全gitリポジトリ                    |
| **ツール**       | gitleaks（`--no-color`でANSI除去、位置引数でディレクトリ指定） |
| **公開リポ判定** | `gh repo list --public` と照合して `[PUBLIC]`/`[private]` 表示 |
| **出力**         | ターミナル（色付き）＋レポートファイル（タイムスタンプ付き）   |
| **安全性**       | 読み取り専用。コードは一切変更しない                           |

**レポート出力先:** `~/Documents/GitHub/security-scan-report-YYYYMMDD-HHMMSS.txt`

#### 12.7.2 一括設定スクリプト（security-setup-all.sh）

| 項目           | 値                                                     |
| -------------- | ------------------------------------------------------ |
| **コマンド**   | `pnpm security:setup-all`                              |
| **スクリプト** | `scripts/security-setup-all.sh`                        |
| **前提条件**   | GitHub CLI（`gh`）インストール済み・認証済み           |
| **対象**       | アカウント上の全リポジトリ（アーカイブ済みは自動除外） |

**3段階フェーズ方式（各段階で対話的に確認）:**

| フェーズ | 内容                                            | リスク | 確認      |
| -------- | ----------------------------------------------- | ------ | --------- |
| **1**    | Secret Scanning + Dependabotアラート + 自動修正 | なし   | Y/n       |
| **2**    | Push Protection（秘密情報pushブロック）         | 低     | Y/n       |
| **3**    | ブランチ保護（force push/削除禁止）             | 中     | 1/2/3選択 |

**フェーズ3の選択肢:**

1. 公開リポジトリのみ（推奨）
2. 全リポジトリ
3. スキップ

#### 12.7.3 スキャン実績（2026-02-18実施）

| 項目                         | 結果                                          |
| ---------------------------- | --------------------------------------------- |
| **スキャン対象**             | 47リポジトリ                                  |
| **クリーン**                 | 28                                            |
| **秘密情報検出**             | 19（大半は誤検知：チェックサム・V8定数等）    |
| **公開リポの実漏洩**         | 0（2件検出はいずれも誤検知と確認済み）        |
| **プライベートリポの実漏洩** | 2件（OpenAI APIキー、GCP APIキー→無効化済み） |

### 12.8 リポジトリ公開設定

| 公開状態    | リポジトリ       | 理由                               |
| ----------- | ---------------- | ---------------------------------- |
| **public**  | template-v3.0    | 友人向けテンプレートとして公開必要 |
| **private** | その他全て（44） | 不要な公開リスクを排除             |

**変更履歴（2026-02-18）:**
以下の7リポジトリをpublic → privateに変更:
`hi-and-low-game`, `investment-strategies`, `hatena.bookmark-mirror`, `template-v2.0`, `nextjs-starter-template-v1.1`, `claude-code-base-action`, `claude-code-action`

### 12.9 既知の残存脆弱性

| パッケージ                     | 深刻度   | 状態                 | 影響                                   |
| ------------------------------ | -------- | -------------------- | -------------------------------------- |
| `ajv@6.12.6`（eslint間接依存） | moderate | 対処不可（上流待ち） | ランタイム影響なし。開発ツール内部のみ |

### 12.10 Claude Code denyルール（破壊的操作・秘密情報保護）

Claude Codeのツール実行に対して、破壊的操作と秘密情報へのアクセスをdenyルールで防止する。
denyルールはallow/askより優先されるため、allowに含まれるパターンでもdenyに該当すればブロックされる。

**評価優先順位:** `deny` → `ask` → `allow`

**設定ファイル:** `.claude/settings.json` の `permissions.deny`

#### 12.10.1 システム破壊防止

| denyルール                | 防止する操作                 | 補足                            |
| ------------------------- | ---------------------------- | ------------------------------- |
| `Bash(rm -rf /)`          | ルートディレクトリの全削除   | `rm src/old/`等の通常削除は許可 |
| `Bash(rm -rf /*)`         | ルート直下の全削除           | 同上                            |
| `Bash(rm -rf ~)`          | ホームディレクトリの全削除   | 同上                            |
| `Bash(rm -rf ~/*)`        | ホーム直下の全削除           | 同上                            |
| `Bash(chmod 777 *)`       | 全ファイルをworld-writable化 | `chmod +x script.sh`等は許可    |
| `Bash(mkfs*)`             | ディスクのフォーマット       | 開発で使用する場面なし          |
| `Bash(dd if=* of=/dev/*)` | デバイスへの直接書き込み     | 同上                            |
| `Bash(> /dev/sda*)`       | ディスクの上書き             | 同上                            |

#### 12.10.2 Git保護

| denyルール                             | 防止する操作                 | 補足                               |
| -------------------------------------- | ---------------------------- | ---------------------------------- |
| `Bash(git push --force origin main)`   | mainブランチへのforce push   | feature branchへのforce pushは許可 |
| `Bash(git push --force origin master)` | masterブランチへのforce push | GitHub側のブランチ保護との二重防御 |

#### 12.10.3 秘密情報読み取り防止

| denyルール               | 防止する操作                    | 補足                            |
| ------------------------ | ------------------------------- | ------------------------------- |
| `Read(**/*.pem)`         | SSL/TLS証明書・秘密鍵の読み取り | Vercelデプロイ前提で不要        |
| `Read(**/*.key)`         | 秘密鍵ファイルの読み取り        | 同上                            |
| `Read(**/*credentials*)` | 認証情報ファイルの読み取り      | AWS/GCP等のcredentialsファイル  |
| `Read(~/.ssh/*)`         | SSH鍵の読み取り                 | Claude Codeが読む正当な理由なし |
| `Read(~/.aws/*)`         | AWS認証情報の読み取り           | 同上                            |

#### 12.10.4 denyルールの解除方法

個人的に特定のdenyルールを解除する必要がある場合、`.claude/settings.local.json`（Git管理外）でoverride可能。

```json
// .claude/settings.local.json（例: .pemファイルの読み取りを許可）
{
  "permissions": {
    "allow": ["Read(**/*.pem)"]
  }
}
```

#### 12.10.5 設計判断（2026-03-15）

| 項目                         | 判断   | 理由                                                        |
| ---------------------------- | ------ | ----------------------------------------------------------- |
| **サンドボックス**           | 不採用 | MCPサーバー（Serena、Morphllm等）との互換性問題リスクが高い |
| **ネットワーク制限**         | 不採用 | MCPサーバー・WebFetchの多様なドメインアクセスを制限できない |
| **bypass permissions無効化** | 不採用 | Managed Settings専用機能。個人開発では効果なし              |
| **開発コンテナ**             | 不採用 | セットアップコストが高く、MCP連携が複雑化                   |
| **denyルール**               | 採用   | 既存のallow設定と共存可能。日常開発に影響なし               |
| **秘密情報Read禁止**         | 採用   | Vercelデプロイ前提でSSL証明書の手動操作不要                 |

**参考記事:** 「2026年最新版」Claude Codeで行うべきセキュリティ設定 10選（Qiita @miruky）の10項目から、個人開発テンプレートに適した5項目を選定・実装。

### 12.11 権限モデル（公開リポジトリ: template-v3.0）

| 操作                   | 誰でも | 書き込み権限者のみ |
| ---------------------- | ------ | ------------------ |
| コードの閲覧・クローン | ○      | ○                  |
| Fork（コピー作成）     | ○      | ○                  |
| Pull Request送信       | ○      | ○                  |
| コードの直接変更       | ×      | ○                  |
| PRのマージ             | ×      | ○                  |
| 設定の変更             | ×      | ○（管理者）        |
| Force push to main     | ×      | × (保護済み)       |
| mainブランチ削除       | ×      | × (保護済み)       |

## 13. 前提条件

### 13.1 必須

- Node.js >= 20.19.0
- pnpm >= 8.0.0
- Git
- gitleaks >= 8.30.0（`brew install gitleaks`）

### 13.2 推奨（フル機能使用時）

- Claude Code CLI
- SuperClaude v4.0.8
- MCPサーバー
  - Serena（セマンティック検索）
  - Context7（ドキュメント参照）
  - Sequential-thinking（構造化分析）
  - Morphllm（高速編集）

## 14. セットアップ手順

```bash
# 1. リポジトリクローン
git clone [repository-url] my-app
cd my-app

# 2. 依存関係インストール
pnpm install

# 3. 自動セットアップ（セキュリティ含む全自動）
pnpm setup:sc
# 以下が自動実行される:
#   - gitleaksインストール（シークレットスキャン）
#   - GitHub CLIインストール + 認証ガイド
#   - グローバルgitignore設定
#   - GitHub側セキュリティ有効化（visibility自動判定）
#     publicリポ: Secret Scanning, Push Protection, Dependabot, ブランチ保護
#     privateリポ: Dependabotアラートのみ（他はプラン制限でスキップ）
#   - Claude Code通知設定（オプション）
#   - MCPサーバー設定手順の表示（セクション20参照）

# 4. MCPサーバー設定（初回のみ・手動）
# setup:sc完了後に表示される手順に従う（詳細は§20参照）
curl -LsSf https://astral.sh/uv/install.sh | sh
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
claude mcp add morphllm-fast-apply -- npx @morph-llm/morph-fast-apply /home/
claude mcp list  # 接続確認

# 5. 環境変数設定
cp .env.example .env.local
# .env.localを編集

# 6. 開発サーバー起動
pnpm dev

# ブラウザで http://localhost:3000 を開く
```

## 15. デプロイ

### 15.1 Vercel（推奨）

```bash
# Vercel CLIでデプロイ
vercel

# または GitHub連携で自動デプロイ
```

### 15.2 ビルド設定

| 設定             | 値             |
| ---------------- | -------------- |
| Build Command    | `pnpm build`   |
| Output Directory | `.next`        |
| Install Command  | `pnpm install` |
| Node.js Version  | 20.x           |

## 16. パフォーマンス指標

| 指標          | 目標値  | 現在値  |
| ------------- | ------- | ------- |
| First Load JS | < 150KB | 102KB   |
| ビルド時間    | < 5秒   | ~2秒    |
| 境界チェック  | < 500ms | < 100ms |
| テスト実行    | < 10秒  | ~1秒    |

## 17. 品質基準

### 17.1 TypeScript品質（97%モード）

- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

### 17.2 テストカバレッジ

- グローバル: 90%以上
- フィーチャー単位: 95%以上

### 17.3 コード品質

- ESLint 9 flat config
- Prettier統合
- 境界違反ゼロトレランス

## 18. 既知の問題

### 18.1 Chrome 146 + GitHub Desktop プロトコルハンドラ問題（2026-03-15）

| 項目           | 内容                                                                   |
| -------------- | ---------------------------------------------------------------------- |
| **ステータス** | 未解決（Chromium Issue #492668894 として報告済み）                     |
| **影響**       | GitHubリポジトリページの「Open with GitHub Desktop」ボタンが動作しない |
| **原因**       | Chrome 146がウェブサイトのJavaScriptからの外部プロトコル起動をブロック |
| **影響範囲**   | Chrome 146 + macOS Tahoe 26.x 環境。テンプレート機能自体には影響なし   |

#### 症状

- GitHubでリポジトリの「Code」→「Open with GitHub Desktop」を押しても何も起きない
- 「Launching GitHub Desktop」のメッセージは表示されるがアプリは起動しない

#### 技術的詳細

| テスト方法                                    | 結果                             |
| --------------------------------------------- | -------------------------------- |
| ターミナルから `open "x-github-client://..."` | 動作する                         |
| Chromeアドレスバーに直接URL入力               | ダイアログ表示→動作する          |
| HTMLページの直接 `<a href>` リンククリック    | ダイアログ表示→動作する          |
| GitHub.comのJavaScript経由                    | **動作しない（ブロックされる）** |

- `AutoLaunchProtocolsFromOrigins` ポリシーが設定済みだが、Chrome 146で機能しなくなった
- Chrome 146への自動更新がトリガー（更新前は正常動作）
- シークレットモードでも同様（拡張機能は原因ではない）
- macOS側のプロトコルハンドラ登録は正常

#### 回避策

GitHub Desktopから直接クローンする：

1. GitHub Desktopを開く
2. 「File」→「Clone Repository...」
3. 「GitHub.com」タブまたは「URL」タブでリポジトリを検索
4. 「Clone」をクリック

#### 解決見込み

Chrome側のバグ修正待ち。修正後、既存の `AutoLaunchProtocolsFromOrigins` ポリシーにより自動復旧する見込み。

## 19. Stitch MCP（UIデザイン・プロトタイピング）

### 19.1 概要

| 項目                   | 内容                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MCPサーバー名**      | stitch                                                                                                                                           |
| **用途**               | テキストからUIデザインを生成するプロトタイピングツール                                                                                           |
| **プロジェクトタイプ** | TEXT_TO_UI_PRO                                                                                                                                   |
| **対象デバイス**       | MOBILE（モバイルファースト）                                                                                                                     |
| **利用可能ツール**     | `list_projects`, `get_project`, `get_screen`, `list_screens`, `create_project`, `generate_screen_from_text`, `edit_screens`, `generate_variants` |

### 19.2 プロジェクト一覧（2026-03-23時点）

| #   | プロジェクト名                    | プロジェクトID                  | プライマリカラー | デザインコンセプト    |
| --- | --------------------------------- | ------------------------------- | ---------------- | --------------------- |
| 1   | **akippa Landing Page (English)** | `projects/9436432821650716262`  | #1BB994 (Teal)   | "The Urban Concierge" |
| 2   | **Portfolio Landing Page**        | `projects/14012660230380919229` | #2C5282 (Blue)   | "The Curated Gallery" |

### 19.3 プロジェクト詳細仕様

#### 19.3.1 akippa Landing Page (English)

| 項目                     | 値                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **コンセプト**           | "The Urban Concierge" — 駐車場予約サービスをハイエンド・エディトリアル体験として提示 |
| **カラーモード**         | LIGHT                                                                                |
| **カラーバリアント**     | FIDELITY                                                                             |
| **丸み**                 | ROUND_EIGHT（角丸8段階）                                                             |
| **スペーシングスケール** | 2                                                                                    |
| **作成日**               | 2026-03-22                                                                           |
| **公開設定**             | PRIVATE                                                                              |

**タイポグラフィ:**

| 用途   | フォント | 詳細                                                       |
| ------ | -------- | ---------------------------------------------------------- |
| 見出し | Inter    | 700ウェイト、3.5rem（Display）、タイトなレタースペーシング |
| 本文   | Inter    | 400ウェイト、1rem、行間1.6                                 |
| ラベル | Inter    | 600ウェイト、0.75rem、メタデータ・タグ用                   |

**カラーパレット:**

| トークン                 | カラーコード | 用途                              |
| ------------------------ | ------------ | --------------------------------- |
| `primary`                | #006b54      | 深いアクションステート            |
| `primary_container`      | #1bb994      | ブランドシグネチャーティール      |
| `secondary`              | #645b6e      | セカンダリ要素                    |
| `secondary_container`    | #ebdef6      | セカンダリコンテナ                |
| `tertiary`               | #735c00      | ゴールドアクセント                |
| `tertiary_container`     | #c5a018      | ターシャリコンテナ                |
| `surface`                | #fcf9f8      | ウォームプレミアムホワイト背景    |
| `surface_container_low`  | #f6f3f2      | セクション分割用                  |
| `surface_container_high` | #eae7e7      | ネスト要素用                      |
| `on_surface`             | #1b1c1c      | テキストカラー（#000000使用禁止） |
| `error`                  | #ba1a1a      | エラー表示                        |
| `outline`                | #6c7a74      | アウトライン                      |
| `outline_variant`        | #bbcac2      | ゴーストボーダー用（15%不透明度） |

**デザインルール:**

| ルール               | 説明                                                                            |
| -------------------- | ------------------------------------------------------------------------------- |
| No-Lineルール        | 1pxボーダーによるセクション分割禁止。背景色のシフトのみで境界を定義             |
| Glass & Gradient     | プライマリCTAは`primary`→`primary_container`の135度グラデーション               |
| Glassmorphism        | フローティング要素は`surface_container_lowest`@80%不透明度 + 20px backdrop-blur |
| ゴーストボーダー     | アクセシビリティ用ボーダーは`outline_variant`@15%不透明度                       |
| トーナルレイヤリング | 影ではなく背景色の階層で深度を表現                                              |
| アンビエントシャドウ | フローティング要素のみ: `on_surface`@4%不透明度、40px blur、12px Y-offset       |

**スクリーン構成:**

| スクリーンID                              | サイズ     | タイプ                       |
| ----------------------------------------- | ---------- | ---------------------------- |
| `8a34be912bfe44d8882656b8ec3adc7c`        | 390×6950px | メインランディングページ     |
| `assets-e494db7946054bf9a890163c880f057a` | 960×540px  | デザインシステムインスタンス |

**コンポーネント仕様:**

| コンポーネント               | スタイル           | 詳細                                                                   |
| ---------------------------- | ------------------ | ---------------------------------------------------------------------- |
| 検索バー                     | Glassmorphic       | `surface_container_lowest`@80%、角丸24px（xl）。フォーカス時にblur増加 |
| カテゴリボタン               | Pill型（full丸み） | デフォルト: `surface_container_high`、アクティブ: `primary_container`  |
| バリュープロポジションカード | フラット           | `surface_container_lowest`、影なし、内部パディング`spacing-8`（2rem）  |
| プライマリボタン             | グラデーション     | `primary`→`primary_container`、`on_primary`テキスト、xl丸み            |
| セカンダリボタン             | ゴーストボーダー   | 透明背景 + `primary`の2pxボーダー                                      |
| フッター                     | アンカー型         | `surface_container_highest`背景、4カラムレイアウト、ラベルmd           |

#### 19.3.2 Portfolio Landing Page

| 項目                     | 値                                                                     |
| ------------------------ | ---------------------------------------------------------------------- |
| **コンセプト**           | "The Curated Gallery" — エディトリアル・ハイエンドなポートフォリオ展示 |
| **カラーモード**         | LIGHT                                                                  |
| **カラーバリアント**     | FIDELITY                                                               |
| **丸み**                 | ROUND_FOUR（角丸4段階）                                                |
| **スペーシングスケール** | 3                                                                      |
| **作成日**               | 2026-03-22                                                             |
| **公開設定**             | PRIVATE                                                                |

**タイポグラフィ:**

| 用途                       | フォント  | 詳細                                                   |
| -------------------------- | --------- | ------------------------------------------------------ |
| 見出し（Display/Headline） | Manrope   | レタースペーシング-0.02em、タイトなロックアップ感      |
| 本文                       | Work Sans | 1rem、行間1.6、高い可読性                              |
| ラベル                     | Work Sans | 大文字、レタースペーシング0.05em、`tertiary`カラー使用 |

**カラーパレット:**

| トークン                   | カラーコード | 用途                                   |
| -------------------------- | ------------ | -------------------------------------- |
| `primary`                  | #0e3b69      | ディープアクション（Trustworthy Blue） |
| `primary_container`        | #2c5282      | コンテナ・グラデーション終点           |
| `secondary`                | #545f72      | セカンダリ要素                         |
| `secondary_container`      | #d5e0f7      | セカンダリコンテナ                     |
| `tertiary`                 | #632800      | ウォームオレンジ（発見・喜びの瞬間用） |
| `tertiary_container`       | #873a00      | ターシャリコンテナ                     |
| `surface`                  | #f7fafc      | ベースレイヤー                         |
| `surface_container_low`    | #f1f4f6      | 大型コンテンツエリア                   |
| `surface_container_lowest` | #ffffff      | プライマリカード・フローティングナビ   |
| `on_surface`               | #181c1e      | テキストカラー（#000000使用禁止）      |
| `error`                    | #ba1a1a      | エラー表示                             |
| `outline`                  | #737780      | アウトライン                           |
| `outline_variant`          | #c3c6d0      | ゴーストボーダー用（20%不透明度）      |

**デザインルール:**

| ルール                 | 説明                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| No-Lineルール          | 1pxボーダー禁止。`surface`→`surface_container_low`のカラーシフトで分割 |
| 意図的な非対称         | スタッガード配置とハンギングタイポグラフィで手作り感を演出             |
| 大気的ホワイトスペース | Scale 16/20のジェネラスパディングで自信とプレミアム感を表現            |
| Glass & Gradient       | CTAは`primary`→`primary_container`の135度グラデーション                |
| Glassmorphism          | `surface`@80%不透明度 + 12px backdrop-blur                             |
| ゴーストボーダー       | `outline_variant`@20%不透明度（100%不透明ボーダー禁止）                |
| アンビエントシャドウ   | `on_surface`@6%不透明度、32px blur、16px Y-offset                      |

**スクリーン構成:**

| スクリーンID                              | サイズ     | タイプ                       |
| ----------------------------------------- | ---------- | ---------------------------- |
| `34b7c3338211401bb9b23cd5b1dea99d`        | 390×7971px | メインランディングページ     |
| `assets-7b6b56a4fca24f3e8969f7e2317fef2a` | 960×540px  | デザインシステムインスタンス |

**コンポーネント仕様:**

| コンポーネント         | スタイル          | 詳細                                                             |
| ---------------------- | ----------------- | ---------------------------------------------------------------- |
| プライマリボタン       | グラデーション    | `primary`→`primary_container`、`on_primary`テキスト、full丸み    |
| セカンダリボタン       | フラット          | `secondary_container`背景、ボーダーなし                          |
| ターシャリボタン       | ゴースト          | 背景なし、`primary`テキスト、ホバーで`surface_container_high`    |
| カード                 | ボーダーレス      | 区切り線禁止、Spacing Scale 8で画像とテキスト分離                |
| 画像                   | 角丸lg（0.5rem）  | `surface_variant`プレースホルダー色                              |
| 入力フィールド         | ゴーストボーダー  | `surface_container_lowest`背景、フォーカスで`primary`ボーダー    |
| コンテキストチップ     | タグ型            | `tertiary_fixed`背景 + `on_tertiary_fixed_variant`テキスト       |
| フローティング進捗ナビ | Glassmorphic Pill | `surface`@80%不透明度、スクロール追跡、`primary`プログレスライン |

### 19.4 Stitch MCPツール仕様

| ツール                      | 用途                   | パラメータ                                          |
| --------------------------- | ---------------------- | --------------------------------------------------- |
| `list_projects`             | プロジェクト一覧取得   | `filter`: `view=owned`（デフォルト）/ `view=shared` |
| `get_project`               | プロジェクト詳細取得   | `name`: プロジェクトリソース名                      |
| `list_screens`              | スクリーン一覧取得     | `parent`: プロジェクトリソース名                    |
| `get_screen`                | スクリーン詳細取得     | `name`: スクリーンリソース名                        |
| `create_project`            | 新規プロジェクト作成   | プロジェクト設定                                    |
| `generate_screen_from_text` | テキストからUI生成     | テキスト説明                                        |
| `edit_screens`              | スクリーン編集         | 編集指示                                            |
| `generate_variants`         | デザインバリアント生成 | バリアント設定                                      |

### 19.5 共通デザイン原則（全Stitchプロジェクト共通）

| 原則                       | 説明                                                    |
| -------------------------- | ------------------------------------------------------- |
| **No-Lineルール**          | 1pxボーダーによるセクション分割禁止。背景色シフトのみ   |
| **Glass & Gradientルール** | CTAにはプライマリカラーのグラデーション + Glassmorphism |
| **#000000禁止**            | 純黒テキスト禁止。`on_surface`トークンを使用            |
| **トーナルレイヤリング**   | ドロップシャドウではなく背景色階層で深度表現            |
| **ゴーストボーダー**       | ボーダー必要時は`outline_variant`@15-20%不透明度のみ    |
| **モバイルファースト**     | 全プロジェクトはMOBILE（390px幅）で設計                 |
| **FIDELITY配色**           | Material Design 3のFIDELITYバリアントを採用             |

## 20. MCPサーバーセットアップ

### 20.1 概要

SuperClaudeテンプレートはClaude CodeのMCPサーバーを活用して開発体験を最大化する。MCPサーバーはユーザーレベルで設定されるため、テンプレートをクローンした各PC上で初回のみ手動設定が必要。

`pnpm setup:sc`の完了メッセージ（Step 7）にセットアップ手順が表示される。

### 20.2 前提条件

| 前提ツール     | 用途                     | インストール方法                                   |
| -------------- | ------------------------ | -------------------------------------------------- |
| **Node.js**    | npx経由のMCPサーバー実行 | `nvm install --lts` または公式サイトから           |
| **uv**         | Serena MCPサーバー実行   | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **Claude CLI** | MCPサーバー登録・管理    | `npm install -g @anthropic-ai/claude-code`         |

### 20.3 MCPサーバー一覧と設定コマンド

#### 20.3.1 必須MCPサーバー（4サーバー）

| MCPサーバー             | 用途                                 | 設定コマンド                                                                                       |
| ----------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **Serena**              | プロジェクト記憶・セマンティック検索 | `claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server` |
| **Context7**            | 公式ライブラリドキュメント参照       | `claude mcp add context7 -- npx -y @upstash/context7-mcp@latest`                                   |
| **Sequential-thinking** | 構造化思考・複雑な分析               | `claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking`    |
| **Morphllm-fast-apply** | 高速ファイル操作・パターン編集       | `claude mcp add morphllm-fast-apply -- npx @morph-llm/morph-fast-apply /home/`                     |

#### 20.3.2 任意MCPサーバー（用途に応じて追加）

| MCPサーバー    | 用途                         | 設定コマンド                                                             | 備考                                  |
| -------------- | ---------------------------- | ------------------------------------------------------------------------ | ------------------------------------- |
| **Supabase**   | DB管理・認証・Edge Functions | `claude mcp add supabase -- npx -y @supabase/mcp-server-supabase@latest` | 環境変数`SUPABASE_ACCESS_TOKEN`が必要 |
| **Stitch**     | UIデザイン・プロトタイピング | `claude mcp add stitch -- npx @_davideast/stitch-mcp proxy`              | Google認証が必要                      |
| **Magic**      | 21st.devコンポーネント生成   | `claude mcp add magic -- npx -y @21st-dev/magic@latest`                  | APIキーが必要な場合あり               |
| **Playwright** | ブラウザ自動化・E2Eテスト    | `claude mcp add playwright -- npx @playwright/mcp@latest`                | テスト用途のみ                        |

### 20.4 セットアップ手順

```bash
# Step 1: uv をインストール（Serenaに必要）
curl -LsSf https://astral.sh/uv/install.sh | sh

# Step 2: 必須MCPサーバーを一括登録
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
claude mcp add morphllm-fast-apply -- npx @morph-llm/morph-fast-apply /home/

# Step 3: 設定確認
claude mcp list
# 全サーバーが「✓ Connected」と表示されれば成功
```

### 20.5 設定ファイルの保存先

MCPサーバーの設定は以下の場所に保存される。

| ファイル                                | 内容                                | 備考                                           |
| --------------------------------------- | ----------------------------------- | ---------------------------------------------- |
| `~/.claude/settings.json`               | MCPサーバー接続定義（`mcpServers`） | `claude mcp add`で自動追加される               |
| `.claude/settings.json`（プロジェクト） | MCPツール使用許可（`permissions`）  | テンプレートに同梱済み。Serena等の全ツール許可 |
| `.serena/project.yml`                   | Serenaプロジェクト設定              | テンプレートに同梱済み（TypeScript / LSP）     |
| `.serena/memories/`                     | Serenaメモリファイル群              | セッション間で永続化される作業記録             |

### 20.6 トラブルシューティング

| 症状                                 | 原因                                | 解決策                                                              |
| ------------------------------------ | ----------------------------------- | ------------------------------------------------------------------- |
| `serena: ✗ Failed to connect`        | `uv`/`uvx`が未インストール          | `curl -LsSf https://astral.sh/uv/install.sh \| sh` を実行           |
| `serena: ✗ Failed to connect`        | シェル再起動が必要                  | `source ~/.zshrc` またはターミナル再起動                            |
| `mcp__serena__*`ツールが表示されない | MCPサーバーが未登録                 | `claude mcp add serena ...` を実行                                  |
| Serenaメモリが空                     | 初回クローンのため正常              | `.serena/memories/`は使用開始後に蓄積される                         |
| `morphllm: ✗ Failed`                 | npxのキャッシュ問題                 | `npx --clear-cache` 後に再度`claude mcp list`                       |
| 全MCPが`Failed`                      | Claude CLIのバージョンが古い        | `npm update -g @anthropic-ai/claude-code`                           |
| `permission denied`エラー            | `.claude/settings.json`に許可がない | テンプレートの`settings.json`に全ツール許可済み。ファイル破損を確認 |

### 20.7 setup.js完了メッセージでの表示

`pnpm setup:sc`実行後のStep 7完了レポートに以下が表示される。

```
🚀 次のステップ:
  ...
5. MCPサーバー設定（初回のみ）:
   Serena（プロジェクト記憶・セマンティック検索）の設定:
   # 前提: uv をインストール（Serenaに必要）
   curl -LsSf https://astral.sh/uv/install.sh | sh
   # Serena MCPサーバーを追加
   claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server

   その他の推奨MCPサーバー:
   claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
   claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
   claude mcp add morphllm-fast-apply -- npx @morph-llm/morph-fast-apply /home/

   設定確認: claude mcp list
```

## 21. SuperClaudeコンテキストバンドリング

### 21.1 概要

SuperClaudeのコンテキストファイル群をテンプレートに同梱し、クローンした時点でSuperClaude機能が利用可能になる仕組み。

### 21.2 問題と解決

| 項目         | 内容                                                                                                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **問題**     | SuperClaudeのコンテキストファイル（FLAGS.md等）は元来 `~/.claude/` にユーザーレベルで配置されるため、テンプレートをクローンしただけでは機能しない。友人がクローンした際に手動でファイルを送る必要があった |
| **解決**     | テンプレート内の `superclaude/` ディレクトリにファイルを同梱し、CLAUDE.mdの `@` 参照で自動読み込み                                                                                                        |
| **影響範囲** | プロジェクトローカルのみ（`~/.claude/` への書き込みなし、他プロジェクトに影響なし）                                                                                                                       |
| **設計判断** | グローバル展開方式（`~/.claude/` にコピー）は他プロジェクトに影響するため不採用。プロジェクトローカル方式を採用                                                                                           |

### 21.3 ファイル構成

```
superclaude/                     # 14ファイル（約43KB）
├── FLAGS.md                     # 行動フラグ定義（--brainstorm, --think等）
├── PRINCIPLES.md                # SOLID, DRY, KISS等の設計原則
├── RULES.md                     # 詳細な行動ルール（最大14KB・最重要）
├── MCP_Context7.md              # Context7 MCP選択ガイダンス
├── MCP_Magic.md                 # Magic MCP選択ガイダンス
├── MCP_Morphllm.md              # Morphllm MCP選択ガイダンス
├── MCP_Playwright.md            # Playwright MCP選択ガイダンス
├── MCP_Sequential.md            # Sequential MCP選択ガイダンス
├── MCP_Serena.md                # Serena MCP選択ガイダンス
├── MODE_Brainstorming.md        # ブレインストーミングモード
├── MODE_Introspection.md        # 内省モード
├── MODE_Orchestration.md        # オーケストレーションモード
├── MODE_Task_Management.md      # タスク管理モード
└── MODE_Token_Efficiency.md     # トークン効率モード
```

### 21.4 各ファイルの役割詳細

#### コアフレームワーク（3ファイル）

| ファイル        | サイズ | 内容                                                                                                                                                                              |
| --------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FLAGS.md`      | 4.8KB  | `--brainstorm`, `--think`, `--think-hard`, `--ultrathink`, `--delegate`, `--validate`, `--safe-mode`, `--uc` 等のフラグ定義。トリガー条件、動作変更、フラグ優先順位ルールを含む   |
| `PRINCIPLES.md` | 2.6KB  | SOLID原則、DRY/KISS/YAGNI、システム思考、データ駆動意思決定、リスク管理、品質4象限（機能・構造・性能・セキュリティ）の定義                                                        |
| `RULES.md`      | 14.4KB | 優先度別（🔴CRITICAL/🟡IMPORTANT/🟢RECOMMENDED）の行動ルール。ワークフロー、計画効率、実装完全性、スコープ規律、コード整理、失敗調査、Git運用、ツール最適化、安全性ルール等を網羅 |

#### MCP選択ガイダンス（6ファイル）

| ファイル            | 対象MCP             | トリガーキーワード                           | 他MCPとの併用パターン                              |
| ------------------- | ------------------- | -------------------------------------------- | -------------------------------------------------- |
| `MCP_Context7.md`   | Context7            | import, require, React, Next.js等            | Sequential→分析後にContext7→パターン確認           |
| `MCP_Magic.md`      | Magic (21st.dev)    | button, form, modal, /ui, /21                | Context7→フレームワーク統合、Sequential→要件分析   |
| `MCP_Morphllm.md`   | Morphllm            | 複数ファイル編集、一括置換、スタイル強制     | Serena→セマンティック分析後にMorphllm→一括編集     |
| `MCP_Playwright.md` | Playwright          | E2Eテスト、ブラウザテスト、アクセシビリティ  | Sequential→テスト戦略→Playwright→実行              |
| `MCP_Sequential.md` | Sequential-thinking | デバッグ、設計、根本原因分析                 | Context7→公式パターン参照、Serena→プロジェクト記憶 |
| `MCP_Serena.md`     | Serena              | シンボル操作、プロジェクトメモリ、大規模解析 | Morphllm→編集実行、Sequential→アーキテクチャ分析   |

#### 行動モード（5ファイル）

| ファイル                   | モード名             | 起動トリガー                          | 行動変更                                                      |
| -------------------------- | -------------------- | ------------------------------------- | ------------------------------------------------------------- |
| `MODE_Brainstorming.md`    | ブレインストーミング | "maybe", "thinking about", 曖昧な要望 | ソクラテス対話、非推測的探索、要件ブリーフ生成                |
| `MODE_Introspection.md`    | 内省                 | 自己分析要求、エラー回復、メタ認知    | 透明性マーカー（🤔🎯⚡📊💡）、パターン検出                    |
| `MODE_Orchestration.md`    | オーケストレーション | 複数ツール操作、性能制約              | ツール選択マトリクス、リソース管理（Green/Yellow/Red）        |
| `MODE_Task_Management.md`  | タスク管理           | 3ステップ超の操作、複数ディレクトリ   | 階層管理（Plan→Phase→Task→Todo）、Serenaメモリ連携            |
| `MODE_Token_Efficiency.md` | トークン効率         | コンテキスト75%超、`--uc`フラグ       | シンボル通信（→⇒←✅❌⚠️等）、略語システム、30-50%トークン削減 |

### 21.5 読み込みメカニズム

Claude Code の `@` 参照構文により自動読み込み。パスはCLAUDE.mdの位置からの相対パスで解決される。

#### CLAUDE.md内の記述（実際のコード）

```markdown
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
```

#### `@` 参照のパス解決ルール

| 構文                    | 解決先                                   | 用途                   |
| ----------------------- | ---------------------------------------- | ---------------------- |
| `@superclaude/FLAGS.md` | `<project-root>/superclaude/FLAGS.md`    | プロジェクト内ファイル |
| `@FLAGS.md`             | `<CLAUDE.mdと同じディレクトリ>/FLAGS.md` | 同一ディレクトリ       |
| `@~/path/file.md`       | `$HOME/path/file.md`                     | ユーザーホーム         |

- パスはCLAUDE.mdがある位置からの相対パスで解決される
- サブディレクトリパスをサポート（`@subdir/file.md`）
- 再帰的インポートは最大5段階まで対応

### 21.6 クローン後の完全利用フロー

```
1. git clone <template-repo> my-app    # superclaude/ 含む全ファイルが取得される
   cd my-app

2. pnpm setup:sc                        # 開発環境セットアップ
                                         # （依存関係、テスト、CI/CD、セキュリティ等）

3. MCPサーバー登録（初回のみ・各PC上で手動）:
   curl -LsSf https://astral.sh/uv/install.sh | sh    # uv（Serena前提）
   claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server
   claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
   claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
   claude mcp add morphllm-fast-apply -- npx @morph-llm/morph-fast-apply /home/
   claude mcp list                       # 確認

4. claude                                # Claude Code起動
                                         # → CLAUDE.md読み込み
                                         # → @superclaude/*.md 14ファイル自動展開
                                         # → SuperClaude全機能が動作
```

### 21.7 既にSuperClaudeをグローバルインストール済みの環境

`~/.claude/` に同じファイルが存在する場合（テンプレート作成者本人等）：

| レイヤー     | 読み込み元                                                     | 内容                    |
| ------------ | -------------------------------------------------------------- | ----------------------- |
| グローバル   | `~/.claude/CLAUDE.md` → `@FLAGS.md` → `~/.claude/FLAGS.md`     | SuperClaudeコンテキスト |
| プロジェクト | `CLAUDE.md` → `@superclaude/FLAGS.md` → `superclaude/FLAGS.md` | 同一内容                |

両方から読み込まれるが、同一内容の重複読み込みのみで機能的な問題はない。`pnpm setup:sc` も `~/.claude/` への書き込みは一切行わない。

### 21.8 SUPERCLAUDE_FINAL.mdとの関係

| ファイル               | 役割                                  | 対象                 | 読み込み方法                          |
| ---------------------- | ------------------------------------- | -------------------- | ------------------------------------- |
| `SUPERCLAUDE_FINAL.md` | SuperClaudeの使い方概要ガイド         | 人間向けドキュメント | CLAUDE.mdからマークダウンリンクで参照 |
| `superclaude/*.md`     | Claude Codeの行動ルール・コンテキスト | Claude Code向け      | CLAUDE.mdから `@` 参照で自動読み込み  |

両方がテンプレートに同梱される。役割が異なるため両方必要。

### 21.9 ファイル更新・メンテナンス方針

| 操作                          | 手順                                                                   |
| ----------------------------- | ---------------------------------------------------------------------- |
| SuperClaudeコンテキストの更新 | `superclaude/*.md` を直接編集してコミット                              |
| グローバルとの同期            | グローバル `~/.claude/` のファイルを `superclaude/` にコピーして上書き |
| 新規モード/MCPの追加          | `superclaude/` にファイル追加 + CLAUDE.mdに `@` 参照を追記             |
| ファイル削除                  | `superclaude/` からファイル削除 + CLAUDE.mdから `@` 参照を削除         |

---

**最終更新**: 2026-03-25
**バージョン**: 2.7.0
