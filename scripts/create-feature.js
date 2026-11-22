#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
}

// 文字列の最初を大文字にする
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// パスカルケースに変換
function toPascalCase(str) {
  return str
    .split('-')
    .map((word) => capitalize(word))
    .join('')
}

// メイン処理
async function createFeature() {
  const featureName = process.argv[2]

  if (!featureName) {
    console.error(`
${colors.red}エラー: フィーチャー名が指定されていません${colors.reset}

使用方法:
  pnpm create:feature [feature-name]

例:
  pnpm create:feature user-profile
  pnpm create:feature shopping-cart
  pnpm create:feature auth
`)
    process.exit(1)
  }

  // フィーチャー名の検証（kebab-caseのみ許可）
  if (!/^[a-z]+(-[a-z]+)*$/.test(featureName)) {
    log.error('フィーチャー名はkebab-case（例: user-profile）で指定してください')
    process.exit(1)
  }

  const featurePath = path.join('src/features', featureName)
  const pascalName = toPascalCase(featureName)

  // 既存チェック
  if (fs.existsSync(featurePath)) {
    log.error(`フィーチャー '${featureName}' は既に存在します`)
    process.exit(1)
  }

  console.log(`\n${colors.bold}🚀 フィーチャー '${featureName}' を作成中...${colors.reset}\n`)

  // ディレクトリ構造作成
  // 取得（api/<名前>-api.ts）と更新（api/<名前>-actions.ts）、型（types/）だけを生成する。
  // 画面の部品はフィーチャーの外（src/app 側）に置くため、hooks/ と components/ は作らない。
  // テストは tests/unit/features/<名前>.test.ts に生成する（このスクリプト後半で作成）。
  const dirs = ['api', 'types']
  dirs.forEach((dir) => {
    const dirPath = path.join(featurePath, dir)
    fs.mkdirSync(dirPath, { recursive: true })
    log.success(`${dir}/ ディレクトリを作成`)
  })

  // index.ts作成（フック公開なし）
  const indexContent = `// ✅ 取得の関数（サーバー側で動く。ページの PageContent から直接 await する）
export { get${pascalName}Data } from './api/${featureName}-api'

// ✅ 更新の関数（Server Actions）
export { create${pascalName}, update${pascalName}, delete${pascalName} } from './api/${featureName}-actions'

// ✅ ドメイン型のみ（公開可）
export type { ${pascalName}, ${pascalName}Input } from './types'

// ❌❌❌ フック（絶対に公開禁止）
// export { use${pascalName} } from './hooks/use${pascalName}'  // 致命的エラー！

// ❌ UIコンポーネント（原則非公開。画面の部品は src/app 側に置く）
// export { ${pascalName}Component } from './components/${pascalName}Component'

// ❌ 内部実装（公開禁止）
// export { validate${pascalName} } from './utils/validators'
`

  fs.writeFileSync(path.join(featurePath, 'index.ts'), indexContent)
  log.success('index.ts を作成（フック公開禁止を明記）')

  // 取得の関数（サーバー側で動く）
  const apiContent = `// ${pascalName} の取得
//
// ここは「データの保存先を読む場所」。ページの PageContent（サーバー側）から直接 await する。
// 自分のアプリの API ルートを呼ばない。サーバー側の通信は相対 URL を受け付けない。
//
// - ここを実際の保存先（Supabase や DB）の読み取りに差し替える
// - 差し替えると、取得はリクエストごとになる（ページ側の <Suspense> が必要）
// - 作り置きにしたい場合だけ 'use cache' を書く。書く前に持ち主の承認を取る
//
// 雛形の段階では通信をせずに見本のデータを返す。クローン直後に外部サービスの鍵が
// 無くても、ビルドと表示が通るようにするため。

import type { ${pascalName} } from '../types'

/** 見本のデータの日時（保存先に差し替えたら消す） */
const SAMPLE_DATE = new Date('2026-01-01T00:00:00.000Z')

export const get${pascalName}Data = async (id: string): Promise<${pascalName} | null> => {
  // ここを保存先の読み取りに差し替える（見つからなければ null を返す）
  const row = await Promise.resolve({
    id,
    name: '見本のデータ',
    createdAt: SAMPLE_DATE,
    updatedAt: SAMPLE_DATE,
  })
  return row
}
`

  fs.writeFileSync(path.join(featurePath, 'api', `${featureName}-api.ts`), apiContent)
  log.success(`api/${featureName}-api.ts を作成（取得の関数）`)

  // 更新の関数（Server Actions）
  const actionsContent = `'use server'

// ${pascalName} の更新（Server Actions）
//
// - Server Actions は外部から直接呼べる入口になる。関数ごとに、呼んだ人に
//   その操作の権限があるかを必ず確かめる
// - 入力は必ず検証する
//
// 雛形の段階では保存せずに、受け取った値をもとにした結果を返す。
// 実際の保存先（Supabase や DB）への書き込みに差し替える。

import type { ${pascalName}, ${pascalName}Input } from '../types'

const NAME_MAX_LENGTH = 100

/** ID を検証する。不正なら例外を投げる */
const validateId = (id: unknown): string => {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('id を指定してください')
  }
  return id.trim()
}

/** 入力を検証して、保存してよい形に整える。不正なら例外を投げる */
const validateInput = (input: unknown): ${pascalName}Input => {
  const name =
    typeof input === 'object' && input !== null && 'name' in input && typeof input.name === 'string'
      ? input.name.trim()
      : ''
  if (name.length === 0 || name.length > NAME_MAX_LENGTH) {
    throw new Error(\`name は 1〜\${NAME_MAX_LENGTH} 文字で指定してください\`)
  }
  return { name }
}

export async function create${pascalName}(input: ${pascalName}Input): Promise<${pascalName}> {
  // 権限: ここで、呼んだ人に作成の権限があるかを確かめる
  const valid = validateInput(input)
  const now = new Date()
  // ここを保存先への書き込みに差し替える
  const saved = await Promise.resolve({ id: crypto.randomUUID(), ...valid, createdAt: now, updatedAt: now })
  return saved
}

export async function update${pascalName}(id: string, input: ${pascalName}Input): Promise<${pascalName}> {
  // 権限: ここで、呼んだ人にこの ${pascalName} を更新する権限があるかを確かめる
  const validId = validateId(id)
  const valid = validateInput(input)
  const now = new Date()
  // ここを保存先への書き込みに差し替える（差し替えると createdAt は保存先の値になる）
  const saved = await Promise.resolve({ id: validId, ...valid, createdAt: now, updatedAt: now })
  return saved
}

export async function delete${pascalName}(id: string): Promise<{ id: string }> {
  // 権限: ここで、呼んだ人にこの ${pascalName} を削除する権限があるかを確かめる
  const validId = validateId(id)
  // ここを保存先からの削除に差し替える
  await Promise.resolve()
  return { id: validId }
}
`

  fs.writeFileSync(path.join(featurePath, 'api', `${featureName}-actions.ts`), actionsContent)
  log.success(`api/${featureName}-actions.ts を作成（更新の関数・Server Actions）`)

  // 型定義ファイル
  const typesContent = `// ${pascalName} Type Definitions

/** ドメインモデル。フィーチャーの index.ts から公開してよい */
export interface ${pascalName} {
  id: string
  name: string
  // ドメイン固有のプロパティをここへ追加する
  createdAt: Date
  updatedAt: Date
}

/** 作成・更新で受け取る値。index.ts から公開してよい */
export type ${pascalName}Input = Pick<${pascalName}, 'name'>
`

  fs.writeFileSync(path.join(featurePath, 'types', 'index.ts'), typesContent)
  log.success('types/index.ts を作成')

  // README.md
  const readmeContent = `# ${pascalName} Feature

## 概要
${featureName} フィーチャーの実装

## 構造
- \`api/${featureName}-api.ts\` - 取得の関数（サーバー側で動く・公開）
- \`api/${featureName}-actions.ts\` - 更新の関数（Server Actions・公開）
- \`types/\` - 型定義（ドメイン型のみ公開）

画面の部品はこのフィーチャーではなく \`src/app/${featureName}/\` 側に置く。
テストはこのディレクトリではなく \`tests/unit/features/${featureName}.test.ts\` に置く。

## 公開API（index.ts）
- \`get${pascalName}Data()\` - 取得（サーバー側から直接 await する）
- \`create${pascalName}()\` / \`update${pascalName}()\` / \`delete${pascalName}()\` - 更新（Server Actions）
- \`type ${pascalName}\` / \`type ${pascalName}Input\` - ドメイン型

## ⚠️ 重要な注意事項
1. **取得の関数は自分のアプリの API を fetch しない**（関数の中で保存先を読む）
2. **Server Actions は外部から直接呼べる。関数ごとに権限を確かめ、入力を検証する**
3. **フックは絶対にindex.tsから公開しない**
4. **作り置き（'use cache'）は持ち主の承認を取ってから書く**

## 使用例
\`\`\`typescript
// src/app/${featureName}/page.tsx（サーバーコンポーネント）
import { get${pascalName}Data } from '@/features/${featureName}'

const data = await get${pascalName}Data('123')

// フォームから更新する（Server Actions）
import { create${pascalName} } from '@/features/${featureName}'

await create${pascalName}({ name: '新しい項目' })
\`\`\`
`

  fs.writeFileSync(path.join(featurePath, 'README.md'), readmeContent)
  log.success('README.md を作成')

  // 🔥 中間保護層パターン - app/[feature]/page.tsx を生成
  const appPagePath = `src/app/${featureName}/page.tsx`
  const appPageContent = `import { Suspense } from 'react'
import { FeatureErrorBoundary } from '@/components/ErrorBoundary'
import { get${pascalName}Data } from '@/features/${featureName}'
import type { ${pascalName} } from '@/features/${featureName}'

/**
 * ${pascalName}ページ - 中間保護層パターン実装
 *
 * 構造:
 * 1. ErrorBoundary: エラーを隔離し、他フィーチャーへの影響を防ぐ
 * 2. Suspense: データ取得をリクエストごとに行い、取得中は fallback を表示する（外すとビルドが失敗する）
 * 3. PageContent: 中間保護層として機能（フィーチャーAPIのみ使用）
 * 4. Feature API: 公開された純粋関数のみを呼び出す
 *
 * ⚠️ 重要: フィーチャーのコンポーネントやフックは直接使用しない
 */
export default function ${pascalName}Page() {
  return (
    <FeatureErrorBoundary featureName="${featureName}">
      <Suspense
        fallback={
          <div className="p-8 bg-gray-50 rounded-lg">
            <p className="text-gray-700">読み込み中…</p>
          </div>
        }
      >
        <${pascalName}PageContent />
      </Suspense>
    </FeatureErrorBoundary>
  )
}

/**
 * 中間保護層コンポーネント
 * - フィーチャーの公開APIのみを使用
 * - 独自のUI実装（フィーチャーのコンポーネントは使用禁止）
 * - エラーハンドリングはErrorBoundaryに委譲
 */
async function ${pascalName}PageContent() {
  // フィーチャーの公開APIのみ使用（フック使用禁止）
  let data: ${pascalName} | null = null
  let error: string | null = null
  
  try {
    // 実際にはルートパラメータや検索条件から ID を決める
    data = await get${pascalName}Data('sample-id')
  } catch (e) {
    error = e instanceof Error ? e.message : 'データの取得に失敗しました'
  }
  
  if (error !== null) {
    return (
      <div className="p-8 bg-red-50 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }
  
  if (!data) {
    return (
      <div className="p-8 bg-gray-50 rounded-lg">
        <p className="text-gray-700">データが見つかりません</p>
      </div>
    )
  }
  
  // 独自のUI実装（フィーチャーのコンポーネントは使用しない）
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            ${pascalName}
          </h1>
          
          <div className="space-y-4">
            {/* ここにこのページ独自の UI を実装する */}
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-500">ID</p>
              <p className="text-lg font-medium">{data.id}</p>
            </div>
            
            <div className="mt-8 p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600 mb-2">デバッグ情報（開発用）</p>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
`

  // app/[feature]ディレクトリの作成
  const appFeatureDir = `src/app/${featureName}`
  if (!fs.existsSync(appFeatureDir)) {
    fs.mkdirSync(appFeatureDir, { recursive: true })
  }

  fs.writeFileSync(appPagePath, appPageContent)
  log.success(`🛡️ 中間保護層パターン ${appPagePath} を作成`)

  // 単体テストファイル生成
  const unitTestPath = `tests/unit/features/${featureName}.test.ts`
  const unitTestContent = `import { describe, it, expect } from 'vitest'
import {
  get${pascalName}Data,
  create${pascalName},
  update${pascalName},
  delete${pascalName},
} from '@/features/${featureName}'

// 取得の関数と更新の関数を直接呼んで検証する（通信のモックは使わない）。
// 保存先に差し替えたら、ここも保存先の結果に合わせて書き換える。

describe('${pascalName} 取得の関数', () => {
  it('get${pascalName}Data が指定した ID のデータを返す', async () => {
    const result = await get${pascalName}Data('test-id')

    expect(result?.id).toBe('test-id')
  })
})

describe('${pascalName} 更新の関数（Server Actions）', () => {
  it('create${pascalName} が検証済みの値で作成結果を返す', async () => {
    const result = await create${pascalName}({ name: '  新しい項目  ' })

    expect(result.name).toBe('新しい項目')
    expect(result.id.length).toBeGreaterThan(0)
  })

  it('create${pascalName} は空の name を拒否する', async () => {
    await expect(create${pascalName}({ name: '   ' })).rejects.toThrow('name')
  })

  it('update${pascalName} が指定した ID で更新結果を返す', async () => {
    const result = await update${pascalName}('test-id', { name: '更新後' })

    expect(result).toMatchObject({ id: 'test-id', name: '更新後' })
  })

  it('update${pascalName} は空の ID を拒否する', async () => {
    await expect(update${pascalName}('', { name: '更新後' })).rejects.toThrow('id')
  })

  it('delete${pascalName} が削除した ID を返す', async () => {
    await expect(delete${pascalName}('test-id')).resolves.toEqual({ id: 'test-id' })
  })
})
`

  // 単体テストディレクトリの確認と作成
  const unitFeaturesDir = 'tests/unit/features'
  if (!fs.existsSync(unitFeaturesDir)) {
    fs.mkdirSync(unitFeaturesDir, { recursive: true })
  }

  fs.writeFileSync(unitTestPath, unitTestContent)
  log.success(`単体テスト ${unitTestPath} を作成`)

  // 成功メッセージ
  console.log(`
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
✨ フィーチャー '${featureName}' を作成しました！

📁 作成場所: ${featurePath}

🛡️ ${colors.bold}${colors.green}中間保護層パターン実装済み:${colors.reset}
  • ${colors.green}src/app/${featureName}/page.tsx${colors.reset} (ErrorBoundary + 中間層)
  • ${colors.green}src/components/ErrorBoundary.tsx${colors.reset} (エラー隔離)

📝 作成されたファイル:
  • index.ts (公開API定義)
  • api/${featureName}-api.ts (取得の関数 - サーバー側で動く)
  • api/${featureName}-actions.ts (更新の関数 - Server Actions)
  • types/index.ts (型定義)
  • README.md (ドキュメント)
  • ${colors.green}tests/unit/features/${featureName}.test.ts (単体テスト)${colors.reset}

${colors.red}${colors.bold}⚠️  重要な注意事項:${colors.reset}
  1. ${colors.red}フックは絶対にindex.tsから公開しないでください${colors.reset}
  2. ${colors.red}Server Actions は外部から直接呼べます。関数ごとに権限を確かめ、入力を検証してください${colors.reset}
  3. 取得の関数は自分のアプリの API を fetch せず、関数の中で保存先を読んでください
  4. ${colors.green}page.tsxは中間保護層パターンで実装済み${colors.reset}

🔥 ${colors.bold}中間保護層パターンの効果:${colors.reset}
  • エラーが他フィーチャーに伝播しない
  • フィーチャー修正が他に影響しない
  • 境界違反を物理的に防ぐ

次のステップ:
  1. types/index.ts で型を定義
  2. api/${featureName}-api.ts の見本のデータを、実際の保存先（Supabase や DB）の読み取りに差し替え
  3. api/${featureName}-actions.ts の見本を、保存先への書き込みに差し替え（権限の確認を入れる）
  4. 画面の部品は src/app/${featureName}/ 側に実装
  5. ${colors.green}pnpm test:unit でユニットテストを実行${colors.reset}

境界チェック:
  ${colors.yellow}pnpm check:boundaries${colors.reset}
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`)
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log.error('フィーチャー作成中にエラーが発生しました')
  console.error(error)
  process.exit(1)
})

// 実行
createFeature().catch((error) => {
  log.error('フィーチャー作成に失敗しました')
  console.error(error)
  process.exit(1)
})
