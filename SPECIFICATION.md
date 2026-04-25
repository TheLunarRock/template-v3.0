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

国際化が必要になった時点で `next-intl` 等のi18nライブラリを追加して拡張する設計。テンプレート段階では独自の最小実装（`src/hooks/useI18n.ts`）のみを同梱しており、外部依存ゼロ。

| 同梱物                 | 内容                                            |
| ---------------------- | ----------------------------------------------- |
| `src/hooks/useI18n.ts` | ロケール検出・切替の独自フック（ja/en・約75行） |
| `public/locales/`      | 翻訳ファイル配置先のプレースホルダー            |

**設計判断（2026-04-26）**: 当初 `next-i18next` を依存に含めていたが、実コードでは未使用で、transitive 依存の `i18next-fs-backend` が HIGH 脆弱性 (GHSA-8847-338w-5hcj) を持っていたため、関連3パッケージ（`i18next` / `react-i18next` / `next-i18next`）を全削除。i18n が必要なプロジェクトでは Next.js App Router と相性の良い `next-intl` を都度追加する想定。

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

// 開発環境のみ 'unsafe-eval' を許可（v3.7.3〜）
// Next.js dev サーバーの React Refresh / HMR が内部で eval を使用するため。
// 本番ビルドでは React Refresh が無効化されるので 'unsafe-eval' は不要。
const isDevelopment = process.env.NODE_ENV === 'development'
const scriptSrc = isDevelopment ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'"

const cspDirectives = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]

const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspDirectives.join('; ') },
  { key: 'X-Frame-Options', value: 'DENY' },
  // ... 他5種省略（全7種）
]

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

// Bundle Analyzer（省略）
export default process.env.ANALYZE === 'true' ? withBundleAnalyzer(nextConfig) : nextConfig
```

**セキュリティヘッダー（第8層防御・7種）:**

| ヘッダー                    | 値                                                                                             | 防御対象                |
| --------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------- |
| `Content-Security-Policy`   | `default-src 'self'; script-src 'self' 'unsafe-inline'; ...`（dev時のみ `'unsafe-eval'` 追加） | XSS・外部スクリプト注入 |
| `X-Frame-Options`           | `DENY`                                                                                         | クリックジャッキング    |
| `X-Content-Type-Options`    | `nosniff`                                                                                      | MIMEスニッフィング      |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                                              | リファラー情報漏洩      |
| `X-DNS-Prefetch-Control`    | `on`                                                                                           | DNS解決の最適化         |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload`                                                 | HTTPS強制（2年）        |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()`                                                     | ブラウザAPI制限         |

**CSPディレクティブ詳細:**

| ディレクティブ    | 値                                                                            | 理由                                                                              |
| ----------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `default-src`     | `'self'`                                                                      | デフォルトで同一オリジンのみ許可                                                  |
| `script-src`      | 本番: `'self' 'unsafe-inline'` / 開発: `'self' 'unsafe-inline' 'unsafe-eval'` | Next.js App Routerのインラインスクリプト + dev時のHMR用eval（v3.7.3〜環境別分岐） |
| `style-src`       | `'self' 'unsafe-inline' https://fonts.googleapis.com`                         | Tailwind CSS + Google Fonts CSS                                                   |
| `img-src`         | `'self' data: blob:`                                                          | Base64画像・Blob URLを許可                                                        |
| `font-src`        | `'self' data: https://fonts.gstatic.com`                                      | Google Fontsファイルを許可                                                        |
| `connect-src`     | `'self'`                                                                      | API通信を同一オリジンに制限                                                       |
| `frame-ancestors` | `'none'`                                                                      | iframingを完全禁止                                                                |
| `base-uri`        | `'self'`                                                                      | base URIハイジャック防止                                                          |
| `form-action`     | `'self'`                                                                      | フォームハイジャック防止                                                          |

**クローン先でのカスタマイズ例:**
Supabase使用時は `connect-src` と `img-src` に `https://*.supabase.co` を追加。

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
      exclude: ['node_modules/', 'tests/', '*.config.*', '.next/', 'scripts/'],
      // v3.7.5〜: thresholds は削除（個人開発デフォルト=PR運用OFFと整合）
      // クローン後にチーム開発・コンプライアンス要件で品質ゲートが必要なら
      // v3 系の正しいフラット記法で追加する:
      //   thresholds: {
      //     branches: 70, functions: 70, lines: 70, statements: 70,
      //     'src/features/**': { branches: 80, functions: 80, lines: 80, statements: 80 }
      //   }
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
- 必要時に `next-intl` 等への拡張を想定（テンプレートは外部依存ゼロ）

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

| コマンド                | 説明                                                 |
| ----------------------- | ---------------------------------------------------- |
| `pnpm check`            | 包括的品質チェック                                   |
| `pnpm check:boundaries` | 境界違反検出                                         |
| `pnpm fix:boundaries`   | 境界違反自動修正                                     |
| `pnpm validate`         | 統合検証（型/lint/境界/テスト+coverage/ビルド）      |
| `pnpm validate:all`     | 全検証実行（`pnpm validate` のエイリアス）           |
| `pnpm test:coverage`    | カバレッジ計測単独実行（`coverage/index.html` 生成） |

#### `pnpm validate` の完全実行アルゴリズム（v3.7.5〜）

`scripts/validate-sc.js` が以下の順序で各チェックを実行する:

```
1. テンプレート機能チェック
   ├ Git Hooks（pre-commit, commit-msg）の実行権限確認
   ├ SuperClaude設定（CLAUDE.md, superclaude/, .claude/settings.json）の存在確認
   ├ フィーチャー境界スクリプト（scripts/check-boundaries.js）の存在確認
   └ Vitest設定（vitest.config.ts）の存在確認

2. フィーチャー境界チェック（pnpm check:boundaries）
   ├ src/features/*/index.ts の公開API分析
   ├ 境界違反検出（直接インポート禁止パターン）
   └ 循環参照検出

3. TypeScript型チェック（pnpm typecheck）
   └ tsc --noEmit

4. ESLintチェック（pnpm lint）
   └ eslint .

5. テスト実行
   ├ ユニットテスト + カバレッジ計測（pnpm test:coverage）
   │  └ vitest run --coverage（v3.7.5〜統合）
   │     ├ tests/consistency/, tests/regression/, src/features/**/*.test.ts を全実行
   │     └ coverage/index.html, coverage-final.json, lcov.info を生成
   └ 回帰テスト（pnpm test:regression）— 表示重複だが UI 価値あり

6. プロダクションビルド（pnpm build）
   ├ next build（型チェック + 静的解析 + バンドル生成）
   └ Preflightチェック（pnpm preflight）— 環境変数等の最終確認
```

**実行時間**: 概ね 60〜90秒（ローカル M4 Mac 実測）

**失敗時の挙動**: いずれかのステップで exit code !== 0 だと、`pnpm validate` 全体が失敗扱い。pre-commit フック（`.husky/pre-commit`）でも同じスクリプトが走るためコミットがブロックされる。

### 7.4 フィーチャー開発コマンド

| コマンド                     | 説明                       |
| ---------------------------- | -------------------------- |
| `pnpm create:feature [name]` | フィーチャー作成           |
| `pnpm sc:start`              | セッション開始             |
| `pnpm sc:feature`            | フィーチャー作成ウィザード |
| `pnpm sc:boundaries`         | 境界チェック               |
| `pnpm sc:validate`           | 包括的検証                 |

### 7.5 SuperClaude v4 統合コマンド（`pnpm sc:*` 16種）

**重要**: 本テンプレート同梱の `pnpm sc:*` スクリプト（**16種**）は、SuperClaude フレームワーク本家が提供するユーザーグローバルの `/sc:` スラッシュコマンド（`~/.claude/commands/sc/`）とは**別レイヤー**である。同名コマンドがあっても実装は独立しており、混同してはならない。

- **`pnpm sc:*`**（このセクション）: `package.json` の `scripts` に定義されたnpmスクリプト。テンプレートをクローンした全環境で動作。CLIから直接呼び出し可能。
- **`/sc:*`**（SuperClaude 本家）: Claude Code のスラッシュコマンド。SuperClaude フレームワークを `~/.claude/` にインストール済みの環境でのみ利用可能。本テンプレート同梱ではない。

**歴史的経緯**: 以前のドキュメント（`SUPERCLAUDE_FINAL.md`）には「22コマンド」と記載されていたが、これは SuperClaude 本家の理論値であり、本テンプレート同梱の実測値は 16 である。`SUPERCLAUDE_V42_UPGRADE_PLAN.md` / `SUPERCLAUDE_V42_RISK_ANALYSIS.md` 内の「22」は 2025-10-25 時点の本家カウントとして保全している（歴史文書）。

#### 🗂️ 16スクリプトの完全カタログ（`package.json` の `scripts` 実測値）

**計画フェーズ（3）**

| コマンド             | 実装                                                            | 用途                                               |
| -------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| `pnpm sc:plan`       | `git-safety-check.js --command=sc:plan` + echo                  | 計画セッション開始（Git安全性チェック付き）        |
| `pnpm sc:brainstorm` | `git-safety-check.js --auto-fix --command=sc:brainstorm` + echo | ブレインストーミングモード（安全ブランチ自動作成） |
| `pnpm sc:parallel`   | `setup.js --sc-parallel`                                        | 並列処理セットアップ                               |

**セットアップ（3）**

| コマンド          | 実装                                                                              | 用途                                          |
| ----------------- | --------------------------------------------------------------------------------- | --------------------------------------------- |
| `pnpm sc:start`   | `git-safety-check.js --command=sc:start` + `git status` + `pnpm check:boundaries` | セッション開始（必須・Git状態＋境界チェック） |
| `pnpm sc:feature` | `git-safety-check.js --auto-fix --command=sc:feature` + `pnpm create:feature`     | フィーチャー作成ウィザード                    |
| `pnpm sc:mcp`     | echo                                                                              | MCP-Firstモード案内                           |

**実装（3）**

| コマンド            | 実装                                                                           | 用途                     |
| ------------------- | ------------------------------------------------------------------------------ | ------------------------ |
| `pnpm sc:implement` | `pnpm claude:implement`                                                        | 実装実行                 |
| `pnpm sc:refactor`  | `git-safety-check.js --auto-fix --command=sc:refactor` + `pnpm fix:boundaries` | 境界維持リファクタリング |
| `pnpm sc:optimize`  | `pnpm analyze`                                                                 | バンドル分析・最適化     |

**品質保証（6）**

| コマンド             | 実装                          | 用途                      |
| -------------------- | ----------------------------- | ------------------------- |
| `pnpm sc:boundaries` | `pnpm check:boundaries`       | フィーチャー境界違反検出  |
| `pnpm sc:analyze`    | `pnpm check:features`         | フィーチャー依存関係分析  |
| `pnpm sc:validate`   | `pnpm validate`               | 包括的品質チェック        |
| `pnpm sc:test`       | `pnpm test`                   | テスト実行                |
| `pnpm sc:review`     | `pnpm typecheck && pnpm lint` | 型チェック+ESLintレビュー |
| `pnpm sc:debug`      | `pnpm test:unit:ui`           | Vitest UIによるデバッグ   |

**分析（1）**

| コマンド                 | 実装 | 用途                   |
| ------------------------ | ---- | ---------------------- |
| `pnpm sc:business-panel` | echo | ビジネス価値分析モード |

#### 🛡️ 整合性テストによる保証

