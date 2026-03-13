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
  const dirs = ['api', 'components', 'hooks', 'types', 'utils', 'constants', 'store', '__tests__']
  dirs.forEach((dir) => {
    const dirPath = path.join(featurePath, dir)
    fs.mkdirSync(dirPath, { recursive: true })
    log.success(`${dir}/ ディレクトリを作成`)
  })

  // index.ts作成（フック公開なし）
  const indexContent = `// ✅ API関数（公開推奨）
export { 
  get${pascalName}Data,
  create${pascalName},
  update${pascalName},
  delete${pascalName}
} from './api/${featureName}Api'

// ✅ ドメイン型のみ（公開可）
export type { 
  ${pascalName},
  ${pascalName}Config 
} from './types'

// ❌❌❌ フック（絶対に公開禁止）
// export { use${pascalName} } from './hooks/use${pascalName}'  // 致命的エラー！

// ❌ UIコンポーネント（原則非公開）
// export { ${pascalName}Component } from './components/${pascalName}Component'

// ❌ 内部実装（公開禁止）
// export { validate${pascalName} } from './utils/validators'
// export { ${featureName}Store } from './store'
`

  fs.writeFileSync(path.join(featurePath, 'index.ts'), indexContent)
  log.success('index.ts を作成（フック公開禁止を明記）')

  // API ファイルのテンプレート
  const apiContent = `// ${pascalName} API Functions

export const get${pascalName}Data = async (id: string): Promise<${pascalName}> => {
  // TODO: 実装
  throw new Error('Not implemented yet');
}

export const create${pascalName} = async (data: Partial<${pascalName}>): Promise<${pascalName}> => {
  // TODO: 実装
  throw new Error('Not implemented yet');
}

export const update${pascalName} = async (id: string, data: Partial<${pascalName}>): Promise<${pascalName}> => {
  // TODO: 実装
  throw new Error('Not implemented yet');
}

export const delete${pascalName} = async (id: string): Promise<void> => {
  // TODO: 実装
  throw new Error('Not implemented yet');
}
`

  fs.writeFileSync(path.join(featurePath, 'api', `${featureName}Api.ts`), apiContent)
  log.success(`api/${featureName}Api.ts を作成`)

  // 型定義ファイル
  const typesContent = `// ${pascalName} Type Definitions

export type ${pascalName} = {
  id: string;
  // TODO: プロパティを追加
  createdAt: Date;
  updatedAt: Date;
}

export type ${pascalName}Config = {
  // TODO: 設定型を定義
}

// ❌ 内部状態型（公開しない）
type ${pascalName}State = {
  data: ${pascalName}[];
  loading: boolean;
  error: string | null;
}
`

  fs.writeFileSync(path.join(featurePath, 'types', 'index.ts'), typesContent)
  log.success('types/index.ts を作成')

  // フック ファイル（内部使用のみ）- 無限ループ防止版
  const hookContent = `import { useState, useEffect, useMemo, useRef } from 'react'
import { get${pascalName}Data } from '../api/${featureName}Api'
import type { ${pascalName} } from '../types'
import { useInfiniteLoopDetector } from '@/hooks/useInfiniteLoopDetector'

// ⚠️ このフックは内部使用のみ！絶対にindex.tsから公開しない！
// 🔥 無限ループ防止対策実装済み + リアルタイム検出

interface Use${pascalName}Options {
  category?: string
  limit?: number
  enabled?: boolean
}

export const use${pascalName} = (
  id: string,
  options?: Use${pascalName}Options
) => {
  const [data, setData] = useState<${pascalName} | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 🔥 無限ループ防止: オプションオブジェクトを安定化
  const stableOptions = useMemo(
    () => ({
      category: options?.category ?? 'all',
      limit: options?.limit ?? 10,
      enabled: options?.enabled ?? true
    }),
    [options?.category, options?.limit, options?.enabled]  // プリミティブ値のみ
  )
  
  // 🔥 無限ループ防止: 前回のIDを記憶
  const prevIdRef = useRef(id)

  // 🔍 リアルタイム無限ループ検出（開発環境のみ）
  useInfiniteLoopDetector({
    name: \`${pascalName}-\${id}\`,
    threshold: 8,
    customMessage: '${pascalName}フックでAPI呼び出しが頻発しています。依存配列またはstableOptionsを確認してください。'
  })

  useEffect(() => {
    // オプションで無効化されている場合は実行しない
    if (!stableOptions.enabled) {
      return
    }
    
    // IDが変わっていない場合はスキップ
    if (prevIdRef.current === id && data !== null) {
      return
    }
    
    prevIdRef.current = id
    
    let cancelled = false
    
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const result = await get${pascalName}Data(id)
        
        // コンポーネントがアンマウントされていない場合のみ更新
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'エラーが発生しました')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    
    fetchData()
    
    // クリーンアップ
    return () => {
      cancelled = true
    }
  }, [id, stableOptions])  // 安定した依存配列
  
  return { data, loading, error }
}
`

  fs.writeFileSync(path.join(featurePath, 'hooks', `use${pascalName}.ts`), hookContent)
  log.success(`hooks/use${pascalName}.ts を作成（内部使用のみ）`)

  // コンポーネント ファイル（内部使用のみ）
  const componentContent = `import React from 'react'
import { use${pascalName} } from '../hooks/use${pascalName}'

// ⚠️ このコンポーネントは内部使用のみ！他フィーチャーからは使用不可！
type ${pascalName}ComponentProps = {
  id: string;
}

export const ${pascalName}Component: React.FC<${pascalName}ComponentProps> = ({ id }) => {
  const { data, loading, error } = use${pascalName}(id)
  
  if (loading) {
    return <div className="font-rounded">読み込み中...</div>
  }
  
  if (error) {
    return <div className="font-rounded text-red-500">エラー: {error}</div>
  }
  
  if (!data) {
    return <div className="font-rounded">データが見つかりません</div>
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 font-rounded">
      <h2 className="text-2xl font-bold mb-4">${pascalName}</h2>
      {/* TODO: UIを実装 */}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
`

  fs.writeFileSync(
    path.join(featurePath, 'components', `${pascalName}Component.tsx`),
    componentContent
  )
  log.success(`components/${pascalName}Component.tsx を作成（内部使用のみ）`)

  // README.md
  const readmeContent = `# ${pascalName} Feature

## 概要
${featureName} フィーチャーの実装

## 構造
- \`api/\` - API関数（公開）
- \`components/\` - UIコンポーネント（内部使用のみ）
- \`hooks/\` - カスタムフック（内部使用のみ）
- \`types/\` - 型定義（ドメイン型のみ公開）
- \`utils/\` - ユーティリティ関数（内部使用のみ）
- \`constants/\` - 定数定義
- \`store/\` - 状態管理（内部使用のみ）
- \`__tests__/\` - テストファイル

## 公開API（index.ts）
- \`get${pascalName}Data()\` - データ取得
- \`create${pascalName}()\` - 作成
- \`update${pascalName}()\` - 更新
- \`delete${pascalName}()\` - 削除
- \`type ${pascalName}\` - ドメイン型

## ⚠️ 重要な注意事項
1. **フックは絶対にindex.tsから公開しない**
2. **UIコンポーネントは他フィーチャーから使用しない**
3. **データ取得は純粋な関数として公開する**
4. **内部実装の詳細は隠蔽する**

## 使用例
\`\`\`typescript
import { get${pascalName}Data, type ${pascalName} } from '@/features/${featureName}'

// API関数を使用
const data = await get${pascalName}Data('123')

// 自フィーチャー内でフックを作成
const useMyFeature = () => {
  const [data, setData] = useState<${pascalName} | null>(null)
  
  useEffect(() => {
    get${pascalName}Data('123').then(setData)
  }, [])
  
  return data
}
\`\`\`
`

  fs.writeFileSync(path.join(featurePath, 'README.md'), readmeContent)
  log.success('README.md を作成')

  // 🔥 中間保護層パターン - app/[feature]/page.tsx を生成
  const appPagePath = `src/app/${featureName}/page.tsx`
  const appPageContent = `import { FeatureErrorBoundary } from '@/components/ErrorBoundary'
import { get${pascalName}Data } from '@/features/${featureName}'
import type { ${pascalName} } from '@/features/${featureName}'

/**
 * ${pascalName}ページ - 中間保護層パターン実装
 * 
 * 構造:
 * 1. ErrorBoundary: エラーを隔離し、他フィーチャーへの影響を防ぐ
 * 2. PageContent: 中間保護層として機能（フィーチャーAPIのみ使用）
 * 3. Feature API: 公開された純粋関数のみを呼び出す
 * 
 * ⚠️ 重要: フィーチャーのコンポーネントやフックは直接使用しない
 */
export default function ${pascalName}Page() {
  return (
    <FeatureErrorBoundary featureName="${featureName}">
      <${pascalName}PageContent />
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
    // TODO: 実際のIDまたはパラメータを取得する実装が必要
    data = await get${pascalName}Data('sample-id')
  } catch (e) {
    error = e instanceof Error ? e.message : 'データの取得に失敗しました'
  }
  
  if (error) {
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
            {/* TODO: 実際のUI実装 */}
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
  const unitTestContent = `import { describe, it, expect, vi } from 'vitest';
