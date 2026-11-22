/**
 * Bug ID: 2026-11-23-001
 * Date: 2026-11-23
 * Issue: pnpm dev を一度動かすと .next/dev/types/validator.ts が作られ、
 *        .next/dev を消すまで pnpm build と pnpm typecheck が次のエラーで落ちる。
 *          TS6196: 'AppRouteHandlerRoutes' is declared but never used.
 *          TS6133: 'NextRequest' is declared but its value is never read.
 *        開発サーバーが作る validator.ts は API ルート用の import を常に書くため、
 *        API ルートが無いこのテンプレートでは未使用になり、noUnusedLocals に
 *        引っかかる。validator.ts は .ts なので skipLibCheck も効かない。
 * Feature: tsconfig.json（型チェックの対象範囲）
 * Fixed by: tsconfig.json の exclude に .next/dev/types/validator.ts の 1 ファイルだけを足す。
 *           ビルド用の .next/types/validator.ts は検査に残し、noUnusedLocals も緩めない。
 *
 * @category 回帰
 * @priority 🔴 critical
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import ts from 'typescript'

const ROOT = path.resolve(__dirname, '../..')

interface TsconfigShape {
  include?: string[]
  exclude?: string[]
  compilerOptions?: { noUnusedLocals?: boolean; noUnusedParameters?: boolean }
}

/** tsconfig.json はコメントを含むため、TypeScript 自身のパーサで読む */
const readTsconfig = (): TsconfigShape => {
  const text = readFileSync(path.join(ROOT, 'tsconfig.json'), 'utf8')
  const result: { config?: unknown; error?: ts.Diagnostic } = ts.parseConfigFileTextToJson(
    'tsconfig.json',
    text
  )
  if (result.error) {
    const message = ts.flattenDiagnosticMessageText(result.error.messageText, '\n')
    throw new Error(`tsconfig.json を読めません: ${message}`)
  }
  return result.config as TsconfigShape
}

describe('Regression: 2026-11-23-001 - 開発サーバーの validator.ts で typecheck が落ちる', () => {
  it('exclude に .next/dev/types/validator.ts が含まれる', () => {
    expect(readTsconfig().exclude).toContain('.next/dev/types/validator.ts')
  })

  it('exclude で .next/dev 全体を外していない（開発中の routes.d.ts は使い続ける）', () => {
    const exclude = readTsconfig().exclude ?? []
    const wholeDirPatterns = [
      '.next',
      '.next/dev',
      '.next/dev/types',
      '.next/dev/**',
      '.next/dev/types/**',
    ]
    expect(exclude.filter((entry) => wholeDirPatterns.includes(entry.replace(/\/$/, '')))).toEqual(
      []
    )
    expect(exclude.filter((entry) => entry.startsWith('.next/dev/types/**'))).toEqual([])
  })

  it('include に .next/types/**/*.ts が残っている（ビルド用の検証を外していない）', () => {
    expect(readTsconfig().include).toContain('.next/types/**/*.ts')
  })

  it('noUnusedLocals / noUnusedParameters は true のまま', () => {
    const options = readTsconfig().compilerOptions
    expect(options?.noUnusedLocals).toBe(true)
    expect(options?.noUnusedParameters).toBe(true)
  })
})