`tests/consistency/command-references.test.ts` が `SETUP_GUIDE.md` / `SPECIFICATION.md` / `CLAUDE.md` / `README.md` / `PROJECT_INFO.md` / `SUPERCLAUDE_FINAL.md` 内のバッククォート付き pnpm 呼び出し参照をスキャンし、`package.json` の `scripts` に実在することを pre-commit フック・CI で自動検証する。ドキュメントに架空コマンドを書くとコミットがブロックされる。

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
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'
      - name: 依存関係インストール
        run: pnpm install --frozen-lockfile
      - name: 型チェック
        run: pnpm typecheck
      - name: フィーチャー境界チェック
        run: pnpm check:boundaries
      - name: 全体チェック
        run: |
          cp .env.ci .env.local 2>/dev/null || true
          pnpm check

  test:
    name: テスト実行
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'
      - name: 依存関係インストール
        run: pnpm install --frozen-lockfile
      - name: 単体テスト + カバレッジ計測
        run: pnpm test:coverage
      - name: カバレッジレポートをアーティファクト化
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 14

  build:
    name: ビルドチェック
    runs-on: ubuntu-latest
    needs: [quality, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'
      - name: 依存関係インストール
        run: pnpm install --frozen-lockfile
      - name: プロダクションビルド
        run: pnpm build
      - name: Preflightチェック
        run: pnpm preflight
```

### 9.2 ジョブ構成

| ジョブ      | 依存関係            | 実行内容                                                           |
| ----------- | ------------------- | ------------------------------------------------------------------ |
| **quality** | なし（並列実行）    | 型チェック → 境界チェック → 全体チェック                           |
| **test**    | なし（並列実行）    | Vitestユニットテスト + カバレッジ計測 + レポートアーティファクト化 |
| **build**   | quality, test完了後 | プロダクションビルド → Preflightチェック                           |

### 9.3 実行環境

| 項目             | 値                                                 |
| ---------------- | -------------------------------------------------- |
| **ランナー**     | ubuntu-latest                                      |
| **Node.js**      | `.nvmrc` 参照（現状: 20.19.0）                     |
| **パッケージ**   | pnpm 9                                             |
| **インストール** | `--frozen-lockfile`（lockfile厳密一致）            |
| **真実の源**     | `.nvmrc` 1ファイル → CI / engines / nvm が同時参照 |

#### 9.3.1 Node.jsバージョン管理の単一の真実の源（v3.7.2〜）

| ファイル                      | 役割                                       | 値の参照方法                  |
| ----------------------------- | ------------------------------------------ | ----------------------------- |
| `.nvmrc`                      | **唯一の真実の源**（バージョン番号を保持） | `nvm use` でローカル切替      |
| `package.json` `engines.node` | パッケージ最小バージョン要件               | `>=20.19.0`（範囲指定）       |
| `.github/workflows/*.yml`     | CI上のNode.jsバージョン                    | `node-version-file: '.nvmrc'` |

`.nvmrc` を更新するだけで、CI とローカルが同時に切り替わる。`engines.node` は範囲指定なので独立。

#### 9.3.2 カバレッジ計測（v3.7.2〜）

`test` ジョブで `pnpm test:coverage` を実行し、`coverage/` ディレクトリ全体を `actions/upload-artifact@v4` でアップロード。`if: always()` 指定により、テスト失敗時もレポートが残る。テンプレートデフォルトでは `vitest.config.ts` の `thresholds` を持たず計測のみ実施するため、CI が coverage を理由に落ちることはない（v3.7.5〜）。閾値強制が必要なプロジェクトは §17.2 の手順で設定する。アーティファクトの保持期間は14日。

> **設計判断（2026-03-13）**: CIパイプラインにはE2Eテスト（Playwright）を含まない。
> テンプレートからクローンした全リポジトリでPlaywrightが自動実行されActions分数を大量消費する
> 問題が発生したため、テンプレートのCIはユニットテスト（Vitest）のみとする方針。
> E2Eテストが必要なプロジェクトでは、各リポジトリで個別にci.ymlへステップを追加すること。

### 9.4 セキュリティワークフロー（.github/workflows/security.yml）

`ci.yml` とは別に、セキュリティ専用のGitHub Actionsワークフローを独立運用する。関心の分離によりCIの軽量性を保ちつつ、第9層防御（CI/CDパイプライン防御）を実現する。

| ジョブ             | ツール                        | 役割                                           |
| ------------------ | ----------------------------- | ---------------------------------------------- |
| `dependency-audit` | `pnpm audit`                  | 本番依存のCVE能動監査（`high` 以上でブロック） |
| `gitleaks`         | `gitleaks/gitleaks-action@v2` | pre-commitの `--no-verify` バイパス対策        |
| `codeql`           | `github/codeql-action@v3`     | JavaScript/TypeScriptのSAST                    |

**トリガー:** `push`（main）/ `pull_request`（main宛）/ `schedule`（毎週月曜 00:00 UTC）

詳細は 12.14 を参照。

## 10. Git Hooks

### 10.0 共通仕様

| 項目                | 値     |
| ------------------- | ------ |
| **huskyバージョン** | v9.1.7 |
| **文字コード**      | UTF-8  |
| **改行コード**      | LF     |

husky v9以降ではshebang行（`#!/usr/bin/env sh`）と`. "$(dirname -- "$0")/_/husky.sh"`は不要。これらの行はv10.0.0でエラーになるため含めない。

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
│ ブラウザ側防御（HTTPレスポンスヘッダー・7種）        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Content-Security-Policy : XSS・外部スクリプト    │ │
│ │                           注入防止               │ │
│ │ X-Frame-Options         : クリックジャッキング   │ │
│ │                           防止                   │ │
│ │ X-Content-Type-Options  : MIMEスニッフィング防止 │ │
│ │ Strict-Transport-Security: HTTPS通信の強制       │ │
│ │ Referrer-Policy         : リファラー情報漏洩防止 │ │
│ │ Permissions-Policy      : ブラウザAPI利用を制限  │ │
│ │ X-DNS-Prefetch-Control  : DNS解決の最適化        │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│ CI/CDパイプライン防御（GitHub Actions）              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ CodeQL SAST           : JavaScript/TypeScript   │ │
│ │                         の静的解析でXSS・        │ │
│ │                         インジェクション検知     │ │
│ │ pnpm audit            : 依存パッケージCVEの      │ │
│ │                         能動的監査（毎PR+週次）  │ │
│ │ gitleaks Actions      : pre-commit --no-verify   │ │
│ │                         バイパス対策の二重防御   │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
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

### 12.5 ブランチ保護ルール（PR運用モード依存）

ブランチ保護は **PR運用モード**（第24章）に応じて動的に適用される。`pnpm setup:sc` では適用されず、`pnpm sc:enable-pr` 実行時のみ以下の保護が有効化される。

#### 12.5.1 PR運用モード OFF（デフォルト・個人開発）

| ルール           | 設定     | 理由                                   |
| ---------------- | -------- | -------------------------------------- |
| **ブランチ保護** | 未適用   | 個人開発の自由度を最大化。main直push可 |
| **Force push**   | 制限なし | リモート未保護                         |
| **PR必須**       | 不要     | feature branch も任意                  |

#### 12.5.2 PR運用モード ON（チーム開発・`pnpm sc:enable-pr` 実行後）

| ルール                     | 設定 | 理由                                            |
| -------------------------- | ---- | ----------------------------------------------- |
| **Force push**             | 禁止 | 履歴の破壊を防止（`allow_force_pushes: false`） |
| **ブランチ削除**           | 禁止 | mainの誤削除を防止（`allow_deletions: false`）  |
| **PR必須**                 | 必須 | `required_pull_request_reviews` 1承認以上       |
| **ステータスチェック必須** | 不要 | `required_status_checks: null`                  |
| **管理者への強制**         | 無効 | `enforce_admins: false`（オーナー柔軟性維持）   |

切替詳細は第24章を参照。

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

### 12.9 セキュリティヘッダー（next.config.mjs）

デプロイ時にブラウザ側で攻撃を防止するHTTPレスポンスヘッダー。`next.config.mjs`の`headers()`関数で全ルート`/(.*)`に適用される。

#### 12.9.1 ヘッダー一覧

| ヘッダー                    | 値                                             | 防御対象              | 効果                                                        |
| --------------------------- | ---------------------------------------------- | --------------------- | ----------------------------------------------------------- |
| `X-Frame-Options`           | `DENY`                                         | クリックジャッキング  | 全ての`<iframe>`埋め込みを拒否                              |
| `X-Content-Type-Options`    | `nosniff`                                      | MIMEスニッフィング    | Content-Typeヘッダーに従い、ブラウザの型推測を禁止          |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`              | リファラー情報漏洩    | 同一オリジンはフルURL、クロスオリジンはオリジンのみ送信     |
| `X-DNS-Prefetch-Control`    | `on`                                           | パフォーマンス        | 外部リンクのDNS事前解決を有効化                             |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | 中間者攻撃            | HTTPS接続を2年間強制、サブドメイン含む、preloadリスト登録可 |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()`     | 不正なブラウザAPI利用 | カメラ・マイク・位置情報のAPI呼び出しを完全ブロック         |

#### 12.9.2 実装詳細

**設定ファイル:** `next.config.mjs`

```javascript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}
```

**適用範囲:** 全ルート（`/(.*)`）に一括適用

#### 12.9.3 CSPを含めた設計判断（v3.1.0〜）

Content-Security-Policy（CSP）はテンプレートに **含めている**（v3.1.0〜）。Next.js App Router の動作と互換性を持つ最低限の許可リストで構成し、クローン先プロジェクトで外部リソースを追加する際は許可リストを拡張する運用とする。

**含めた理由（2026-04-13 設計判断）:**

| 理由                               | 詳細                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| デフォルトでセキュアバイデフォルト | クローンした全プロジェクトが XSS・iframing・フォームハイジャックから保護される          |
| Next.js App Router 互換性          | `'self' 'unsafe-inline'` で App Router のインラインスクリプトを許可しつつ外部はブロック |
| 環境別制御                         | dev では `'unsafe-eval'` を追加して HMR を許可、本番では除外（v3.7.3〜）                |

**過去の設計判断との差分（v3.1.0以前）:** 当初は「プロジェクト固有性が高い」「破壊的になり得る」を理由に CSP 非搭載だったが、Next.js App Router で動作する最小許可リスト（`'self' 'unsafe-inline'` + Google Fonts）が判明したため、テンプレートデフォルトとして搭載に変更した。

#### 12.9.4 クローン先でのカスタマイズ例

| ユースケース                   | 変更内容                                                               |
| ------------------------------ | ---------------------------------------------------------------------- |
| iframeで自サイトを埋め込みたい | `X-Frame-Options`を`SAMEORIGIN`に変更、CSP の `frame-ancestors` も同期 |
| カメラ/マイクを使うアプリ      | `Permissions-Policy`から該当APIを除外                                  |
| Supabase等の外部APIに接続      | CSP の `connect-src` / `img-src` に `https://*.supabase.co` を追加     |
| Google Analytics等を導入       | CSP の `script-src` / `connect-src` に該当ドメインを追加               |
| 独自フォント/CDNを追加         | CSP の `font-src` / `style-src` / `img-src` に該当 origin を追加       |

#### 12.9.5 動作確認方法

```bash
# 開発モード（'unsafe-eval' を含む）
pnpm dev
curl -sI http://localhost:3000 | grep -E "^(Content-Security|X-Frame|X-Content|Referrer|X-DNS|Strict|Permissions)"

# 本番モード（'unsafe-eval' を含まない）
pnpm build && pnpm exec next start
curl -sI http://localhost:3000 | grep -i "content-security"
```

期待出力（dev）:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-DNS-Prefetch-Control: on
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

期待出力（本番、`'unsafe-eval'` が含まれないことに注目）:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src ...
```

#### 12.9.6 設計判断（2026-04-05）

| 項目         | 内容                                                                                 |
| ------------ | ------------------------------------------------------------------------------------ |
| **追加理由** | テンプレートからクローンした全プロジェクトが「セキュアバイデフォルト」で動作するため |
| **スコープ** | OWASP推奨のブラウザ側防御ヘッダーのうち、プロジェクト非依存のもの6種                 |
| **影響**     | 既存機能への影響なし（HTTPレスポンスヘッダーの追加のみ）                             |
| **使用感**   | ブラウザの表示・動作・パフォーマンスに変化なし                                       |

### 12.10 脆弱性管理（pnpm.overrides による能動対処）

`pnpm audit` で検出される脆弱性は、本番・開発依存ともに `pnpm.overrides` で能動的にパッチバージョンへ強制アップグレードする方針。間接依存（transitive dependencies）で Dependabot が自動更新できないケースも、範囲指定の override で局所的に対処する。

#### 12.10.1 現在の overrides 戦略（package.json）

```json
"pnpm": {
  "overrides": {
    "esbuild@<=0.24.2": ">=0.25.0",
    "flatted": "^3.4.2",
    "vite": "^6.4.2",
    "minimatch@>=10.0.0 <10.2.3": "^10.2.3",
    "picomatch@<2.3.2": "^2.3.2",
    "picomatch@>=4.0.0 <4.0.4": "^4.0.4",
    "brace-expansion@<1.1.13": "^1.1.13",
    "brace-expansion@>=2.0.0 <2.0.3": "^2.0.3",
    "brace-expansion@>=4.0.0 <5.0.5": "^5.0.5",
    "yaml@>=2.0.0 <2.8.3": "^2.8.3",
    "postcss@<8.5.10": "^8.5.10"
  }
}
```

**注**: `i18next-fs-backend@<2.6.4` (HIGH / GHSA-8847-338w-5hcj) は v3.7.1 で `pnpm.overrides` で対処していたが、v3.7.2 で `next-i18next` 自体を依存削除したため override 行も不要となり削除した（脆弱性源の根絶）。

#### 12.10.2 対処済み脆弱性

| パッケージ           | 対処日     | 対処方法     | 脆弱性概要                                    | 脆弱バージョン              | パッチバージョン            | Advisory                                              | CVSS       |
| -------------------- | ---------- | ------------ | --------------------------------------------- | --------------------------- | --------------------------- | ----------------------------------------------------- | ---------- |
| `flatted`            | 2026-04-13 | override     | Prototype Pollution via parse()               | `<=3.4.1`                   | `>=3.4.2`                   | —                                                     | —          |
| `vite`               | 2026-04-13 | override     | File system access control bypass             | `>=6.0.0 <=6.4.1`           | `>=6.4.2`                   | —                                                     | —          |
| `minimatch`          | 2026-04-13 | override     | ReDoS: wildcards / extglob / globstar         | `>=10.0.0 <10.2.3`          | `>=10.2.3`                  | GHSA-3ppc-4f35-3m26 / 7r86-cg39-jmmj / 23c5-xmqv-rm74 | —          |
| `picomatch`          | 2026-04-13 | override     | ReDoS: extglob quantifiers                    | `<2.3.2` / `>=4.0.0 <4.0.4` | `>=2.3.2` / `>=4.0.4`       | GHSA-c2c7-rcm5-vvqj                                   | —          |
| `brace-expansion`    | 2026-04-13 | override     | Zero-step sequence process hang               | 1.x / 2.x / 4.x の各範囲    | 各パッチ版                  | —                                                     | —          |
| `yaml`               | 2026-04-13 | override     | Stack overflow via deeply nested              | `>=2.0.0 <2.8.3`            | `>=2.8.3`                   | —                                                     | —          |
| `i18next-fs-backend` | 2026-04-26 | **依存削除** | Path traversal via unsanitised lng/ns         | `<2.6.4`                    | n/a (`next-i18next` を削除) | GHSA-8847-338w-5hcj                                   | 8.2 (HIGH) |
| `postcss`            | 2026-04-25 | override     | XSS via unescaped `</style>` in CSS Stringify | `<8.5.10`                   | `>=8.5.10`                  | GHSA-qx2v-qp2m-jg93 / CVE-2026-41305                  | —          |

#### 12.10.3 override 戦略の原則

| 原則                                                  | 理由                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| **バージョン範囲を限定**                              | `"foo"` ではなく `"foo@<X.Y.Z"` を使い、影響範囲を最小化             |
| **同じメジャーでのパッチ優先**                        | breaking changes を避けるため `^` 範囲で強制                         |
| **Dependabot の `tool_feature_not_supported` を回避** | pnpm の transitive dependency 更新非対応問題を override で解決       |
| **Dependabot との共存**                               | Dependabot PR は引き続き通知として機能、overrides が実際の修正を担当 |

#### 12.10.4 残存脆弱性

**現時点で 0件**（`pnpm audit` で確認、本番・開発依存ともにクリーン）。

#### 12.10.5 手動依存衛生の運用方針

定期的な依存更新（Dependabot Version Updates相当）は**意図的に自動化していない**。理由は開発体験の保護であり、テンプレートの設計判断として明確化する。

| 項目                                  | 採否               | 理由                                                             |
| ------------------------------------- | ------------------ | ---------------------------------------------------------------- |
| **dependabot.yml（version updates）** | 不採用             | 週次PR氾濫・breaking change によるCI失敗・開発フロー中断のリスク |
| **Dependabot Security Updates**       | 採用（デフォルト） | 脆弱性検知時のみPR作成。受動的だが実害発生時のみ動く             |
| **第9層 dependency-audit**            | 採用               | 週次cronで能動的に新規CVE検知。失敗時は人間が判断して対処        |
| **手動 `pnpm update`**                | 推奨               | 月次〜四半期に1度、開発者が能動的に実行（後述）                  |

**手動更新の推奨フロー（月次〜四半期）:**

```bash
# 1. 現在の脆弱性を確認
pnpm audit

# 2. 対話的に更新候補を確認
pnpm update --interactive

# 3. パッチ更新のみを優先（安全）
pnpm update --interactive --latest=false

# 4. 更新後の検証
pnpm typecheck && pnpm test && pnpm build

# 5. 問題なければコミット
git add package.json pnpm-lock.yaml
git commit -m "chore: 依存パッケージを更新"
```

**新規CVE検知時の対処フロー（第9層 audit が失敗した場合）:**

```bash
# 1. 詳細を確認
pnpm audit

# 2. 影響範囲を特定
pnpm why <vulnerable-package>

# 3. 直接依存ならアップデート
pnpm update <package>

# 4. 間接依存（transitive）なら pnpm.overrides で局所修正
#    package.json の "pnpm.overrides" にバージョン範囲指定で追加
#    例: "minimatch@>=10.0.0 <10.2.3": "^10.2.3"

# 5. 動作確認後コミット
```

**設計判断の根拠（2026-04-13）:**

| 判断                        | 理由                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| **PRより通知**              | Dependabot Security UpdatesのPR + 第9層auditの失敗通知で「いつ動くべきか」が分かれば十分 |
| **能動より受動の防御**      | 個人開発テンプレートでは「常に最新」より「壊れない」が優先                               |
| **過剰な自動化の回避**      | 自動PR管理は開発体験を悪化させる。判断は人間が行う                                       |
| **`pnpm.overrides` の常備** | 透過的依存の脆弱性に対する確実な対処手段として常時運用                                   |

### 12.11 Claude Code denyルール（破壊的操作・秘密情報保護）

Claude Codeのツール実行に対して、破壊的操作と秘密情報へのアクセスをdenyルールで防止する。
denyルールはallow/askより優先されるため、allowに含まれるパターンでもdenyに該当すればブロックされる。

**評価優先順位:** `deny` → `ask` → `allow`

**設定ファイル:** `.claude/settings.json` の `permissions.deny`

#### 12.11.1 システム破壊防止

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

#### 12.11.2 Git保護

| denyルール                             | 防止する操作                 | 補足                               |
| -------------------------------------- | ---------------------------- | ---------------------------------- |
| `Bash(git push --force origin main)`   | mainブランチへのforce push   | feature branchへのforce pushは許可 |
| `Bash(git push --force origin master)` | masterブランチへのforce push | GitHub側のブランチ保護との二重防御 |

#### 12.11.3 秘密情報読み取り防止

| denyルール               | 防止する操作                    | 補足                            |
| ------------------------ | ------------------------------- | ------------------------------- |
| `Read(**/*.pem)`         | SSL/TLS証明書・秘密鍵の読み取り | Vercelデプロイ前提で不要        |
| `Read(**/*.key)`         | 秘密鍵ファイルの読み取り        | 同上                            |
| `Read(**/*credentials*)` | 認証情報ファイルの読み取り      | AWS/GCP等のcredentialsファイル  |
| `Read(~/.ssh/*)`         | SSH鍵の読み取り                 | Claude Codeが読む正当な理由なし |
| `Read(~/.aws/*)`         | AWS認証情報の読み取り           | 同上                            |

#### 12.11.4 denyルールの解除方法

個人的に特定のdenyルールを解除する必要がある場合、`.claude/settings.local.json`（Git管理外）でoverride可能。

```json
// .claude/settings.local.json（例: .pemファイルの読み取りを許可）
{
  "permissions": {
    "allow": ["Read(**/*.pem)"]
  }
}
```

#### 12.11.5 設計判断（2026-03-15）

| 項目                         | 判断   | 理由                                                        |
| ---------------------------- | ------ | ----------------------------------------------------------- |
| **サンドボックス**           | 不採用 | MCPサーバー（Serena、Morphllm等）との互換性問題リスクが高い |
| **ネットワーク制限**         | 不採用 | MCPサーバー・WebFetchの多様なドメインアクセスを制限できない |
| **bypass permissions無効化** | 不採用 | Managed Settings専用機能。個人開発では効果なし              |
| **開発コンテナ**             | 不採用 | セットアップコストが高く、MCP連携が複雑化                   |
| **denyルール**               | 採用   | 既存のallow設定と共存可能。日常開発に影響なし               |
| **秘密情報Read禁止**         | 採用   | Vercelデプロイ前提でSSL証明書の手動操作不要                 |

**参考記事:** 「2026年最新版」Claude Codeで行うべきセキュリティ設定 10選（Qiita @miruky）の10項目から、個人開発テンプレートに適した5項目を選定・実装。

### 12.12 全自動開発設定（settings.local.json）

`pnpm setup:sc`の実行時に`.claude/settings.local.example.json`から自動生成される、確認プロンプトを最小化した開発用許可設定。

#### 12.12.1 許可ポリシー

| 区分      | 対象                                                                   | 設定理由                                                                      |
| --------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **allow** | `Edit`, `Write`, `Bash`, `WebSearch`, `WebFetch`, `Skill`, 全MCPツール | 開発中の確認プロンプトを排除し、ノンストップ開発を実現                        |
| **ask**   | `mcp__supabase__execute_sql`                                           | 生SQL実行はデータ削除リスクがあり不可逆。確認必須                             |
| **deny**  | なし（`settings.json`側のdenyが有効）                                  | テンプレート側のdenyルール（`rm -rf`, `--force push main`, 秘密鍵読取）で保護 |

#### 12.12.2 安全性の担保

`settings.local.json`で全操作をallowしても、`settings.json`のdenyルールが最優先で適用される（deny > ask > allow）。

| 操作                           | 結果     | 保護元                    |
| ------------------------------ | -------- | ------------------------- |
| `rm -rf /`, `rm -rf ~`         | ブロック | settings.json deny        |
| `git push --force origin main` | ブロック | settings.json deny        |
| 秘密鍵・認証情報の読み取り     | ブロック | settings.json deny        |
| `execute_sql`（生SQL）         | 確認あり | settings.local.json ask   |
| その他の全操作                 | 自動実行 | settings.local.json allow |

#### 12.12.3 設定ファイルの自動生成

`scripts/setup.js`のStep 1で、`.claude/settings.local.example.json`が存在し、`.claude/settings.local.json`が未作成の場合に自動コピーする。既に`settings.local.json`が存在する場合はスキップ（既存設定を保護）。

#### 12.12.4 設計判断（2026-04-02）

| 項目                                  | 判断 | 理由                                                                           |
| ------------------------------------- | ---- | ------------------------------------------------------------------------------ |
| **`Bash`一括allow**                   | 採用 | 個別コマンド登録では開発中に蓄積され管理不能。denyルールで破壊的操作は防止済み |
| **`execute_sql`のみask**              | 採用 | 1年以上の運用で唯一データ誤削除が発生。他の操作はgit revert等で可逆            |
| **mainへの通常pushをallow**           | 採用 | git revertで可逆。force pushのみdeny（settings.json側）で防止                  |
| **settings.local.example.jsonの同梱** | 採用 | `pnpm setup:sc`で自動適用可能。友人への追加説明不要                            |

### 12.13 権限モデル（公開リポジトリ: template-v3.0）

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

### 12.14 CI/CDパイプライン防御（第9層）

GitHub Actions上で能動的に脆弱性・シークレット・不正パターンを検知する。開発者のローカル環境に依存しない「サーバー側の継続監査」として機能し、pre-commitフックの `--no-verify` バイパスや、依存パッケージに新規CVEが出現した場合にも対応可能。

**設定ファイル:** `.github/workflows/security.yml`

#### 12.14.1 実行トリガー

| トリガー                 | 実行ジョブ | 目的                                              |
| ------------------------ | ---------- | ------------------------------------------------- |
| `push` to `main`         | 全ジョブ   | mainマージ時に最終確認                            |
| `pull_request` to `main` | 全ジョブ   | PR時点で問題を検知し、マージ前にブロック          |
| `schedule`（週次・月曜） | 全ジョブ   | コード未変更でも新規CVE・検出パターンの更新に追従 |

**cron:** `0 0 * * 1`（毎週月曜 00:00 UTC = 09:00 JST）

#### 12.14.2 ジョブ構成

| ジョブ             | ツール                        | 失敗条件                       | 役割                                     |
| ------------------ | ----------------------------- | ------------------------------ | ---------------------------------------- |
| `dependency-audit` | `pnpm audit`                  | 本番依存に `high` 以上の脆弱性 | サプライチェーン攻撃・既知CVEの能動検知  |
| `gitleaks`         | `gitleaks/gitleaks-action@v2` | 秘密情報検出                   | pre-commit の `--no-verify` バイパス対策 |
| `codeql`           | `github/codeql-action@v3`     | セキュリティクエリ違反         | JavaScript/TypeScriptのSAST              |

#### 12.14.3 `dependency-audit` ジョブの詳細

```yaml
- name: 本番依存の脆弱性監査（high以上でブロック）
  run: pnpm audit --prod --audit-level=high

