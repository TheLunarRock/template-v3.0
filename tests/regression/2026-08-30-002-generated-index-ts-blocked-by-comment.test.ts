/**
 * Bug ID: 2026-08-30-002
 * Date: 2026-08-30
 * Issue: scripts/check-boundaries.js の checkFile はコメントを除去せずに正規表現を
 *        当てるため、pnpm create:feature が生成する index.ts の「やってはいけない例」
 *        （コメントアウトされた export 行）を本物の違反として検出していた。
 *        フック公開は critical → results.errors++ → process.exit(1) のため、
 *        フィーチャーを生成した直後に pre-commit が止まり、テンプレートの主要
 *        ワークフロー（create:feature → 実装 → コミット）が箱から出した状態で通らなかった。
 * Feature: scripts/check-boundaries.js（pnpm check:boundaries）
 * Fixed by: 検査用の一時文字列に対してのみ行コメント・ブロックコメントを除去してから
 *           パターンを適用する。文字列リテラル（'...' / "..." / `...`）の中は
 *           コメントとみなさないため、URL の // で以降を見落とすことはない。
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

interface Violation {
  check: string
  message: string
  severity: string
  matches?: string[]
}

const boundaries = require('../../scripts/check-boundaries.js') as {
  checkFile: (
    filePath: string,
    content: string,
    featureName: string | null,
    options?: { structural?: boolean; errorBoundary?: boolean; knownFeatures?: string[] }
  ) => Violation[]
}

const KNOWN_FEATURES = ['user', 'product']
const INDEX_PATH = 'src/features/user/index.ts'

const checksOf = (violations: Violation[]): string[] => violations.map((v) => v.check)

const check = (content: string): Violation[] =>
  boundaries.checkFile(INDEX_PATH, content, 'user', { knownFeatures: KNOWN_FEATURES })

/** pnpm create:feature が featureName=user / pascalName=User で生成する index.ts と同一内容 */
const GENERATED_INDEX = `// ✅ API関数（公開推奨）
export { 
  getUserData,
  createUser,
  updateUser,
  deleteUser
} from './api/userApi'

// ✅ ドメイン型のみ（公開可）
export type { 
  User,
  UserConfig 
} from './types'

// ❌❌❌ フック（絶対に公開禁止）
// export { useUser } from './hooks/useUser'  // 致命的エラー！

// ❌ UIコンポーネント（原則非公開）
// export { UserComponent } from './components/UserComponent'

// ❌ 内部実装（公開禁止）
// export { validateUser } from './utils/validators'
// export { userStore } from './store'
`

describe('Regression: 2026-08-30-002 - 生成された index.ts が境界チェックで落ちる', () => {
  it('create:feature が生成する index.ts は違反0（教育用コメントを違反と誤検出しない）', () => {
    const violations = check(GENERATED_INDEX)
    const detail = violations
      .map((v) => v.check + '(' + (v.matches?.join(' / ') ?? '') + ')')
      .join(', ')

    expect(
      checksOf(violations),
      [
        'pnpm create:feature の生成物が境界チェックに違反しています。',
        '生成直後に pre-commit（critical）で止まり、テンプレートの主要ワークフローが通りません。',
        '修正方法: checkFile がパターンを当てる前に、検査用の一時文字列からコメントを除去してください。',
        `検出された違反: ${detail}`,
      ].join('\n')
    ).toEqual([])
  })

  it('コメントアウトされていない本物のフック公開は critical として検出される', () => {
    const violations = check("export { useUser } from './hooks/useUser'\n")

    expect(
      checksOf(violations),
      'コメント除去が効きすぎて本物の違反を見落としています（検査が弱くなっています）'
    ).toContain('フック公開')
    expect(violations.find((v) => v.check === 'フック公開')?.severity).toBe('critical')
  })

  it('コメントアウトされた UI コンポーネント公開は検出されず、本物は検出される', () => {
    const commented = check("// export { UserComponent } from './components/UserComponent'\n")
    expect(checksOf(commented)).not.toContain('UIコンポーネント公開')

    const real = check("export { UserComponent } from './components/UserComponent'\n")
    expect(checksOf(real)).toContain('UIコンポーネント公開')
  })

  it('ブロックコメントの中も検出されない', () => {
    const violations = check(
      ['/*', " export { useUser } from './hooks/useUser'", ' 複数行にまたがる例', '*/', ''].join(
        '\n'
      )
    )

    expect(checksOf(violations)).not.toContain('フック公開')
  })

  it('文字列リテラル内の // をコメントと誤認して以降を見落とさない', () => {
    // 素朴に「// 以降を削る」実装だと、URL の // で行末まで消えて本物の違反を見落とす
    const violations = check(
      "const DOC = 'https://example.com/hooks'; export { useUser } from './hooks/useUser'\n"
    )

    expect(
      checksOf(violations),
      '文字列リテラル内の // をコメント開始とみなして以降を削っています（違反を見落とします）'
    ).toContain('フック公開')
  })
})
