/**
 * Bug ID: 2026-08-29-005
 * Date: 2026-08-29
 * Issue: scripts/check-boundaries.js の「内部ディレクトリ参照」ルールが grep の BRE 記法
 *        （\( \| \)）をそのまま new RegExp() に渡していたため、JS では括弧とパイプが
 *        リテラル文字として扱われ、`from '@/features/user/components/Foo'` を一件も
 *        検出できなかった。
 *        加えて走査対象が src/features/* に限定されており、src/app からフィーチャー内部を
 *        直接 import しても検出されなかった。
 *        さらに checkRelativeImports が pathSegments[1] を見ていたため、
 *        `../../user/api/x` のような多階層の相対参照を見落としていた。
 *        結果としてテンプレートの中核である「フィーチャー境界の物理的強制」が
 *        pre-commit でも CI でも機能していなかった。
 * Feature: scripts/check-boundaries.js（pnpm check:boundaries）
 * Fixed by: 列挙ではなく「@/features/<名前> より深いパスは全て違反」に変更、
 *           走査対象に src/app を追加（import 系チェックのみ）、
 *           先頭の連続する .. を読み飛ばしてから最初のセグメントを判定
 */
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(__dirname, '../..')

interface Violation {
  check: string
  message: string
  severity: string
  matches?: string[]
}

interface ScanTarget {
  dir: string
  featureName: string | null
  label: string
  structural: boolean
}

const boundaries = require('../../scripts/check-boundaries.js') as {
  checkFile: (
    filePath: string,
    content: string,
    featureName: string | null,
    options?: { structural?: boolean; knownFeatures?: string[] }
  ) => Violation[]
  checkRelativeImports: (
    filePath: string,
    content: string,
    featureName: string | null,
    knownFeatures?: string[]
  ) => Violation[]
  getScanTargets: (cwd?: string) => ScanTarget[]
}

const KNOWN_FEATURES = ['user', 'product']

function checksOf(violations: Violation[]): string[] {
  return violations.map((v) => v.check)
}

describe('Regression: 2026-08-29-005 - 境界チェックのディープimport検出が不発', () => {
  it('1. @/features/user/components/Foo が内部ディレクトリ参照として検出される', () => {
    const violations = boundaries.checkFile(
      'src/features/product/components/Card.tsx',
      "import { X } from '@/features/user/components/Foo'\n",
      'product',
      { knownFeatures: KNOWN_FEATURES }
    )

    expect(
      checksOf(violations),
      [
        'ディープ import が検出されていません。',
        '',
        'grep の BRE 記法（\\( \\| \\)）を new RegExp() に渡すと、JS では括弧とパイプが',
        'リテラル文字になり一件もマッチしない。テンプレートの中核である境界強制が',
        'pre-commit でも CI でも無効化される。',
      ].join('\n')
    ).toContain('内部ディレクトリ参照')
  })

  it('1b. hooks / utils / api / types / store など列挙外の深さも検出される', () => {
    const deepImports = [
      "import { X } from '@/features/user/hooks/useUser'",
      "import { X } from '@/features/user/api/userApi'",
      "import { X } from '@/features/user/store/userStore'",
      "import { X } from '@/features/user/constants/keys'",
    ]

    for (const line of deepImports) {
      const violations = boundaries.checkFile('src/app/page.tsx', `${line}\n`, null, {
        structural: false,
        knownFeatures: KNOWN_FEATURES,
      })
      expect(checksOf(violations), `検出されなかった: ${line}`).toContain('内部ディレクトリ参照')
    }
  })

  it('2. @/features/user（公開API）は誤検知しない', () => {
    const violations = boundaries.checkFile(
      'src/features/product/components/Card.tsx',
      "import { getUserData } from '@/features/user'\n",
      'product',
      { knownFeatures: KNOWN_FEATURES }
    )

    expect(checksOf(violations)).not.toContain('内部ディレクトリ参照')
  })

  it('3. src/app が走査対象に含まれる', () => {
    const targets = boundaries.getScanTargets(ROOT)
    const appTarget = targets.find((t) => t.label === 'src/app')

    expect(
      appTarget,
      [
        'src/app が走査対象に含まれていません。',
        'src/app からフィーチャー内部を直接 import しても検出されない穴が残る。',
      ].join('\n')
    ).toBeDefined()
    // structural: false = index.ts 前提のチェック（index.ts不在 / フック公開 / UIコンポーネント公開）は適用しない。
    // ErrorBoundary未使用 / PageContent未分離 は 2026-08-30 から src/app にも適用する
    // （errorBoundary フラグで分離。tests/regression/2026-08-30-001-*.test.ts が検証）。
    expect(appTarget?.structural).toBe(false)
  })

  // 2026-08-30-001 で方針を反転: src/app にも ErrorBoundary未使用 / PageContent未分離 を適用する。
  // ここで守り続けるのは「フィーチャー配下の構造チェックを殺していない」こと。
  // src/app 側の適用は tests/regression/2026-08-30-001-*.test.ts が検証する。
  it('3b. フィーチャー配下では構造チェックが従来どおり効く', () => {
    const barePage = 'export default function Page() {\n  return <div />\n}\n'

    const asFeature = boundaries.checkFile('src/features/user/page.tsx', barePage, 'user', {
      knownFeatures: KNOWN_FEATURES,
    })
    expect(checksOf(asFeature)).toContain('ErrorBoundary未使用')
    expect(checksOf(asFeature)).toContain('PageContent未分離')
  })

  it('4. ../../user/api/x が他フィーチャーへの相対パス参照として検出される', () => {
    const violations = boundaries.checkRelativeImports(
      'src/features/product/components/Card.tsx',
      "import { X } from '../../user/api/x'\n",
      'product',
      KNOWN_FEATURES
    )

    expect(
      checksOf(violations),
      [
        '多階層の相対パス参照が検出されていません。',
        'pathSegments[1] を見ると `../../user/api` では ".." を拾ってしまう。',
        '先頭の連続する .. を読み飛ばしてから最初のセグメントを判定する必要がある。',
      ].join('\n')
    ).toContain('他フィーチャーへの相対パス参照')
  })

  it('4b. 同一フィーチャー内の相対参照は誤検知しない', () => {
    const violations = boundaries.checkRelativeImports(
      'src/features/user/components/Card.tsx',
      "import { helper } from '../utils/helper'\nimport { y } from '../../user/api/x'\n",
      'user',
      KNOWN_FEATURES
    )

    expect(checksOf(violations)).not.toContain('他フィーチャーへの相対パス参照')
  })
})