- name: 全依存の脆弱性監査（moderate以上・警告のみ）
  run: pnpm audit --audit-level=moderate
  continue-on-error: true
```

| 項目                         | 本番依存スキャン                                  | 開発依存スキャン                   |
| ---------------------------- | ------------------------------------------------- | ---------------------------------- |
| **オプション**               | `--prod --audit-level=high`                       | `--audit-level=moderate`           |
| **失敗時の挙動**             | CIブロック                                        | 警告のみ（継続）                   |
| **対象**                     | `dependencies`                                    | `dependencies` + `devDependencies` |
| **既知の残存脆弱性への影響** | 影響なし（12.10 の overrides 戦略で全て対処済み） | 影響なし（同左）                   |

**設計意図:** 本番ランタイムに届く依存のみ厳格にブロックし、開発ツール内部の脆弱性は可視化に留める。実際の脆弱性は 12.10 の `pnpm.overrides` で能動対処するため、現時点で本番・開発いずれもクリーン。`--prod --audit-level=high` の二段構えは、将来的に新規CVEが出現した場合にも運用を止めずに検知できる安全網として機能する。

#### 12.14.4 `gitleaks` ジョブの詳細

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0 # 全履歴をチェック対象に含める
- uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

| 項目               | 内容                                                     |
| ------------------ | -------------------------------------------------------- |
| **スキャン範囲**   | `fetch-depth: 0` により全履歴（push済みの全コミット）    |
| **pre-commit比較** | pre-commitは「ステージングのみ」、CIは「全履歴」で差別化 |
| **ライセンス**     | publicリポジトリは無料で利用可能                         |
| **検出時の挙動**   | GitHub Actions上でエラー → PRはブロック                  |

**二重防御の意図:** ローカルpre-commitが`--no-verify`で回避された場合でも、push後のCIで確実に検知する。

#### 12.14.5 `codeql` ジョブの詳細

```yaml
- uses: github/codeql-action/init@v3
  with:
    languages: javascript-typescript
    queries: security-and-quality
- uses: github/codeql-action/analyze@v3
  with:
    category: '/language:javascript-typescript'
```

| 項目               | 内容                                                             |
| ------------------ | ---------------------------------------------------------------- |
| **対象言語**       | JavaScript/TypeScript（`languages: javascript-typescript`）      |
| **クエリセット**   | `security-and-quality`（セキュリティ + コード品質）              |
| **検出パターン例** | SQLインジェクション、XSS、Path Traversal、安全でない正規表現など |
| **結果の確認場所** | GitHub → Security → Code scanning alerts                         |
| **ライセンス**     | publicリポジトリは無料（GitHub Advanced Security不要）           |

#### 12.14.6 権限モデル

```yaml
permissions:
  contents: read
  security-events: write
```

| 権限                     | 用途                                              |
| ------------------------ | ------------------------------------------------- |
| `contents: read`         | リポジトリコードの読み取り（チェックアウト）      |
| `security-events: write` | CodeQL/gitleaksの検知結果をSecurityタブに書き込み |

**最小権限の原則:** 書き込み権限は `security-events` のみに限定。`contents: write` や `pull-requests: write` は付与しない。

#### 12.14.7 他の防御層との役割分担

| 脅威                       | 第2層 (gitleaks pre-commit) | 第5-6層 (GitHub Secret Scanning / Push Protection) | 第7層 (Dependabot) | **第9層 (CI/CD)** |
| -------------------------- | --------------------------- | -------------------------------------------------- | ------------------ | ----------------- |
| **秘密情報のコミット**     | ✅ 第一防衛                 | ✅ push時                                          | —                  | ✅ push後の再検査 |
| **`--no-verify` バイパス** | ❌ 無効化される             | ✅ push時                                          | —                  | ✅ CI必須         |
| **新規CVE**                | —                           | —                                                  | ✅ 通知・PR作成    | ✅ 毎PR能動監査   |
| **コード脆弱性（XSS等）**  | —                           | —                                                  | —                  | ✅ CodeQL SAST    |
| **コード品質問題**         | ESLint（pre-commit）        | —                                                  | —                  | ✅ CodeQLクエリ   |

**重複の意図:** セキュリティは「一点突破されても他の層で止める」設計。重複は冗長性ではなく**多層防御**の本質。

#### 12.14.8 `ci.yml` との分離設計

| 項目           | `ci.yml`（既存）       | `security.yml`（新規）               |
| -------------- | ---------------------- | ------------------------------------ |
| **目的**       | 機能正常性の検証       | セキュリティ・脆弱性の検知           |
| **ジョブ**     | quality / test / build | dependency-audit / gitleaks / codeql |
| **トリガー**   | push + PR              | push + PR + 週次cron                 |
| **実行時間**   | 軽量（< 5分目安）      | 中量（CodeQLは5-10分）               |
| **失敗の意味** | ビルド・テスト失敗     | セキュリティ上の問題                 |

**分離理由:** CIとセキュリティは関心事が異なり、実行タイミング（週次schedule）・失敗時の対処法・担当権限も異なる。混在させると責任範囲が曖昧化するため、独立ワークフローとして運用する。

#### 12.14.9 設計判断（2026-04-13）

| 項目                                       | 判断   | 理由                                                                  |
| ------------------------------------------ | ------ | --------------------------------------------------------------------- |
| **専用ワークフローとして分離**             | 採用   | `ci.yml`の軽量性維持・関心の分離・schedule実行の独立性                |
| **`pnpm audit --prod --audit-level=high`** | 採用   | 本番依存のみ厳格。脆弱性は 12.10 の `pnpm.overrides` で能動対処済み   |
| **CodeQL `security-and-quality` クエリ**   | 採用   | セキュリティ+コード品質を同時検知。`security-extended` は誤検知が多い |
| **gitleaks二重防御**                       | 採用   | `--no-verify` バイパス対策。pre-commit単独では不十分                  |
| **週次schedule**                           | 採用   | コード未変更でも新規CVE・検出パターン更新に追従                       |
| **SBOM生成**                               | 不採用 | テンプレートでは配布形態が不確定。各プロジェクトで必要に応じて追加    |
| **ライセンス監査**                         | 不採用 | 商用/OSS方針がプロジェクトごとに異なる。テンプレートに入れると過剰    |
| **CSP nonce化**                            | 不採用 | Next.jsのSSR/SSG構成依存。各プロジェクトで実装                        |

#### 12.14.10 ローカル検証方法

```bash
# pnpm auditをローカルで事前確認
pnpm audit --prod --audit-level=high

# gitleaksをローカルで全履歴スキャン
gitleaks git . --verbose