import { get${pascalName}Data, create${pascalName}, update${pascalName}, delete${pascalName} } from '@/features/${featureName}';

describe('${pascalName} API関数', () => {
  it('get${pascalName}Data がデータを正しく取得する', async () => {
    // fetchモック
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'test-id', name: 'Test' })
    } as Response);

    const result = await get${pascalName}Data('test-id');
    expect(result).toEqual({ id: 'test-id', name: 'Test' });
  });

  it('create${pascalName} が新規作成を実行する', async () => {
    const newData = { name: 'New Item' };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-id', ...newData })
    } as Response);

    const result = await create${pascalName}(newData);
    expect(result.name).toBe('New Item');
  });

  it('update${pascalName} が更新を実行する', async () => {
    const updateData = { name: 'Updated Item' };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'test-id', ...updateData })
    } as Response);

    const result = await update${pascalName}('test-id', updateData);
    expect(result.name).toBe('Updated Item');
  });

  it('delete${pascalName} が削除を実行する', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    } as Response);

    await expect(delete${pascalName}('test-id')).resolves.not.toThrow();
  });
});
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
  • api/${featureName}Api.ts (API関数)
  • types/index.ts (型定義)
  • hooks/use${pascalName}.ts (カスタムフック - 内部使用のみ)
  • components/${pascalName}Component.tsx (UIコンポーネント - 内部使用のみ)
  • README.md (ドキュメント)
  • ${colors.green}tests/unit/features/${featureName}.test.ts (単体テスト)${colors.reset}

${colors.red}${colors.bold}⚠️  重要な注意事項:${colors.reset}
  1. ${colors.red}フックは絶対にindex.tsから公開しないでください${colors.reset}
  2. UIコンポーネントは他フィーチャーから使用しないでください
  3. データ取得は純粋な関数として公開してください
  4. ${colors.green}page.tsxは中間保護層パターンで実装済み${colors.reset}

🔥 ${colors.bold}中間保護層パターンの効果:${colors.reset}
  • エラーが他フィーチャーに伝播しない
  • フィーチャー修正が他に影響しない
  • 境界違反を物理的に防ぐ

次のステップ:
  1. types/index.ts で型を定義
  2. api/${featureName}Api.ts でAPI関数を実装
  3. 必要に応じてコンポーネントとフックを実装
  4. ${colors.green}pnpm test:unit でユニットテストを実行${colors.reset}

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
