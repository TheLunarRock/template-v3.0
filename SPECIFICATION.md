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
├── next.config.mjs           # Next.js設定
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
    exclude: ['node_modules', '.next', 'tests/e2e'],
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

### 5.4 Playwright設定（playwright.config.ts）

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI === 'true' ? 2 : 0,
  workers: process.env.CI === 'true' ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: process.env.CI === 'true' ? 'pnpm build && pnpm start' : 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
})
```

### 5.5 Tailwind CSS設定

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

### 5.6 環境変数

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
| `pnpm test:e2e`        | Playwrightでテスト |
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

## 9. Git Hooks

### 9.1 pre-commit（実行順序）

```
1. 🔐 gitleaksシークレットスキャン（秘密情報の流出検出）
2. 🔒 設定ファイル整合性チェック（protect-config.js）
3. 🔍 単一フィーチャーチェック（複数フィーチャー同時コミット防止）
4. 🔍 フィーチャー境界違反チェック（check-boundaries.js）
5. 🔍 ESLint + TypeScript チェック（lint-staged）
6. 🧪 ユニットテスト実行（vitest run）
```

#### 9.1.1 gitleaksシークレットスキャン

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

#### 9.1.2 単一フィーチャーチェック

```bash
# git diff --cached から変更されたフィーチャーを検出
# 2つ以上のフィーチャーが同時に変更されている場合はブロック
# 1コミット = 1フィーチャーを物理的に強制
```

### 9.2 commit-msg

- コミットメッセージ形式検証
- 形式: `type(scope): description`
- 許可されるtype: feat, fix, docs, style, refactor, test, chore, perf
- フィーチャー名の自動検出と推奨フォーマット表示

## 10. Claude Code通知システム

### 10.1 概要

Claude Codeがタスク完了時または承認待ち時に、Slack/macOS通知を送信するシステム。

### 10.2 アーキテクチャ

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

### 10.3 設定ファイル

#### 10.3.1 グローバル設定（~/.claude/settings.json）

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

#### 10.3.2 通知スクリプト（~/.claude/slack-notify.sh）

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

### 10.4 Hooks イベント仕様

| イベント         | マッチャー               | 発火タイミング               |
| ---------------- | ------------------------ | ---------------------------- |
| **Stop**         | `""` (空文字 = 全マッチ) | Claude Codeタスク完了時      |
| **Notification** | `permission_prompt`      | 承認待ち（ツール使用許可等） |
| **Notification** | `idle_prompt`            | 60秒間アイドル状態継続時     |

### 10.5 セットアップ方法

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

### 10.6 Slack Webhook設定手順

1. https://api.slack.com/apps にアクセス
2. 「Create New App」→「From scratch」
3. アプリ名とワークスペースを選択
4. 左メニュー「Incoming Webhooks」をクリック
5. 「Activate Incoming Webhooks」をON
6. 「Add New Webhook to Workspace」をクリック
7. 通知先チャンネルを選択
8. 生成されたWebhook URLをコピー

### 10.7 トラブルシューティング

| 問題                      | 原因                                               | 解決策                                   |
| ------------------------- | -------------------------------------------------- | ---------------------------------------- |
| 通知が来ない              | プロジェクトにsettings.local.jsonがありhooksがない | プロジェクト設定にもhooksを追加          |
| Slackのみ来ない           | Webhook URLが未設定または無効                      | URLを確認して再設定                      |
| 音が鳴らない              | macOS以外のOS                                      | Linuxの場合は`paplay`等に変更            |
| Cursor/VSCodeで動作しない | 既知のバグ（Issue #11156）                         | Stopフックは動作、Notificationは修正待ち |

### 10.8 プロジェクト固有設定

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

## 11. セキュリティ仕様

### 11.1 多層防御アーキテクチャ

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

### 11.2 .gitignore除外カテゴリ

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

### 11.3 gitleaks（シークレットスキャンツール）

| 項目               | 値                                      |
| ------------------ | --------------------------------------- |
| **バージョン**     | 8.30.0                                  |
| **実行タイミング** | pre-commit（コミット前に自動実行）      |
| **スキャン対象**   | ステージングされたファイルのみ          |
| **検出エンジン**   | 正規表現ベースのパターンマッチ          |
| **インストール**   | `brew install gitleaks`                 |
| **誤検知対応**     | `.gitleaksignore`ファイルで除外指定可能 |

**未インストール時の動作:** 警告メッセージを表示するが、コミットはブロックしない（友人がgitleaksをインストールしていなくても開発可能）。

### 11.4 GitHub側セキュリティ設定

| 機能                   | 状態    | 説明                                                                                     |
| ---------------------- | ------- | ---------------------------------------------------------------------------------------- |
| **Secret Scanning**    | ✅ 有効 | push済みコードからAPIキー・トークン等を自動検出。GitHubが200以上のサービスパターンを監視 |
| **Push Protection**    | ✅ 有効 | 秘密情報を含むpushをGitHub側でブロック。gitleaksのサーバー版として機能                   |
| **Dependabotアラート** | ✅ 有効 | 依存パッケージの脆弱性を自動検出し通知。CVEデータベースと照合                            |
| **Dependabot自動修正** | ✅ 有効 | 修正パッチがある場合、PRを自動作成                                                       |
| **ブランチ保護**       | ✅ 有効 | mainへのforce push禁止、ブランチ削除禁止。通常pushは許可                                 |

### 11.5 ブランチ保護ルール（main）

| ルール                     | 設定 | 理由                                                |
| -------------------------- | ---- | --------------------------------------------------- |
| **Force push**             | 禁止 | 履歴の破壊を防止                                    |
| **ブランチ削除**           | 禁止 | mainの誤削除を防止                                  |
| **PR必須**                 | 不要 | 個人/少人数開発では過剰。ワークフローの軽量性を維持 |
| **ステータスチェック必須** | 不要 | CI未設定のため                                      |
| **管理者への強制**         | 無効 | オーナー自身の柔軟性を維持                          |

### 11.6 グローバルgitignore（~/.gitignore_global）

全プロジェクト共通で適用されるセーフティネット。

```bash
# 設定コマンド
git config --global core.excludesfile ~/.gitignore_global
```

**除外対象:**

- OS生成ファイル（`.DS_Store`, `Thumbs.db`, `._*`等）
- IDE設定（`.vscode/`, `.idea/`, `*.swp`等）
- SSH鍵（`id_rsa`, `id_ed25519`, `*.pem`, `*.key`）

### 11.7 既知の残存脆弱性

| パッケージ                     | 深刻度   | 状態                 | 影響                                   |
| ------------------------------ | -------- | -------------------- | -------------------------------------- |
| `ajv@6.12.6`（eslint間接依存） | moderate | 対処不可（上流待ち） | ランタイム影響なし。開発ツール内部のみ |

### 11.8 権限モデル（公開リポジトリ）

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

## 12. 前提条件

### 12.1 必須

- Node.js >= 20.19.0
- pnpm >= 8.0.0
- Git
- gitleaks >= 8.30.0（`brew install gitleaks`）

### 12.2 推奨（フル機能使用時）

- Claude Code CLI
- SuperClaude v4.0.8
- MCPサーバー
  - Serena（セマンティック検索）
  - Context7（ドキュメント参照）
  - Sequential-thinking（構造化分析）
  - Morphllm（高速編集）
  - Playwright（E2Eテスト）

## 13. セットアップ手順

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
#   - GitHub側セキュリティ有効化
#     (Secret Scanning, Push Protection, Dependabot, ブランチ保護)
#   - Claude Code通知設定（オプション）

# 4. 環境変数設定
cp .env.example .env.local
# .env.localを編集

# 5. 開発サーバー起動
pnpm dev

# ブラウザで http://localhost:3000 を開く
```

## 14. デプロイ

### 14.1 Vercel（推奨）

```bash
# Vercel CLIでデプロイ
vercel

# または GitHub連携で自動デプロイ
```

### 14.2 ビルド設定

| 設定             | 値             |
| ---------------- | -------------- |
| Build Command    | `pnpm build`   |
| Output Directory | `.next`        |
| Install Command  | `pnpm install` |
| Node.js Version  | 20.x           |

## 15. パフォーマンス指標

| 指標          | 目標値  | 現在値  |
| ------------- | ------- | ------- |
| First Load JS | < 150KB | 102KB   |
| ビルド時間    | < 5秒   | ~2秒    |
| 境界チェック  | < 500ms | < 100ms |
| テスト実行    | < 10秒  | ~1秒    |

## 16. 品質基準

### 16.1 TypeScript品質（97%モード）

- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

### 16.2 テストカバレッジ

- グローバル: 90%以上
- フィーチャー単位: 95%以上

### 16.3 コード品質

- ESLint 9 flat config
- Prettier統合
- 境界違反ゼロトレランス

---

**最終更新**: 2026-02-18
**バージョン**: 2.2.0