# CodeQLはGitHub Actions上でのみ実行（ローカルでは不要）
```

### 12.15 Supabase DB保護（MCP + Bash + PITR）

Claude Code 経由で Supabase データベースを破壊するリスクは、MCP経由・Bash CLI経由・権限過剰なトークンの3経路で発生する。それぞれに対策を講じる。

#### 12.15.1 MCP経由の破壊操作（第1防御）

`.claude/settings.json` の `ask` で Supabase MCP の破壊系5種を承認必須化（12.12 参照）。さらに `.claude/hooks/db-destructive-warning.sh` による事前警告で二重確認を実現。

| ツール                           | 承認 | 警告Hook |
| -------------------------------- | ---- | -------- |
| `mcp__supabase__execute_sql`     | ask  | ✅       |
| `mcp__supabase__apply_migration` | ask  | ✅       |
| `mcp__supabase__delete_branch`   | ask  | ✅       |
| `mcp__supabase__reset_branch`    | ask  | ✅       |
| `mcp__supabase__merge_branch`    | ask  | ✅       |

#### 12.15.2 Bash経由の破壊操作（第2防御）

`settings.json` の `ask` で Supabase CLI および `psql` 直接実行も承認プロンプト対象化（2026-04-18 追加）。MCP と異なり Hook警告は発火しないが、ask 承認プロンプトにより意図しない実行を防ぐ。

| Bashパターン                        | 防止する操作                           |
| ----------------------------------- | -------------------------------------- |
| `Bash(psql:*)`                      | 直接的なSQL実行（DROP/DELETE等を含む） |
| `Bash(supabase db reset:*)`         | ローカル/リモートDBのリセット          |
| `Bash(supabase db push:*)`          | マイグレーションの強制適用             |
| `Bash(supabase db drop:*)`          | データベース/スキーマ削除              |
| `Bash(supabase migration repair:*)` | マイグレーション履歴の改変             |

#### 12.15.3 Hookスクリプトの改変検知（第3防御）

`.claude/hooks/db-destructive-warning.sh` を `scripts/protect-config.js` のチェックサム保護対象に追加（2026-04-18）。Hook を削除・改変した場合、pre-commit でコミットがブロックされる。

| 保護手段                     | 効果                                          |
| ---------------------------- | --------------------------------------------- |
| **SHA-256チェックサム**      | 1バイトの改変でも検知してコミットをブロック   |
| **`.config-checksums.json`** | 正しいチェックサムを Git 管理下で共有         |
| **pre-commitフック統合**     | `pnpm check` 経由で全コミットに対して自動検証 |

**復元方法:** `git checkout -- .claude/hooks/db-destructive-warning.sh` で正しい状態に戻せる。

#### 12.15.4 Supabaseトークン最小権限（運用推奨）

MCP・CLI が使用する Supabase アクセストークンは、Owner 権限ではなく以下の範囲で発行する。

| ロール     | 許可する操作                               | 本番DB影響 |
| ---------- | ------------------------------------------ | ---------- |
| **推奨**   | Developer（プロジェクトのコード/ブランチ） | 限定的     |
| **最小**   | 特定プロジェクト + read-only               | なし       |
| **非推奨** | Owner（課金・メンバー管理権限を含む）      | 全権       |

**本番環境の取扱い:** Claude Code には本番プロジェクト直結のトークンを渡さない。Supabase Branching 機能で作成した開発ブランチ専用トークンを使用し、マージは人間の手動確認で実施する。

#### 12.15.5 Point-in-Time Recovery（運用推奨）

Supabase の Point-in-Time Recovery（PITR）を有効化することで、万一破壊操作が実行された場合でも任意の時点まで復旧可能になる。

| 設定項目             | 推奨値                                                 |
| -------------------- | ------------------------------------------------------ |
| **PITR 有効化**      | 本番環境では必須（Pro plan 以上で利用可）              |
| **保持期間**         | 7日以上（Pro: 7日, Team: 14日, Enterprise: 28日）      |
| **自動バックアップ** | Free plan は日次のみ。本番運用は最低でも Pro plan 推奨 |

**設定場所:** Supabase Dashboard → Project Settings → Database → Backups

#### 12.15.6 設計判断（2026-04-18）

| 項目                                             | 判断 | 理由                                                                        |
| ------------------------------------------------ | ---- | --------------------------------------------------------------------------- |
| **Bash Supabase CLI を deny ではなく ask**       | 採用 | ローカル開発で `supabase db reset` を使うため。askで意図確認のみ            |
| **Hook改変検知に protect-config を利用**         | 採用 | 既存のチェックサム基盤を流用。新規スクリプト追加不要                        |
| **PITR を防御層に含めない**                      | 採用 | PITR は運用側の設定で、テンプレートコードでは強制できない                   |
| **トークン最小権限をテンプレート側で強制しない** | 採用 | Supabase 側の設定でテンプレートから制御不可。ドキュメントで運用推奨に留める |
| **Hook を exit 0 固定（fail-open）にする**       | 採用 | `exit 2` でブロックするとマイグレーション運用が止まる。警告表示に専念       |

#### 12.15.7 Hookスクリプトの完全仕様（再現可能性のため）

`.claude/hooks/db-destructive-warning.sh` は Claude Code の `PreToolUse` プロトコルに準拠した Bash スクリプト。再現実装に必要な全要素を以下に明記する。

**入出力プロトコル:**

| 項目          | 仕様                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| **stdin**     | JSON: `{"tool_name": "...", "tool_input": {...}}`（Claude Code が自動注入）                          |
| **stdout**    | 警告文（ユーザーのターミナルに表示される。Markdown 不可、ANSI シーケンス可）                         |
| **exit code** | 常に `0`（`PreToolUse` で `exit 2` を返すとツール呼出しがブロックされるが、本Hookは情報提供のみ）    |
| **環境変数**  | `CLAUDE_PROJECT_DIR`（リポジトリルート）。設定は `bash "$CLAUDE_PROJECT_DIR/.claude/hooks/..."` 形式 |

**処理アルゴリズム:**

```
1. set -u でundefined変数参照を即時失敗化（set -e は使わない: 警告文出力までは必ず到達させる）
2. INPUT=$(cat) で stdin の JSON を全量取得
3. node -e でインライン JavaScript を実行し JSON を解析
   - tool_name → TOOL 変数
   - tool_input.{query|migration_name|branch_id|name} の最初に存在する値 → PREVIEW 変数
   - PREVIEW は 300文字で truncate
   - JSON parse 失敗時は "(failed to parse tool input)" を返す（Hook自体は失敗させない）
4. cat <<WARNING ヒアドキュメントで警告文を stdout に出力
5. exit 0
```

**警告文の構成（変更厳禁の固定要素）:**

| セクション         | 内容                                                                               |
| ------------------ | ---------------------------------------------------------------------------------- |
| **ヘッダー**       | 罫線 + 🚨 アイコン + "データベース破壊的操作の警告"                                |
| **過去事故**       | 「本番DBが勝手に削除される事故が発生しました」の固定文                             |
| **チェックリスト** | 4項目（開発環境か / バックアップ取得済みか / 内容理解しているか / 明確な理由あり） |
| **対象操作**       | `${TOOL}` で MCP ツール名を動的表示                                                |
| **内容プレビュー** | `${PREVIEW}` で SQL/migration名/branch_id 等を動的表示                             |

**再現実装の要件:**

1. シェバン: `#!/usr/bin/env bash`
2. 実行権限: `chmod +x` 必須（`pnpm setup:sc` で自動付与）
3. node 依存: JSON 解析に node を使う（jq への依存を避けるため）
4. パス参照: `$CLAUDE_PROJECT_DIR` 経由で絶対参照（cwd 依存を避ける）
5. checksums: `scripts/.config-checksums.json` に SHA-256 を登録（改変検知のため）

**`settings.json` でのHook登録:**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__supabase__(execute_sql|apply_migration|delete_branch|reset_branch|merge_branch)",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/db-destructive-warning.sh\""
          }
        ]
      }
    ]
  }
}
```

**動作確認方法（DBに触れずに警告文を検証）:**

```bash
echo '{"tool_name":"mcp__supabase__execute_sql","tool_input":{"query":"DROP TABLE users;"}}' \
  | bash .claude/hooks/db-destructive-warning.sh
```

警告文がそのまま stdout に出力されれば正常動作。

#### 12.15.8 防御の限界と「うっかりミス防止」設計思想

12.15 の防御は **「完璧防御」ではなく「うっかりミス防止」** に最適化されている。これは意図的なトレードオフであり、限界を理解した上で運用すること。

**現実的な保護範囲:**

| シナリオ                                       | 12.15 で防げるか | 補完すべき層           |
| ---------------------------------------------- | ---------------- | ---------------------- |
| Claude が誤って提案した DROP 文を流し見でEnter | ✅ 防げる        | -                      |
| 疲労時の dev/prod 取り違え migration           | ✅ 防げる        | + プロンプト色分け推奨 |
| 意図的な「always allow」連打バイパス           | ❌ 防げない      | 運用教育・監査ログ     |
| 悪意ある第三者によるトークン盗用               | ❌ 防げない      | トークン最小権限・監査 |
| Supabase Studio ブラウザでの手動誤操作         | ❌ 範囲外        | PITR・操作ログ         |
| ターミナル直接操作（Claude Code外）でのミス    | ❌ 範囲外        | プロンプト色分け・PITR |

**設計上の限界:**

| 限界                                 | 詳細                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| **Hook は情報提供のみ**              | `exit 0` 固定（fail-open）。警告を読まずに承認すれば実行される                     |
| **ask は「always allow」で無効化**   | Claude Code 標準UIで「常に許可」を選ぶとセッション中スキップされる                 |
| **Bash 経路は単層防御**              | Bash CLI 実行時は ask のみ発火し、Hook警告は表示されない                           |
| **`settings.local.json` で上書き可** | ユーザー自身が `ask` を `allow` に override 可能（CLAUDE.md ルール#11 で禁止明記） |

**「優しく残る安全装置 > 厳しくて剥がされる防御」の原則:**

ask 対象を拡大して全DB操作を承認制にすると、プロンプト疲れにより「always allow」連打が起きて事実上の全バイパスとなる。Hook を `exit 2` ブロック化すると、正規のmigration運用が頻繁に詰まり、ユーザーが Hook を削除する。本テンプレートは **「週1〜2回の破壊的操作に5秒の確認コストを払う」** バランス点を採用する。

**防御を超える事故への対処:**

技術的防御では止められない誤操作（意図的バイパス、外部経路、人間判断ミス）への保険として、以下を運用層で実施する:

1. **Point-in-Time Recovery 有効化**（12.15.5）— 任意時点への復旧能力
2. **トークン最小権限**（12.15.4）— 影響範囲の限定
3. **dev/prod の物理分離** — Supabase プロジェクトを別アカウント/別組織で運用
4. **シェルプロンプトでのリンク先表示** — `supabase/.temp/project-ref` を読んで色分け表示するシェル関数を `~/.zshrc` に追加し、PROD リンク中は赤背景表示
5. **本番適用は人間の手動コマンド** — `supabase db push` を CI/CD ではなく人間の意図的実行に限定

これらは技術的防御層ではなく **運用ガードレール** であり、テンプレート側で強制できない領域。各プロジェクトで状況に応じて選択的に採用すること。

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

### 14.1 全体フロー（クローンから開発開始まで）

```bash
# 1. リポジトリクローン（GitHub Desktop推奨 / Chrome 146のボタン無効化問題に注意）
git clone [repository-url] my-app
cd my-app

# 2. 自動セットアップ（pnpm setup:sc が pnpm install を内包）
pnpm setup:sc
#   ↓ Pre-check（前提ツールの自動検出）
#   ↓ Step 0: pnpm install（node_modules 不在時のみ）
#   ↓ Step 1〜7: 環境構築・CI/CD・通知・セキュリティ自動化

# 3. Claude Code 起動（Cursor内ターミナル）
claude

# 4. 自然言語で機能実装を依頼
# 例: 「ユーザー認証機能を追加して」
#    → Claude Code が CLAUDE.md / SPECIFICATION.md を参照し
#      フィーチャー境界を遵守して実装

# 5. 動作確認（必要なときだけ・必須ではない）
pnpm dev
# ブラウザで http://localhost:3000 を開く
```

> **重要**: `pnpm dev` はセットアップの必須ステップではない。pre-commit フックで typecheck/lint/test/整合性チェックが自動実行されるため、コミット時点で品質が保証される。`pnpm dev` は実装の動作確認が必要になったときに起動する。

### 14.2 `pnpm setup:sc` の Pre-check 機能（前提ツール自動検出）

`pnpm setup:sc` 実行時、Step 0 の前に `checkPrerequisites()` 関数が前提ツールを自動検出する。新規PCで友人がクローンした際に、何が不足しているかを一目で把握できる仕組み。

#### 14.2.1 検出対象ツール

| 区分    | ツール                | コマンド           | 失敗時の挙動                       | 用途                                               |
| ------- | --------------------- | ------------------ | ---------------------------------- | -------------------------------------------------- |
| 🔴 必須 | **Node.js**           | `node --version`   | exit 1 + インストール案内表示      | Next.js / pnpm scripts の実行環境                  |
| 🔴 必須 | **pnpm**              | `pnpm --version`   | exit 1 + インストール案内表示      | 依存パッケージ管理 + setup スクリプト実行          |
| 🟡 任意 | **gh (GitHub CLI)**   | `gh --version`     | warning + 案内表示・続行           | 第5-6層セキュリティ自動化（Secret Scanning等）     |
| 🟡 任意 | **gitleaks**          | `gitleaks version` | warning + 案内表示・続行           | 第2層 pre-commit シークレット検出 + 第9層 二重防御 |
| 🟡 任意 | **uv**                | `uv --version`     | warning + 案内表示・続行           | Serena MCP（セマンティック検索・プロジェクト記憶） |
| 🟡 任意 | **claude (Code CLI)** | `claude --version` | warning + 案内表示・続行           | SuperClaude統合・MCPサーバー登録                   |
| 🟢 推奨 | **MCP サーバー4種**   | `claude mcp list`  | warning（claude CLI ある場合のみ） | AI ファースト開発の根幹                            |

#### 14.2.2 完全自動インストールを採用しない理由（鶏と卵問題）

| 理由           | 説明                                                                                  |
| -------------- | ------------------------------------------------------------------------------------- |
| **鶏と卵問題** | `pnpm setup:sc` を実行するには pnpm が必要。pnpm 自体を pnpm scripts では入れられない |
| **環境差異**   | macOS / Linux / Windows、Homebrew の有無、proxy 環境、sudo 権限の有無で挙動が変わる   |
| **副作用回避** | 友人のグローバル環境を勝手に変更すると不安感を与える。判断は人間に委ねる              |

→ **検出 + コピペ可能なコマンド表示**という最小自動化に留める。

#### 14.2.3 必須ツール不足時の出力例

```
━━━ Pre-check: 前提ツールの確認 ━━━

✗ Node.js: 未インストール（必須）
✗ pnpm: 未インストール（必須）

✗ 必須ツールが不足しています。以下を実行してから再度 pnpm setup:sc を実行してください:

  Node.js:
    brew install node  # または https://nodejs.org/ から公式インストーラー

  pnpm:
    brew install pnpm  # または npm install -g pnpm
```

→ 友人がコピペで対処可能。

#### 14.2.4 任意ツール不足時の出力例

```
━━━ Pre-check: 前提ツールの確認 ━━━

✓ Node.js: インストール済み
✓ pnpm: インストール済み
⚠ gh (GitHub CLI): 未インストール
⚠ gitleaks: 未インストール
⚠ uv: 未インストール
⚠ claude (Claude Code CLI): 未インストール

ℹ 任意ツールが未インストールです。フル機能を有効にするには以下を実行してください:

  gh (GitHub CLI) — 第5-6層セキュリティ自動化（Secret Scanning / Push Protection / ブランチ保護）
    brew install gh && gh auth login

  gitleaks — 第2層 pre-commit シークレット検出 + 第9層 二重防御
    brew install gitleaks

  uv — Serena MCP（セマンティック検索・プロジェクト記憶）
    curl -LsSf https://astral.sh/uv/install.sh | sh

  claude (Claude Code CLI) — SuperClaude統合・MCPサーバー登録
    npm install -g @anthropic-ai/claude-code

ℹ （不足のままでも基本セットアップは続行します）
```

→ 友人は判断して必要なものだけ入れられる。

#### 14.2.5 完全成功時の出力例（既存PC）

```
━━━ Pre-check: 前提ツールの確認 ━━━

