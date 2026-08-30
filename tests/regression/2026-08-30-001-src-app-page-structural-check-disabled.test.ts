/**
 * Bug ID: 2026-08-30-001
 * Date: 2026-08-30
 * Issue: scripts/check-boundaries.js が src/app を構造チェック
 *        （ErrorBoundary未使用 / PageContent未分離）の対象外にしていたため、
 *        テンプレートが要求する「中間保護層パターン」を利用者が新規作成する
 *        src/app/**\/page.tsx に対して一切強制できていなかった。
 *        除外の理由は「テンプレート同梱の src/app/page.tsx が即座に警告を出すため」
 *        だったが、その page.tsx を ErrorBoundary → PageContent 構造に直したことで
 *        除外を残す根拠が消えた。
 * Feature: scripts/check-boundaries.js（pnpm check:boundaries）
 * Fixed by: checkFile / checkTarget に errorBoundary フラグを分離し、
 *           src/app の走査対象に errorBoundary: true を付与。
 *           index.ts不在 はフィーチャー固有の要件なので src/app には適用しない
 *           （structural: false のまま）。
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(__dirname, '../..')

interface Violation {
  check: string
  message: string
  severity: string
}

interface ScanTarget {
  dir: string
  featureName: string | null
  label: string
  structural: boolean
  errorBoundary?: boolean
}

const boundaries = require('../../scripts/check-boundaries.js') as {
  checkFile: (
    filePath: string,
    content: string,
    featureName: string | null,
    options?: { structural?: boolean; errorBoundary?: boolean; knownFeatures?: string[] }
  ) => Violation[]
  checkTarget: (target: ScanTarget) => Violation[]
  getScanTargets: (cwd?: string) => ScanTarget[]
}

const checksOf = (violations: Violation[]): string[] => violations.map((v) => v.check)

/** 実際の走査で src/app に使われるオプションを取り出す（手で渡した値ではなく配線を検証する） */
const appTarget = (): ScanTarget => {
  const target = boundaries.getScanTargets(ROOT).find((t) => t.label === 'src/app')
  if (!target) throw new Error('src/app が走査対象に含まれていません')
  return target
}

const appOptions = () => {
  const target = appTarget()
  return { structural: target.structural, errorBoundary: target.errorBoundary }
}

describe('Regression: 2026-08-30-001 - src/app の page.tsx に構造チェックが効いていなかった', () => {
  it('ErrorBoundary を使っていない src/app の page.tsx で ErrorBoundary未使用 が検出される', () => {
    const barePage = 'export default function Page() {\n  return <div />\n}\n'

    const violations = boundaries.checkFile(
      'src/app/dashboard/page.tsx',
      barePage,
      null,
      appOptions()
    )

    expect(
      checksOf(violations),
      [
        'src/app の page.tsx で ErrorBoundary未使用 が検出されませんでした。',
        '中間保護層パターン（ErrorBoundary → PageContent）が利用者のページに強制されません。',
        '修正方法: getScanTargets の src/app ターゲットに errorBoundary: true が付いているか確認してください。',
      ].join('\n')
    ).toContain('ErrorBoundary未使用')
  })

  it('PageContent に分離していない src/app の page.tsx で PageContent未分離 が検出される', () => {
    // ErrorBoundary は使っているが中身を PageContent に分離していないケース
    const notSplit = [
      "import { ErrorBoundary } from '@/components/ErrorBoundary'",
      '',
      'export default function Page() {',
      '  return (',
      '    <ErrorBoundary>',
      '      <div>直書き</div>',
      '    </ErrorBoundary>',
      '  )',
      '}',
    ].join('\n')

    const violations = boundaries.checkFile(
      'src/app/dashboard/page.tsx',
      notSplit,
      null,
      appOptions()
    )

    expect(checksOf(violations)).toContain('PageContent未分離')
    expect(checksOf(violations)).not.toContain('ErrorBoundary未使用')
  })

  it('同梱の src/app/page.tsx は違反ゼロ（テンプレート自身が要求パターンの実例になっている）', () => {
    const pagePath = path.join(ROOT, 'src/app/page.tsx')
    const content = fs.readFileSync(pagePath, 'utf8')

    const violations = boundaries.checkFile('src/app/page.tsx', content, null, appOptions())

    expect(
      checksOf(violations),
      [
        '同梱の src/app/page.tsx が境界チェックに違反しています。',
        'ルールを課している側が実例を持っていない状態に戻っています。',
        '修正方法: src/app/page.tsx を ErrorBoundary → PageContent 構造に戻してください。',
      ].join('\n')
    ).toEqual([])
  })

  it('src/app に index.ts不在 は適用しない（App Router のディレクトリには当てはまらない）', () => {
    const violations = boundaries.checkTarget(appTarget())

    expect(
      checksOf(violations),
      [
        'src/app に index.ts不在 が適用されています。',
        'index.ts はフィーチャーの公開APIのための要件で、App Router のディレクトリには不要です。',
        '修正方法: src/app の走査ターゲットは structural: false のままにしてください。',
      ].join('\n')
    ).not.toContain('index.ts不在')
  })
})