✓ Node.js: インストール済み
✓ pnpm: インストール済み
✓ gh (GitHub CLI): インストール済み
✓ gitleaks: インストール済み
✓ uv (Python package manager): インストール済み
✓ claude (Claude Code CLI): インストール済み
✓ MCPサーバー: 4種すべて登録済み
```

→ 何もなくスムーズに Step 0 へ進む。

### 14.3 `pnpm setup:sc` の実行ステップ詳細（8ステップ）

| Step    | 内容                                                                                       | 既存ファイルがある場合         |
| ------- | ------------------------------------------------------------------------------------------ | ------------------------------ |
| **0**   | `pnpm install`（`node_modules` 不在時のみ）                                                | スキップ                       |
| **1**   | `.claude/settings.local.json` + `.env.local` 自動生成                                      | 既存ファイル保護のためスキップ |
| **2**   | `tests/unit/`, `tests/unit/features/` ディレクトリ作成                                     | 既存なら何もしない             |
| **3**   | Vitest 単体テスト環境構築                                                                  | 既存なら何もしない             |
| **4**   | `.github/workflows/ci.yml` + `security.yml` 生成                                           | 既存ならスキップ（破壊しない） |
| **5**   | SuperClaude v4 統合確認（CLAUDE.md / PROJECT_INFO.md の存在）                              | -                              |
| **5.5** | Claude Code 通知設定（対話式: Slack Webhook 等）                                           | 既設定ならスキップ             |
| **5.7** | セキュリティ自動セットアップ（gitleaks インストール / GitHub 設定 / グローバル gitignore） | 既設定ならスキップ             |
| **6**   | VS Code / Cursor 設定                                                                      | 既設定ならスキップ             |
| **7**   | 完了レポート + MCPサーバー設定手順表示                                                     | -                              |

### 14.4 MCPサーバー初回登録（claude CLI が必要）

```bash
# 前提: uv をインストール（Serena MCP に必要）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 必須MCPサーバー4種を登録
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
claude mcp add morphllm-fast-apply -- npx @morph-llm/morph-fast-apply /home/

# 接続確認
claude mcp list
```

→ 詳細はセクション20を参照。

### 14.5 環境変数の設定（必要に応じて）

```bash
# .env.local は pnpm setup:sc で自動生成済み
# Supabase 等の外部サービスを使用する場合のみ編集
nano .env.local
```

### 14.6 設計判断（2026-04-14）

| 項目                           | 判断 | 理由                                                             |
| ------------------------------ | ---- | ---------------------------------------------------------------- |
| **Pre-check で必須ツール検証** | 採用 | 鶏と卵問題があるため自動インストールはせず、検出と案内に留める   |
| **任意ツールも warning 表示**  | 採用 | 不足していても基本セットアップは続行可能。フル機能化は人間が判断 |
| **MCP登録チェック**            | 採用 | claude CLI がある場合のみ実行。SuperClaude のMCP-First原則を支援 |
| **エラーメッセージへの案内**   | 採用 | コピペ可能なコマンドを表示し、友人の認知負荷を最小化             |
| **既存ファイル破壊の禁止**     | 採用 | Step 1〜6 すべて存在チェックでスキップ。再実行で破壊されない     |

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

### 17.2 テストカバレッジ仕様（v3.7.5〜の完全版）

#### 17.2.1 設計思想

テンプレートデフォルトでは **カバレッジ閾値（thresholds）による強制は行わず、計測のみ実施** する設計。これは PR運用OFF（個人開発デフォルト）と整合させた設計判断であり、過去の実装ミスを正直に解消した結果でもある。

| 観点               | 設計判断                                | 理由                                           |
| ------------------ | --------------------------------------- | ---------------------------------------------- |
| **強制力**         | なし（thresholds 削除）                 | レビュアー不在の個人開発で強制しても機能しない |
| **計測**           | 毎回実施（v8 provider）                 | どこにテストがないか可視化する価値はある       |
| **レポート**       | `coverage/index.html` 自動生成          | 必要時にローカル/CI から閲覧可能               |
| **CI保持**         | `actions/upload-artifact@v4` で14日     | 過去の coverage を遡って確認可能               |
| **強制が必要なら** | クローン後に追加（手順は §17.2.4 参照） | プロジェクト固有事情で強制したい場合のみ       |

#### 17.2.2 計測フロー（再現手順）

```bash
# 方法1: pnpm validate 経由（v3.7.5〜推奨）
# → 型/lint/境界/テスト合否/カバレッジ計測/ビルド を一発で完結
pnpm validate

# 方法2: 単独実行（カバレッジだけ見たい時）
pnpm test:coverage

# どちらの方法でも同じレポートが生成される:
#   coverage/index.html         ← HTML レポート（メイン）
#   coverage/coverage-final.json ← JSON 形式（プログラム処理用）
#   coverage/lcov.info           ← LCOV 形式（外部ツール連携用）

# レポート閲覧
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

#### 17.2.3 v3.7.5 で削除された旧仕様（過去の経緯）

旧仕様（v3.7.4 まで）は以下の構造で `vitest.config.ts` に存在していた:

```typescript
// ❌ 旧仕様（vitest v3 系で実効していなかった）
thresholds: {
  global: {  // ← この `global:` キーが v3 系では認識されない
    branches: 90, functions: 90, lines: 90, statements: 90,
  },
  'src/features/**/': {
    branches: 95, functions: 95, lines: 95, statements: 95,
  },
}
```

**問題点（v3.7.5 で発覚）:**

1. `global:` キーは vitest v1 系の記法で、v3 系では `thresholds` 直下にフラットに記述する必要がある
2. `pnpm test:coverage` 実行時に閾値違反でも exit 0 を返していた（強制力ゼロ）
3. `vitest.config.ts:17` のコメント「🔴 95%品質: テストカバレッジ強制」と実態が乖離
4. CLAUDE.md / SPECIFICATION.md でも「90%強制」と記載され、AI ファースト原則違反
5. テンプレートが標榜していた「97%品質モード」は実装上は機能していなかった

**v3.7.5 での対処:**

- `thresholds` セクション全削除
- 「個人開発前提では強制不要」という設計判断に整合させる
- 必要なプロジェクトには §17.2.4 の手順を提供

#### 17.2.4 チーム開発移行時のカバレッジ強制設定（v3 系正しい記法）

PR運用ON（チーム開発）に移行するプロジェクトで品質ゲートが必要な場合、`vitest.config.ts` に以下を追加する:

```typescript
// ✅ vitest v3 系の正しい記法
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: ['node_modules/', 'tests/', '*.config.*', '.next/', 'scripts/'],
  // フラット記法でグローバル閾値を指定
  thresholds: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
    // glob パターン別の閾値（フィーチャーは厳格に）
    'src/features/**': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

**閾値の推奨設定（プロジェクトの成熟度別）:**

| プロジェクト段階 | global | features | 理由                           |
| ---------------- | ------ | -------- | ------------------------------ |
| 初期実装中       | 50%    | 60%      | テストを書く文化を作る最低限   |
| 成熟プロジェクト | 70%    | 80%      | 一般的な業界標準               |
| 高品質要求       | 80%    | 90%      | 金融・医療等のコンプライアンス |
| 最高品質         | 90%+   | 95%+     | ライブラリ・SDK等              |

**注意事項:**

- `vitest.config.ts` は設定ファイル保護対象（`scripts/protect-config.js`）。変更後は `node scripts/protect-config.js --update` でチェックサム更新が必要
- 閾値を高く設定し過ぎると CI が常時失敗する。最初は低めに設定して段階的に引き上げる運用を推奨
- `perFile: true` を追加すると「ファイル単位で閾値を満たさないとエラー」になる（より厳格）

#### 17.2.5 CI でのカバレッジアーティファクト

`.github/workflows/ci.yml` の `test` ジョブで `pnpm test:coverage` を実行し、`coverage/` 全体を `actions/upload-artifact@v4` でアップロード:

```yaml
- name: 単体テスト + カバレッジ計測
  run: pnpm test:coverage

- name: カバレッジレポートをアーティファクト化
  if: always() # テスト失敗時もレポートを保持
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
    retention-days: 14
```

**閲覧方法:**

1. `https://github.com/<owner>/<repo>/actions` を開く
2. 該当の CI 実行行をクリック
3. ページ下部の "Artifacts" セクションから `coverage-report` をダウンロード
4. ZIP 解凍 → `index.html` をブラウザで開く

#### 17.2.6 `pnpm validate` への coverage 統合（v3.7.5〜）

`scripts/validate-sc.js` の修正により、`pnpm validate` 一発で coverage 計測まで完結する:

```javascript
// scripts/validate-sc.js（v3.7.5〜）
const testResult = runCommand(`${pmRun} test:coverage`, true, true)
// ↑ 旧: test:unit を呼んでいた（カバレッジ計測なし）
// 新: test:coverage を呼ぶ（計測 + HTML 生成）
```

**運用上の効果:**

- コミット前に `pnpm validate` するだけで `coverage/index.html` が常に最新化
- 「カバレッジ計測を忘れる」事態がなくなる
- 実行時間の増加は誤差レベル（+2秒程度）
- `test:regression` は別途呼ばれる（重複だが UI 表示で「回帰テスト合格」を別出力する価値あり）

### 17.3 コード品質

### 17.3 コード品質

- ESLint 9 flat config（`eslint.config.mjs`）
- Prettier統合
- 境界違反ゼロトレランス

#### ESLint除外パターン（Global ignores）

| パターン                       | 理由                       |
| ------------------------------ | -------------------------- |
| `.next/**`                     | Next.jsビルド出力          |
| `node_modules/**`              | 依存パッケージ             |
| `coverage/**`                  | テストカバレッジ出力       |
| `*.config.js` / `*.config.mjs` | 設定ファイル               |
| `scripts/**/*.js`              | ユーティリティスクリプト   |
| `out/**` / `build/**`          | ビルド出力                 |
| `public/**`                    | 静的アセット（リント不要） |
| `next-env.d.ts`                | Next.js自動生成型定義      |

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

### 20.8 MCP利用ポリシー（ティア分類）

本テンプレートは Claude Code の MCP サーバーを「ネイティブツールを補完する拡張能力」と位置づけ、**プロンプトで代替可能か** を基準に 3 ティアで分類する。

#### 20.8.1 設計原則

| 原則                                | 内容                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| **ネイティブ一次選択**              | Read / Edit / MultiEdit / Grep / Glob / Bash 等のネイティブツールは日常的な一次選択肢             |
| **MCP は拡張能力**                  | ネイティブで代替不可能な質的価値を持つ場面でのみ MCP を選択                                       |
| **Opus 4.7 のネイティブ推論を信頼** | モデル本体が構造化推論をネイティブに行うため、Sequential-thinking 等の推論補助 MCP は必須ではない |
| **整合性優先**                      | CLAUDE.md の MCP 記述は本ポリシーと一致させる。乖離は整合性原則違反として扱う                     |

#### 20.8.2 ティア定義と分類基準

**🟢 ティア1: 必須（プロンプト代替不可）**

プロンプト工夫では実現不可能な機能を提供する MCP。本テンプレートの動作前提。

| MCP          | 理由                                                            | 代替不可能な機能                                                                |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Serena**   | LSP ベースのセマンティック検索・プロジェクト記憶は実 API が必要 | `find_symbol`、`find_referencing_symbols`、`write_memory`（セッション間永続化） |
| **Supabase** | DB・Edge Functions への直接 API 呼び出し                        | `list_tables`、`apply_migration`、`deploy_edge_function`                        |

**🟡 ティア2: 推奨（質的価値あり・ケース次第）**

プロンプトで部分代替可能だが、特定場面で明確な質的価値を持つ MCP。

| MCP          | 適用場面                        | プロンプト代替の限界                                          |
| ------------ | ------------------------------- | ------------------------------------------------------------- |
| **Context7** | ライブラリ API 厳守が必要な場面 | WebFetch で代替可だが、公式パターンのキュレーション精度が劣る |
| **Stitch**   | UI デザイン成果物の生成         | 手動 CSS/HTML でも可だが、デザインシステム整合性で優位        |

**🟠 ティア3: 補助（ネイティブで十分な場面多い）**

ネイティブツールで大部分代替可能。特定条件下でのみ効果的。

| MCP                     | 使用が効果的な条件                                  | ネイティブ代替手段                                 |
| ----------------------- | --------------------------------------------------- | -------------------------------------------------- |
| **Morphllm-fast-apply** | 10 ファイル超の一括パターン置換                     | 3〜5 ファイル程度は MultiEdit で十分               |
| **Sequential-thinking** | Opus 4.7 のネイティブ推論で不足する多段階構造化設計 | 「ステップバイステップで考えて」プロンプトで代替可 |
| **IDE**                 | VS Code 診断情報の即時取得                          | `pnpm typecheck`、`pnpm lint` で代替可             |

#### 20.8.3 タスク別ツール選択指針

| タスク種別                        | 一次選択               | 補足                                             |
| --------------------------------- | ---------------------- | ------------------------------------------------ |
| **コード検索（シンボル）**        | Serena (`find_symbol`) | 関数・クラスの定義追跡                           |
| **コード検索（テキスト）**        | Grep / Glob            | 純粋なテキストマッチ                             |
| **ファイル読み込み**              | Read                   | 単一ファイル                                     |
| **ファイル編集（1〜5 件）**       | Edit / MultiEdit       | ネイティブで十分                                 |
| **ファイル編集（10 件超の一括）** | Morphllm               | パターン置換に特化                               |
| **複雑な分析・デバッグ**          | ネイティブ推論         | 多段階構造化が有益な場面のみ Sequential-thinking |
| **ドキュメント参照**              | Context7               | ライブラリ API 厳守が必要な場面                  |
| **DB 操作**                       | Supabase MCP           | 破壊系 5 種は ask + Hook 警告発動                |
| **UI デザイン**                   | Stitch MCP             | UI 作業時のみ                                    |

#### 20.8.4 MCP 適用が効果的なキーワード（ヒント）

以下のキーワードが出現した場合、対応する MCP 適用を **検討する**（必須ではない）。

| キーワード                              | 推奨 MCP                              | 用途               |
| --------------------------------------- | ------------------------------------- | ------------------ |
| 関数 / クラス / シンボル                | Serena `find_symbol`                  | シンボル検索       |
| 依存関係                                | Serena `find_referencing_symbols`     | 参照元追跡         |
| プロジェクト記憶 / 記憶                 | Serena `write_memory` / `read_memory` | セッション間永続化 |
| データベース / マイグレーション         | Supabase                              | DB 操作            |
| Edge Function                           | Supabase `deploy_edge_function`       | サーバーレス       |
| React / Next.js / Vue / Tailwind        | Context7                              | 公式ドキュメント   |
| UI デザイン / プロトタイプ / スクリーン | Stitch                                | デザイン生成       |
| 一括編集（10 ファイル超）               | Morphllm                              | パターン置換       |

#### 20.8.5 設計変更の経緯（2026-04-18）

**旧ポリシー（〜v3.6.0）**: CLAUDE.md に「MCP-First 原則（最優先・絶対遵守）」「ネイティブツールは最終手段」「ALWAYS USE MCP FIRST」等の絶対表現を多用。

**問題点**:

| 項目                | 具体例                             | 影響                                                       |
| ------------------- | ---------------------------------- | ---------------------------------------------------------- |
| **事実誤認**        | 「絶対に使わない: bash grep/find」 | 境界検出スクリプト等で bash grep を実運用中（自己矛盾）    |
| **Opus 4.7 不整合** | 「複雑な分析は必ず Sequential」    | Opus 4.7 はネイティブで構造化推論するため冗長              |
| **優先度誤認**      | 「最優先・絶対遵守」               | 「最優先」はセキュリティ専用。MCP 選択は性能・品質レイヤー |
| **整合性原則違反**  | ドキュメント ↔ 実装乖離            | 本テンプレート自身の原則（`tests/consistency/`）と矛盾     |

**新ポリシー（v3.7.0〜）**: 上記 20.8.1〜20.8.4 の 3 ティア分類。絶対表現を推奨レベルに軟化し、ネイティブツールを一次選択と明示。

**対応実施**: CLAUDE.md 8 箇所の外科的修正（+63 / -45 行）。整合性テスト 40 件 + ユニットテスト 49 件全通過、境界違反 0、型エラー 0、Lint エラー 0、ビルド成功を確認。

#### 20.8.6 今後の運用方針

| 観点                                 | 方針                                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **新 MCP 追加時の判断**              | 「プロンプトで代替可能か」を第一基準。代替不可能のみティア1、質的価値ありのみティア2 に分類                      |
| **SuperClaude 本家のバージョン追随** | 新モデル（Opus/Sonnet の次世代）と新 MCP プロトコルのみ追随。スラッシュコマンド・Skills の追加は原則取り込まない |
| **絶対表現の扱い**                   | 「絶対」「必須」「ALWAYS」「最優先」は セキュリティ・データ安全性・本番破壊防止に限定。MCP 選択には使わない      |
| **整合性テスト**                     | CLAUDE.md の MCP リストと SPECIFICATION.md の 20.8 ティア分類は `mcp-list.test.ts` で自動検証                    |

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

## 22. Claude Code Skills & Sub-agents

### 22.1 概要

Claude Code のベストプラクティス（https://code.claude.com/docs/ja/best-practices）に基づき、再利用可能なワークフロー（Skills）と専門レビューエージェント（Sub-agents）をテンプレートに導入した。

| 項目         | 内容                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| **目的**     | 頻繁に使うワークフローを明示呼出し可能にし、専門レビューをメインコンテキストと分離して実行可能にする |
| **設計原則** | 既存機能を一切変更しない純粋な追加。CLAUDE.mdのルールは常時適用のまま維持                            |
| **導入日**   | 2026-03-30                                                                                           |
| **根拠**     | Claude Code公式ベストプラクティスの「Skills」「Custom Sub-agents」セクション                         |

### 22.2 設計判断

| 判断事項                        | 決定                                          | 理由                                                                                                 |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| CLAUDE.mdのルールをSkillsに移動 | **しない**                                    | Skillsはオンデマンド読込のため「常時適用」の保証が失われる。境界ルール・セキュリティルールは常時必要 |
| Skills の自動読込               | **無効化** (`disable-model-invocation: true`) | ユーザーが明示的に呼び出した時のみ動作。既存の動作に一切影響しない                                   |
| CLAUDE.md の大幅スリム化        | **しない**                                    | MCP優先動作・日本語キーワードトリガー・コード例はCLAUDE.md固有の知識であり、削除すると機能低下する   |
| @superclaude/ 参照の削除        | **しない**                                    | テンプレートをクローンした友人はsuperclaude/しか持たない。削除するとテンプレートの可搬性が壊れる     |
| PostToolUse Hooks の追加        | **しない**                                    | 複雑なシェルスクリプトは壊れやすい。既存のGit pre-commitフックで境界チェックは十分保証されている     |

### 22.3 ファイル構成

```
.claude/
├── settings.json                          # パーミッション設定（既存）
├── protected-features.example.json        # フィーチャー保護設定サンプル（既存）
├── skills/                                # 明示呼出し型ワークフロー（新規）
│   ├── fix-bug/
│   │   └── SKILL.md                       # バグ修正プロトコル（分析+回帰テスト統合版）
│   └── security/
│       └── SKILL.md                       # セキュリティ診断+実装
└── agents/                                # 専門レビューエージェント（新規）
    └── boundary-reviewer.md               # フィーチャー境界違反レビュー
```

### 22.4 Skills 詳細仕様

#### 共通仕様

| 項目                         | 値                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------- |
| **配置場所**                 | `.claude/skills/<skill-name>/SKILL.md`                                        |
| **フロントマター**           | YAML形式（name, description, disable-model-invocation）                       |
| **自動読込**                 | 無効（`disable-model-invocation: true`）                                      |
| **呼出し方法**               | `/<skill-name> [引数]`                                                        |
| **引数の受け渡し**           | SKILL.md内の `$ARGUMENTS` に展開される                                        |
| **セッション検出タイミング** | Claude Code起動時にスキャン。起動中に作成したスキルは次回起動まで認識されない |
| **既存機能への影響**         | なし（純粋な追加）                                                            |

#### /fix-bug — バグ修正プロトコル（分析＋回帰テスト統合版）

| 項目                  | 内容                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| **ファイル**          | `.claude/skills/fix-bug/SKILL.md`                                                                  |
| **呼出し方法**        | `/fix-bug [バグの説明]`                                                                            |
| **例**                | `/fix-bug ログイン画面で無限ループが発生する`                                                      |
| **CLAUDE.mdとの関係** | CLAUDE.mdの「バグ修正プロトコル」セクションと同じルールを手順化。CLAUDE.mdのルールは常時有効のまま |

**実行フロー（9ステップ）:**

先頭に `ultrathink` を付与し、深い分析モードで実行する。

```
1. 原因特定（Root Cause Analysis）
   → エラーに関係するファイルと依存関係をすべて読み込み
   → 根本原因を特定し報告
   → 根本原因と表面的な症状を区別して説明

2. 影響範囲の確定（Impact Assessment）
   → 修正対象ファイルを一覧化
   → 各ファイルの変更箇所（行番号/関数名）・変更内容・影響なしの理由を明示

3. 回帰テスト作成
   → tests/regression/YYYY-MM-DD-NNN-description.test.ts
   → テンプレートに従いテストコードを生成

4. テスト失敗確認
   → pnpm test:regression

5. 根本原因を修正
   → 症状ではなく原因を修正
   → 複雑な場合はSequential-thinkingで分析
   → Serenaでシンボル・依存関係を追跡
   → フィーチャー境界を遵守

6. テスト成功確認
   → pnpm test:regression

7. 全体検証（エラー0になるまで繰り返し）
   → pnpm lint → エラー・警告をすべて修正
   → pnpm typecheck → 型エラーをすべて修正
   → pnpm test → 失敗テストをすべて修正
   → pnpm check:boundaries → 違反をすべて修正
   → pnpm build → ビルドエラーをすべて修正
   → 全て0になるまで繰り返す。途中で停止しない

8. 最終報告
   → 根本原因（1行）
   → 変更ファイル一覧
   → リント/型/ビルドエラー数（全て0であること）
   → 既存機能への影響: なし / あり（詳細）

9. コミット
   → バグIDを参照する説明的メッセージ
```

**テストテンプレート:**

```typescript
/**
 * Bug ID: YYYY-MM-DD-NNN
 * Date: YYYY-MM-DD
 * Issue: [具体的な問題の説明]
 * Feature: [関連フィーチャー]
 * Fixed by: [修正コミット]
 */
describe('Regression: [ID] - [説明]', () => {
  it('should [期待動作]', () => {
    // バグ再現テスト
  })
})
```

**制約:**

- 回帰テストは永続的（削除禁止）
- エラーに直接関係する箇所のみ変更（リファクタリング・改善禁止）
- 既存のUI、UX、ルーティング、コンポーネント構造を変更しない
- 修正と無関係なファイルを編集しない
- 設定ファイル（tsconfig.json, eslintrc等）の変更禁止
- 既存テストの無効化・スキップ禁止

**注**: `/react-safety` スキルは削除済み（2026-03-30）。React無限ループ防止ルールはCLAUDE.mdに常時読み込みで存在し、無限ループ発生時は `/fix-bug` で対応するため、独立スキルとしての役割が重複していた。

#### /security — セキュリティ診断+実装

| 項目                | 内容                                                                                |
| ------------------- | ----------------------------------------------------------------------------------- |
| **ファイル**        | `.claude/skills/security/SKILL.md`                                                  |
| **呼出し方法**      | `/security [対象領域]`                                                              |
| **例**              | `/security`, `/security auth`, `/security db`, `/security env`                      |
| **引数**            | 任意。`env`, `auth`, `db`, `api`, `deps`, `frontend` のいずれか。省略時は全スキャン |
| **9層防御との関係** | 9層防御がカバーしない領域（RLS未設定、認証チェック漏れ、NEXT*PUBLIC*誤用等）を補完  |

**実行フロー（6ステップ）:**

```
1. スキャン
   → 対象カテゴリのファイル・設定を読み込み

2. 診断
   → 問題を重大度別に分類（CRITICAL/HIGH/MEDIUM/LOW）
   → ファイル:行番号、リスク、修正方法を報告

3. 提案
   → 全発見事項のサマリーテーブルを提示
   → ユーザーにどの項目を実装するか確認

4. 実装
   → 承認された項目のみ実装
   → 既存機能を壊さないことを確認

5. 検証
   → pnpm check:boundaries → typecheck → lint → test → build
   → エラー0になるまで繰り返す

6. 最終報告
   → 発見数（重大度別）、修正数、変更ファイル、残りの推奨事項
```

**チェックカテゴリ:**

| カテゴリ     | チェック内容                                                     |
| ------------ | ---------------------------------------------------------------- |
| **env**      | NEXT*PUBLIC*に秘密情報なし、.env.local存在、ハードコード秘密なし |
| **auth**     | API routeの認証チェック、httpOnly Cookie、CSRF保護               |
| **db**       | Supabase RLS、パラメータ化クエリ、service role key非公開         |
| **api**      | レート制限、CORS設定、入力バリデーション                         |
| **deps**     | pnpm audit、不要依存の削除                                       |
| **frontend** | dangerouslySetInnerHTML、XSS、localStorage機密データ             |

**旧security-reviewerとの違い:**

| 項目 | 旧 security-reviewer（削除済み） | /security                      |
| ---- | -------------------------------- | ------------------------------ |
| 種別 | サブエージェント（レビューのみ） | スキル（診断+実装）            |
| 手法 | grepで文字列検索                 | ファイル構造・設定・コード分析 |
| 出力 | 問題報告のみ                     | 検出→提案→実装→検証            |
| 対話 | 不可                             | ユーザーに確認してから実装     |

### 22.5 Sub-agents 詳細仕様

#### 共通仕様

| 項目                           | 値                                                                       |
| ------------------------------ | ------------------------------------------------------------------------ |
| **配置場所**                   | `.claude/agents/<agent-name>.md`                                         |
| **フロントマター**             | YAML形式（name, description, tools）                                     |
| **実行コンテキスト**           | メイン会話とは**別のコンテキストウィンドウ**で実行                       |
| **呼出し方法**                 | 自然言語で指示（例: 「サブエージェントで境界チェックして」）             |
| **利用可能ツール**             | フロントマターの `tools` で制限（Read, Grep, Glob, Bash）                |
| **メインコンテキストへの影響** | なし。結果の要約のみ報告。探索によるコンテキスト消費がメインに波及しない |
| **既存機能との関係**           | `pnpm check:boundaries`等の既存コマンドと共存。置き換えではなく補完      |

#### boundary-reviewer — フィーチャー境界違反レビュー

| 項目         | 内容                                            |
| ------------ | ----------------------------------------------- |
| **ファイル** | `.claude/agents/boundary-reviewer.md`           |
| **ツール**   | Read, Grep, Glob, Bash                          |
| **呼出し例** | 「サブエージェントで境界チェックして」          |
|              | 「boundary-reviewerエージェントでレビューして」 |

**検査項目:**

| #   | 検査内容                           | 検出パターン                                                     | 深刻度   |
| --- | ---------------------------------- | ---------------------------------------------------------------- | -------- |
| 1   | フック公開違反                     | `export.*use[A-Z]` in `src/features/*/index.ts`                  | CRITICAL |
| 2   | 他フィーチャー内部ディレクトリ参照 | `from '@/features/[name]/(components\|hooks\|utils\|api\|types)` | CRITICAL |
| 3   | 相対パスでのフィーチャー横断       | `from '../../` in `src/features/`                                | CRITICAL |
| 4   | UIコンポーネント共有               | 他フィーチャーからのコンポーネントimport                         | HIGH     |
| 5   | 状態管理リーク                     | グローバルstateの使用                                            | HIGH     |

**出力形式:**

```
[SEVERITY] file:line - Description
  Violation: <the offending code>
  Fix: <suggested correction>
```

違反がない場合: `"All feature boundaries are intact."`

**`pnpm check:boundaries`との違い:**

| 項目             | `pnpm check:boundaries`     | boundary-reviewer                            |
| ---------------- | --------------------------- | -------------------------------------------- |
| 実行方式         | grepベースのパターンマッチ  | サブエージェントによる意味的分析             |
| コンテキスト消費 | メインコンテキストを使用    | **別コンテキスト**で実行（メインに影響なし） |
| 分析深度         | パターン一致のみ            | コードの意味を理解した上で判断               |
| 修正提案         | なし（違反の有無のみ）      | 具体的な修正案を提示                         |
| 用途             | CI/コミット前の自動チェック | 開発中の詳細レビュー                         |

**注**: `security-reviewer` サブエージェントは削除済み（2026-03-30）。9層防御（gitleaks, GitHub Secret Scanning, Push Protection, Dependabot, セキュリティヘッダー, CodeQL等）が自動で動作しており、手動サブエージェントの実用場面がなかったため。

### 22.6 既存機能との共存マトリクス

| 新機能            | 既存機能                    | 関係性 | 説明                                                                      |
| ----------------- | --------------------------- | ------ | ------------------------------------------------------------------------- |
| `/fix-bug`        | CLAUDE.mdバグ修正プロトコル | 補完   | 分析+回帰テスト+検証ループの9ステップを明示呼出し可能に。ルールは常時有効 |
| `/security`       | 9層防御                     | 補完   | 9層防御がカバーしない領域（RLS、認証チェック、入力検証等）を診断+実装     |
| boundary-reviewer | `pnpm check:boundaries`     | 補完   | grepチェックに加え意味的分析を別コンテキストで実行                        |

**重要**: いずれの新機能も既存機能を**置き換えない**。既存のCLAUDE.mdルール、`pnpm check:boundaries`、9層防御、Git Hooksは全て従来通り動作する。

### 22.7 セッション検出と利用フロー

```
1. Claude Code起動
   → .claude/skills/ をスキャン → /fix-bug を登録
   → .claude/agents/ をスキャン → boundary-reviewer を登録

2. 開発セッション開始
   → /sc:load（従来通り）
   → Serenaプロジェクト起動 + メモリ復元

3. バグ修正が必要な場合
   → /fix-bug [バグの説明]
   → ultrathink + 原因特定→影響範囲→回帰テスト→修正→検証ループ→最終報告の9ステップが自動展開

4. React無限ループが発生した場合
   → /fix-bug PCが発熱しCPU100%。React無限ループの可能性
   → 9ステップのバグ修正プロトコルが自動展開

5. 境界違反の詳細レビューが必要な場合
   → 「サブエージェントで境界チェックして」
   → 別コンテキストで分析、メインコンテキストを汚さない

6. セキュリティレビューが必要な場合
   → 「サブエージェントでセキュリティレビューして」
   → 別コンテキストで分析、結果の要約のみ報告
```

**注意**: セッション起動中に作成・編集したスキル/エージェントは、次回のClaude Code起動まで認識されない。

### 22.8 メンテナンス方針

| 操作               | 手順                                                           |
| ------------------ | -------------------------------------------------------------- |
| スキルの追加       | `.claude/skills/<name>/SKILL.md` を作成。Git管理対象           |
| スキルの編集       | SKILL.mdを直接編集。次回起動時に反映                           |
| スキルの削除       | ディレクトリごと削除。CLAUDE.mdの変更不要                      |
| エージェントの追加 | `.claude/agents/<name>.md` を作成。Git管理対象                 |
| エージェントの編集 | mdファイルを直接編集。次回起動時に反映                         |
| エージェントの削除 | mdファイルを削除。CLAUDE.mdの変更不要                          |
| CLAUDE.mdへの影響  | スキル/エージェントの追加・削除はCLAUDE.mdの変更を必要としない |

---

## 23. ドキュメント整合性チェック（AI ファースト時代の型システム）

### 23.1 設計思想

AI ファースト開発において、ドキュメントは **AI への命令書**である。Claude Code は CLAUDE.md / SPECIFICATION.md / SETUP_GUIDE.md を真実として参照し、それを基に実装を行う。したがって、**ドキュメントと実装の乖離は誤った実装の連鎖を引き起こす**。

このテンプレートでは、ドキュメント整合性を「型システムに匹敵する保証装置」として扱い、CIで自動検証する。

### 23.2 整合性チェックの構成

| 項目               | 内容                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| **配置場所**       | `tests/consistency/`                                                     |
| **テスト基盤**     | Vitest（既存テストインフラを流用）                                       |
| **実行タイミング** | pre-commitフック + CIの`test`ジョブ（自動）                              |
| **失敗時の挙動**   | コミット・PRがブロックされる                                             |
| **テスト総数**     | 40テスト（7ファイル・v3.5.0 で `SUPERCLAUDE_FINAL.md` を検証対象に追加） |

### 23.3 7つの整合性テストファイル

#### 🔴 Phase 1: 致命的問題の防止

| ファイル                     | 検証内容                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `setup-templates.test.ts`    | `setup.js` 内の `ci.yml` / `security.yml` テンプレート文字列が実ファイルと完全一致 |
| `command-references.test.ts` | ドキュメント内の pnpm コマンド参照が `package.json` scripts に実在                 |
| `file-references.test.ts`    | ドキュメント内のファイルパス参照（`scripts/...`等）が実在                          |

#### 🟡 Phase 2: 構造的整合性

| ファイル                  | 検証内容                                                                 |
| ------------------------- | ------------------------------------------------------------------------ |
| `version-numbers.test.ts` | `package.json` engines.node・packageManager が docs / ワークフローと一致 |
| `layer-count.test.ts`     | 「N層防御」の数が CLAUDE.md と SPECIFICATION.md で一致                   |

#### 🟢 Phase 3: 品質向上

| ファイル                  | 検証内容                                                                |
| ------------------------- | ----------------------------------------------------------------------- |
| `protected-files.test.ts` | `protect-config.js` の PROTECTED_FILES が CLAUDE.md の保護対象表と一致  |
| `mcp-list.test.ts`        | 必須MCPサーバー4種が CLAUDE.md / SETUP_GUIDE.md / setup.js すべてに記載 |

### 23.4 検証する整合性問題の8類型

| #   | 類型                               | 検出ファイル                                   |
| --- | ---------------------------------- | ---------------------------------------------- |
| 1   | コード内テンプレート vs 実ファイル | `setup-templates.test.ts`                      |
| 2   | コード内テンプレート完全欠落       | `setup-templates.test.ts`                      |
| 3   | 数値の不整合（層の数等）           | `layer-count.test.ts`                          |
| 4   | 存在しないファイル/関数の参照      | `file-references.test.ts`                      |
| 5   | 存在しないコマンドの参照           | `command-references.test.ts`                   |
| 6   | バージョン番号の乖離               | `version-numbers.test.ts`                      |
| 7   | 設定ファイル間の不整合             | `version-numbers.test.ts`                      |
| 8   | 重複情報源の不整合                 | `mcp-list.test.ts` / `protected-files.test.ts` |

### 23.5 失敗時のメッセージ設計

整合性テストの失敗メッセージは、**AI が読んで自動修正できる粒度**で設計されている:

- ❌ Bad: `Expected X to be Y`
- ✅ Good: 具体的な不整合内容 + 修正方法のステップ + 影響範囲

例（`setup-templates.test.ts`）:

```
setup.js 内の ci.yml テンプレートと .github/workflows/ci.yml が一致しません

修正方法:
  1. setup.js の ciWorkflow テンプレートと .github/workflows/ci.yml を一致させてください
  2. 実ファイルが正しい場合: setup.js の該当箇所を更新
  3. テンプレートが正しい場合: pnpm prettier --write .github/workflows/ci.yml
```

### 23.6 導入時に検出された既存不整合（2026-04-14）

整合性テスト導入時に、**3件の既存不整合**が検知された:

| #   | 検知箇所            | 不整合内容                                                                     | 対処                                                          |
| --- | ------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 1   | `protect-config.js` | `.eslintrc.json` / `next.config.js` / `jest.config.js`（古いファイル名）を参照 | 実ファイル名（`eslint.config.mjs` / `next.config.mjs`）に修正 |
| 2   | `protect-config.js` | 上記により実質4ファイルしか保護していなかった                                  | 6ファイル（eslint・nextを追加）を正しく保護                   |
| 3   | テスト正規表現      | 「第N層防御」（個別層名）と「N層防御」（全体体制）を区別できていなかった       | lookbehind `(?<!第)` で除外                                   |

**この発見は整合性チェックの価値を実証している**。テストがなければ、`protect-config.js` が**実際には機能していない状態**で長期間放置されていたはずである。

### 23.7 v3.5.0 で検出・修正された不整合（2026-04-15）

v3.5.0 作業中、ドキュメント読み合わせで**4件の追加不整合**が検知された:

| #   | 検知箇所                        | 不整合内容                                                                                                                                                                                                                             | 対処                                                           |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | `SETUP_GUIDE.md` L238           | チェックリストが `pnpm setup:project` を参照（ガイド本文の `pnpm setup:sc` と矛盾）                                                                                                                                                    | `pnpm setup:sc` に統一                                         |
| 2   | `SETUP_GUIDE.md` L167 / L239    | 「MCPサーバーはステップ2で手動登録」と誤記（実際は初回PCチェックリスト + `setup:sc` 完了時の案内で実施）                                                                                                                               | 正しい登録タイミング（冒頭 checklist / 完了メッセージ）を明記  |
| 3   | `SETUP_GUIDE.md` L119           | 「`/sc:` コマンド体系: 22の統一コマンド」（実測 16）                                                                                                                                                                                   | 実測16種に修正、カテゴリ別内訳を追加                           |
| 4   | `SUPERCLAUDE_FINAL.md` L273-310 | 架空の 22コマンドテーブル（`sc:init` / `sc:security` / `sc:api-docs` / `sc:build` / `sc:deploy` / `sc:rollback` / `sc:metrics` / `sc:estimate` / `sc:save` / `sc:reflect` / `sc:load` / `sc:document` — 12個が `package.json` に不在） | 実測16種のカテゴリ別テーブルに全面置換、各コマンドの実装を明記 |

**保全策**:

- `SUPERCLAUDE_FINAL.md` を `command-references.test.ts` の検証対象 `docs` 配列に追加（5ファイル → 6ファイル）
- `docs/SUPERCLAUDE_V42_UPGRADE_PLAN.md` / `docs/SUPERCLAUDE_V42_RISK_ANALYSIS.md` は歴史文書として保全するため、本文は改変せず冒頭に「22 は 2025-10-25 当時の SuperClaude 本家カウント・現行の実測値は `package.json` の `sc:*`」との注記を挿入
- 整合性テスト 39 → 40 に増加（全て緑）

**設計原則**: ドキュメントは「AI への命令書」であり、実測値との乖離は許容しない。ただし意思決定履歴（`docs/SUPERCLAUDE_V42_*.md`）のような**歴史文書は保全対象外**とし、本文改変ではなく文脈注記で誤解を防ぐ。

### 23.7 開発フローへの組み込み

```
コード変更
   ↓
git add
   ↓
git commit
   ↓ pre-commit フック
   ↓
[lint-staged] → ESLint + Prettier
[pnpm test:unit] → 整合性テスト含む全テスト
   ↓ いずれか失敗するとコミットブロック
   ↓
コミット成功 → push
   ↓
GitHub Actions
   ↓ test ジョブで再度全テスト実行
   ↓ security ジョブで第9層防御
   ↓
PRマージ可能
```

### 23.8 メンテナンス方針

| 操作                           | 必要な対応                                                             |
| ------------------------------ | ---------------------------------------------------------------------- |
| 新しい設定ファイル保護対象     | `protect-config.js` PROTECTED_FILES + CLAUDE.md 保護表を **両方** 更新 |
| 新しいMCPサーバー追加          | テスト `REQUIRED_MCPS` + CLAUDE.md + SETUP_GUIDE.md + setup.js を更新  |
| 防御層の追加（10層化等）       | CLAUDE.md / SPECIFICATION.md の「N層防御」記述を **すべて同時に** 更新 |
| ドキュメント内の新コマンド     | `package.json` scripts への追加が必須                                  |
| ドキュメント内の新ファイル参照 | 該当ファイルの実在が必須                                               |

これらを守らないと、整合性テストが pre-commit でブロックする。

### 23.9 設計判断（2026-04-14）

| 項目                                  | 判断   | 理由                                                   |
| ------------------------------------- | ------ | ------------------------------------------------------ |
| **Vitest 統合**                       | 採用   | 既存の `pnpm test:unit` インフラ流用、新ツール不要     |
| **`tests/consistency/` 専用配置**     | 採用   | regression / unit と区別し、目的を明確化               |
| **eval による template literal 展開** | 採用   | `${{ secrets.GITHUB_TOKEN }}` のエスケープを正確に再現 |
| **失敗メッセージへの修正方法明記**    | 採用   | AI が読んで自動修正できる粒度を維持                    |
| **専用CIジョブ化**                    | 不採用 | 既存`test`ジョブで自動実行されるため重複は避ける       |
| **過剰検知の回避**                    | 採用   | 「第N層」のような個別層名は整合性チェック対象外        |
| **意図的不一致の許容機構**            | 採用   | `ALLOWED_MISSING` 等で例外を局所的に許可可能           |

---

## 24. PR運用モード切替（個人開発 ⇄ チーム開発）

### 24.1 概要

このテンプレートは **個人開発をデフォルト挙動とする**。チーム開発に移行する際、`pnpm sc:enable-pr` コマンド1つで以下を一括適用し、`pnpm sc:disable-pr` で完全に元に戻せる、可逆的な切替機能を提供する。

| モード               | 既定値 | main直push | feature branch | ブランチ保護 | claude-code-review.yml           | Claude Code の振る舞い                                  |
| -------------------- | ------ | ---------- | -------------- | ------------ | -------------------------------- | ------------------------------------------------------- |
| **OFF**（個人開発）  | ✅     | 可         | 任意           | 未適用       | 不在                             | feature branch を強制せず main に直push                 |
| **ON**（チーム開発） |        | 禁止       | 必須           | 適用         | 存在（PR時 Claude 自動レビュー） | `git checkout -b feature/x` → `gh pr create` を毎回実行 |

### 24.2 設計思想

#### 課題

- テンプレートデフォルトで「Feature Branches Only」ルールを Claude Code に強制すると、個人開発で毎回 PR を作る運用となり、レビュー不要の小規模変更でも工程が冗長化する
- 一方、チーム開発では PR レビューと保護が必須となるため、両立する仕組みが必要

#### 解決策

CLAUDE.md 内に **永続化フラグ**（`PR_MODE_FLAG`）を埋め込み、Claude Code はこのフラグを参照して挙動を切り替える。フラグ・ワークフロー・ブランチ保護の3者を1コマンドで一括切替するため、auto memory のような揮発性ストレージに依存せず、git管理されチーム全員に伝わる。

### 24.3 PR_MODE_FLAG の仕様

#### 24.3.1 配置場所

`CLAUDE.md` の「🔵 Git/GitHub設定」セクション内、HTMLコメントマーカーで囲まれたブロック。

```markdown
<!-- PR_MODE_FLAG_START -->

**PR運用モード**: OFF

<!-- PR_MODE_FLAG_END -->
```

#### 24.3.2 取りうる値

| 値    | 意味                   | Claude Code への指示                            |
| ----- | ---------------------- | ----------------------------------------------- |
| `OFF` | 個人開発（デフォルト） | main直push可、feature branch任意                |
| `ON`  | チーム開発             | feature branch必須、`gh pr create` でPR作成必須 |

#### 24.3.3 マーカー設計の理由

- **HTMLコメント形式**: Markdown 描画時に非表示。閲覧者には自然なプロセが見える
- **START/END 2行**: 正規表現で確実にブロック全体を特定して書き換え可能
- **`PR_MODE_FLAG` という一意キー**: 他の文脈と衝突しない。スクリプトが `grep` で確実に検出できる

#### 24.3.4 書き換え用正規表現

```javascript
const flagRegex = /(<!-- PR_MODE_FLAG_START -->[\s\S]*?<!-- PR_MODE_FLAG_END -->)/
```

`[\s\S]*?` で非貪欲マッチさせて、START から最初に出現する END までを捕捉する。`/s` フラグなしで動作するため Node.js の旧バージョンにも対応。

### 24.4 ファイル構成

| ファイル                                   | 役割                                                |
| ------------------------------------------ | --------------------------------------------------- |
| `scripts/sc-enable-pr.js`                  | OFF→ON 切替スクリプト                               |
| `scripts/sc-disable-pr.js`                 | ON→OFF 切替スクリプト                               |
| `package.json` scripts                     | `sc:enable-pr` / `sc:disable-pr` のエントリポイント |
| `CLAUDE.md` PR_MODE_FLAG ブロック          | 現在のモード（永続化）                              |
| `superclaude/RULES.md` Git Workflow        | フラグ参照の方針を記述                              |
| `.github/workflows/claude-code-review.yml` | ON 時のみ存在（PR 時の Claude 自動レビュー）        |

### 24.5 sc-enable-pr.js 動作仕様（OFF→ON）

#### 24.5.1 処理フロー

```
1. CLAUDE.md の PR_MODE_FLAG を ON に書き換え
   ├ ファイル存在チェック → 不在ならスキップ警告
   ├ マーカー検出 → 不在ならスキップ警告
   └ 既に ON なら no-op（冪等）

2. .github/workflows/claude-code-review.yml を生成
   ├ workflows ディレクトリ未存在なら作成（mkdir -p）
   ├ 既存ファイルなら上書きせずスキップ（保守的）
   └ 内容は 24.5.3 のテンプレート文字列

3. GitHub のブランチ保護を適用
   ├ gh auth status → 未認証ならスキップ警告
   ├ gh repo view → リモート未設定ならスキップ警告
   ├ デフォルトブランチ取得（通常 main）
   └ gh api PUT で 24.5.4 の保護ルールを適用
```

#### 24.5.2 冪等性

| 状態              | 挙動                                      |
| ----------------- | ----------------------------------------- |
| フラグ既に ON     | 「既に ON です」と表示してスキップ        |
| workflow 既に存在 | 上書きせずスキップ                        |
| 保護既に適用済み  | PUT で同内容を再適用（GitHub 側で no-op） |

#### 24.5.3 claude-code-review.yml テンプレート

```yaml
name: Claude コードレビュー

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  claude-review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write

    steps:
      - name: リポジトリをチェックアウト
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Claude コードレビューを実行
        id: claude-review
        uses: anthropics/claude-code-action@beta
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          model: 'claude-opus-4-1-20250805'
          direct_prompt: |
            このプルリクエストをレビューして、以下の観点からフィードバックをお願いします：
            - コード品質とベストプラクティス
            - 潜在的なバグや問題
            - パフォーマンスの考慮事項
            - セキュリティ上の懸念
            - テストカバレッジ

            建設的で役立つフィードバックをお願いします。
```

#### 24.5.4 ブランチ保護 PUT 仕様

```bash
gh api repos/${repoInfo}/branches/${defaultBranch}/protection -X PUT --input - <<'EOF'
{
  "required_status_checks": null,
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

| キー                              | 値    | 意味                                               |
| --------------------------------- | ----- | -------------------------------------------------- |
| `required_status_checks`          | null  | CIステータス必須化しない（個別プロジェクトで設定） |
| `enforce_admins`                  | false | オーナー柔軟性を維持                               |
| `required_approving_review_count` | 1     | 最低1承認必須                                      |
| `dismiss_stale_reviews`           | false | レビュー後の追加コミットで承認を破棄しない         |
| `require_code_owner_reviews`      | false | CODEOWNERS 不要                                    |
| `allow_force_pushes`              | false | 履歴破壊を防止                                     |
| `allow_deletions`                 | false | mainの誤削除を防止                                 |

#### 24.5.5 失敗時の挙動

| 失敗箇所              | 挙動                                                        |
| --------------------- | ----------------------------------------------------------- |
| `gh auth status` 失敗 | warning + 「`gh auth login` 後に再実行」案内 → 続行         |
| `gh repo view` 失敗   | warning + 「リモート未設定」案内 → 続行                     |
| ブランチ保護 PUT 失敗 | warning + エラーメッセージ1行表示 → 続行                    |
| privateリポジトリ     | info で「Pro 以上必要」表示後、PUT 試行（403 ならスキップ） |

すべての失敗は **非致命的**。フラグ更新と workflow 生成は成功しており、後で `gh auth login` 等で再実行可能。

### 24.6 sc-disable-pr.js 動作仕様（ON→OFF）

#### 24.6.1 処理フロー

```
1. CLAUDE.md の PR_MODE_FLAG を OFF に書き換え

2. .github/workflows/claude-code-review.yml を削除（fs.unlinkSync）
   └ 既に不在なら「既に存在しません」と表示してスキップ

3. GitHub のブランチ保護を解除
   ├ gh api DELETE で保護を完全解除
   ├ 404 (Not Found) は「既に未設定」として正常扱い
   └ その他のエラーは warning で続行
```

#### 24.6.2 ブランチ保護解除コマンド

```bash
gh api repos/${repoInfo}/branches/${defaultBranch}/protection -X DELETE
```

レスポンス:

- 200/204: 解除成功
- 404: 既に保護なし（正常扱い）
- 403: 権限不足（warning + 続行）

### 24.7 setup.js との関係

#### 24.7.1 setup.js のブランチ保護自動適用は廃止

`pnpm setup:sc` 実行時の Step 5（GitHubセキュリティ自動化）から、ブランチ保護 PUT 処理は完全削除された（行 396-422 が削除）。デフォルトでは保護は適用されず、明示的に `pnpm sc:enable-pr` を実行した時のみ適用される。

#### 24.7.2 Step 5 の表示変更

```
変更前: ✓ mainブランチ保護を設定しました（force push/削除禁止）
変更後: ℹ ブランチ保護: PR運用OFF（デフォルト）。チーム移行時は pnpm sc:enable-pr を実行
```

#### 24.7.3 完了サマリ表示

```
変更前 (public): ✓ ブランチ保護 (force push/削除禁止)
変更前 (private): ⚠ ブランチ保護: スキップ（privateリポジトリ - Pro以上必要）
変更後 (共通): ℹ ブランチ保護: PR運用OFF（チーム移行時は pnpm sc:enable-pr）
```

### 24.8 Claude Code の振る舞い

#### 24.8.1 フラグ参照の規範

`superclaude/RULES.md` の Git Workflow セクションで以下を規定:

```markdown
- **Branch Strategy by PR Mode**: Read `PR_MODE_FLAG` in project CLAUDE.md
  - **PR Mode ON (team development)**: Feature branches required, never work on main/master, create PR via `gh pr create`
  - **PR Mode OFF (solo development)**: main direct push allowed, feature branches optional
```

セッション開始時に Claude Code が CLAUDE.md を読み込む際、このフラグを観測して以降のブランチ戦略を決定する。

#### 24.8.2 OFF モード時の挙動

```bash
# Claude Code は以下のフローで動作
git status && git branch
# 必要なら main で直接編集
git add ...
git commit -m "..."
git push origin main
```

#### 24.8.3 ON モード時の挙動

```bash
# Claude Code は以下のフローで動作
git checkout -b feature/[task]-[date]
# 編集
git add ...
git commit -m "..."
git push -u origin feature/[task]-[date]
gh pr create --title "..." --body "..."
```

### 24.9 整合性テスト保護

| テスト                       | 検証内容                                                          |
| ---------------------------- | ----------------------------------------------------------------- |
| `command-references.test.ts` | `pnpm sc:enable-pr` / `pnpm sc:disable-pr` が package.json に実在 |
| `file-references.test.ts`    | ドキュメント内で参照される `scripts/sc-enable-pr.js` 等が実在     |

これらにより、ドキュメントとコードの乖離を pre-commit 時点で検出する。

### 24.10 既知の制約

#### 24.10.1 別PCへのクローン時の挙動

CLAUDE.md（git管理対象）にフラグが永続化されているため、**別PCでクローンしても自動的に正しいモードで動作する**。auto memory のようなローカル限定情報には依存しない。

#### 24.10.2 GitHub プラン制限

privateリポジトリでブランチ保護を適用するには GitHub Pro 以上のプランが必要。Free プランの private では `pnpm sc:enable-pr` の workflow 生成と CLAUDE.md フラグ更新のみ成功し、ブランチ保護は 403 でスキップされる。この場合、main直push の物理的な禁止は効かないが、Claude Code の挙動は CLAUDE.md フラグに従って ON モードで動作する。

#### 24.10.3 一時的な切替

「このタスクだけ PR で対応したい」のような一時切替は、フラグを変えずに Claude Code に「今だけ feature branch + PR で進めて」と指示するだけで実現可能（auto memory には保存しない）。永続的な切替が必要な場合のみ `pnpm sc:enable-pr` を実行する。

### 24.11 設計判断

| 項目                                      | 判断   | 理由                                                                                  |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| **デフォルトを OFF（個人開発）にする**    | 採用   | このテンプレートの主用途は個人開発。チーム開発はオプトイン                            |
| **フラグを CLAUDE.md に埋め込む**         | 採用   | git管理されチーム全員に伝わる。auto memory のような揮発性ストレージは個人 PC に閉じる |
| **HTMLコメントマーカー方式**              | 採用   | Markdown表示に影響せず、正規表現で確実に書き換え可能                                  |
| **setup.js の分岐で対話プロンプト化**     | 不採用 | 「クローンした人ごとに環境が違う」状態になり、保守コスト増。後から `enable-pr` で OK  |
| **既存ファイルの上書き禁止（enable-pr）** | 採用   | ユーザーが workflow をカスタマイズしている場合の事故を防止                            |
| **ブランチ保護解除時の 404 を正常扱い**   | 採用   | 「既に解除済み」と「未設定」を区別せず冪等動作                                        |
| **`required_approving_review_count: 1`**  | 採用   | チーム開発の最低限。2人以上にしたい場合はユーザーが手動で調整                         |
| **`required_status_checks: null`**        | 採用   | プロジェクト固有のCIジョブ名に依存させない（汎用テンプレートのため）                  |

---

**最終更新**: 2026-04-26
**バージョン**: 3.7.5（実装と仕様の乖離を解消する3点: (1) `vitest.config.ts` の `thresholds` セクション削除（旧 `global:` キー記法は vitest v3 系で実効しておらず、個人開発デフォルト=PR運用OFFとも整合しないため。クローン後に必要なら正しい v3 系フラット記法で追加する旨をコメント明記）。(2) `scripts/validate-sc.js` の `test:unit` 呼出を `test:coverage` に切替—`pnpm validate` 一発で型/lint/境界/テスト合否/カバレッジ計測/ビルドが完結。(3) §17.2 テストカバレッジ仕様を「強制90%/95%」→「計測のみ・閾値必要時に追加」に書換、§9.3.2 CI仕様も同期。`scripts/.config-checksums.json` 更新）

**バージョン**: 3.7.4（テンプレート完成度向上2点: (1) `@vitest/coverage-v8` を `3.1.4` → `^3.2.4` に更新して `vitest@3.2.4` とメジャー版を揃え、`pnpm install` 時の `Running mixed versions is not supported` 警告を解消。(2) §12.9.3 を「CSPを含めない設計判断」から「CSPを含めた設計判断（v3.1.0〜）」に書き換えて文書と実装の整合性を回復、§12.9.4 のカスタマイズ例を CSP 含む形に拡張、§12.9.5 動作確認手順に dev / 本番両モードの CSP 検証を追加）

---

## 改訂履歴（直近）

| バージョン | 日付       | 変更内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3.7.5**  | 2026-04-26 | 実装と仕様の乖離を解消する3点: (1) `vitest.config.ts` の `thresholds` セクション削除（旧 `global:` キー記法は vitest v3 系で実効しておらず、個人開発デフォルト=PR運用OFFとも整合しないため。クローン後に必要なら正しい v3 系フラット記法で追加する旨をコメント明記）。(2) `scripts/validate-sc.js` の `test:unit` 呼出を `test:coverage` に切替—`pnpm validate` 一発で型/lint/境界/テスト合否/カバレッジ計測/ビルドが完結。(3) §17.2 テストカバレッジ仕様を「強制90%/95%」→「計測のみ・閾値必要時に追加」に書換、§9.3.2 CI仕様も同期。`scripts/.config-checksums.json` 更新                                                                                                                   |
| **3.7.4**  | 2026-04-26 | テンプレート完成度向上2点: (1) `@vitest/coverage-v8` を `3.1.4` → `^3.2.4` に更新して `vitest@3.2.4` とメジャー版を揃え `Running mixed versions is not supported` 警告を解消。(2) §12.9.3 を「CSPを含めない設計判断」から「CSPを含めた設計判断（v3.1.0〜）」に書き換えて文書と実装の整合性を回復。§12.9.4 / §12.9.5 を CSP 含む構成に拡張                                                                                                                                                                                                                                                                                                                                                     |
| **3.7.3**  | 2026-04-26 | CSP の `script-src` を `process.env.NODE_ENV === 'development'` で環境別分岐: 開発時のみ `'unsafe-eval'` を追加して Next.js dev サーバーの React Refresh / HMR が動作可能に。本番ビルドは従来通り `'unsafe-eval'` を含めずセキュリティ強化維持。dev は localhost 限定動作のため外部 XSS リスクなし。`scripts/.config-checksums.json` を更新                                                                                                                                                                                                                                                                                                                                                   |
| **3.7.2**  | 2026-04-26 | テンプレート完成度向上3点: (1) `next-i18next` 依存削除で `i18next-fs-backend` HIGH脆弱性源を根絶（実コード未使用の `i18next` / `react-i18next` / `next-i18next` 3件削除、`next-i18next.config.js` 削除、`pnpm.overrides` から `i18next-fs-backend@<2.6.4` 削除）。(2) Node.jsバージョン管理を `.nvmrc` 単一の真実の源に統一（`.nvmrc: 18.17.0` → `20.19.0`、`ci.yml`/`security.yml` を `node-version-file: '.nvmrc'` 参照に、`scripts/setup.js` 内テンプレート同期）。(3) CIに `pnpm test:coverage` ジョブと `actions/upload-artifact@v4` で coverage レポート14日保持を追加。第2.4章「国際化」を独自最小実装方式に書き換え、第9.3章に Node.js管理仕様 9.3.1 と coverage計測仕様 9.3.2 を追加 |
| **3.7.1**  | 2026-04-25 | 第12.10章にHIGH脆弱性2件の対処を追加: `i18next-fs-backend@<2.6.4` Path traversal (CVSS 8.2 / GHSA-8847-338w-5hcj) と `postcss@<8.5.10` XSS via unescaped `</style>` (CVE-2026-41305 / GHSA-qx2v-qp2m-jg93) を `pnpm.overrides` で強制パッチアップグレード。Dependabot Alert #30 解決                                                                                                                                                                                                                                                                                                                                                                                                          |
| **3.7.0**  | 2026-04-25 | 第24章「PR運用モード切替」を新設（11サブセクション）: 個人開発⇄チーム開発の可逆的切替、`pnpm sc:enable-pr` / `pnpm sc:disable-pr` の完全動作仕様、CLAUDE.md `PR_MODE_FLAG` 永続化機構（HTMLコメントマーカー方式）、ブランチ保護 PUT/DELETE API 仕様、claude-code-review.yml テンプレート同梱化、setup.js のブランチ保護自動適用廃止。第12.5章を PR運用モード依存の動的適用仕様に再構成                                                                                                                                                                                                                                                                                                        |
| **3.6.0**  | 2026-04-18 | 第12.15章に Supabase DB保護仕様を全面追加（8サブセクション）: MCP破壊系5種への警告Hook + ask 二重防御、Bash Supabase CLI への ask 単層防御、Hookスクリプトのチェックサム保護、Hook完全仕様（再現可能レベル）、防御の限界と「うっかりミス防止」設計思想の明文化。CLAUDE.md にも絶対ルール#8〜11を追加し protect-config の保護対象に Hook を追加                                                                                                                                                                                                                                                                                                                                                |
| **3.5.0**  | 2026-04-15 | 第7.5章に SuperClaude v4 統合コマンド16種の完全カタログ追加・`pnpm sc:*`（テンプレート同梱）と Claude Code `/sc:` スラッシュコマンド（SuperClaude 本家）の区別を明文化。架空コマンド12個の削除・`SUPERCLAUDE_FINAL.md` を整合性テスト対象に追加（39→40）。歴史文書 `docs/SUPERCLAUDE_V42_*.md` に文脈注記挿入                                                                                                                                                                                                                                                                                                                                                                                 |
| **3.4.0**  | 2026-04-15 | 第14章を全面拡張: Pre-check 機能（6種ツール自動検出+MCP登録チェック）の詳細仕様、`pnpm setup:sc` 8ステップ実行詳細、設計判断（鶏と卵問題の回避）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **3.3.0**  | 2026-04-14 | 第23章「ドキュメント整合性チェック」追加: 39テスト/7ファイルで AI ファースト時代の型システムを実現。protect-config.js の保護対象不整合を発見・修正                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **3.2.0**  | 2026-04-14 | 第9層防御（CI/CDセキュリティワークフロー）追加: CodeQL SAST + pnpm audit + gitleaks Actions二重防御。next 15.5.15 パッチ適用                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **3.1.0**  | 2026-04-13 | CSPヘッダー追加・Google Fonts 許可・セキュリティヘッダー7種化                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
