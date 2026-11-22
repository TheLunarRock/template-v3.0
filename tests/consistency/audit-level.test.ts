/**
 * 整合性テスト: 本番依存の脆弱性監査の基準が、手元（preflight）と CI（security.yml）で一致する。
 *
 * 過去、preflight.js は本番依存を `--audit-level=critical` で、security.yml は
 * `--audit-level=high` で監査していた。そのため手元の `pnpm preflight` は high を
 * 警告で通し、push 後に CI の Security ワークフローだけが落ちた（2026-11 に発生）。
 * 基準を片方だけ変えるとこの乖離が再発するため、両者が同じであることを機械的に保証する。
 *
 * @category 整合性
 * @priority 🟡 important
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

const preflight = readFileSync(path.join(ROOT, 'scripts/preflight.js'), 'utf8')
const securityYml = readFileSync(path.join(ROOT, '.github/workflows/security.yml'), 'utf8')

/** preflight.js: `${getPackageManagerCommand('auditProd')} --audit-level=<level>` */
const PREFLIGHT_PATTERN =
  /getPackageManagerCommand\(\s*['"]auditProd['"]\s*\)\s*\}\s*--audit-level=([a-z]+)/g

/** security.yml: `pnpm audit --prod --audit-level=<level>`（本番依存に絞った監査） */
const WORKFLOW_PATTERN = /pnpm audit\s+(?:--prod|--production|-P)\s+--audit-level=([a-z]+)/g

const levelsOf = (text: string, pattern: RegExp): string[] =>
  [...text.matchAll(pattern)].map((m) => m[1])

describe('整合性: 本番依存の脆弱性監査の基準が preflight と CI で一致する', () => {
  it('preflight.js に本番依存の監査がちょうど1つある', () => {
    expect(
      levelsOf(preflight, PREFLIGHT_PATTERN).length,
      `\nscripts/preflight.js に getPackageManagerCommand('auditProd') と --audit-level の組が\n` +
        `ちょうど1つ見つかりません。\n` +
        `修正方法: 本番依存の監査を \`\${getPackageManagerCommand('auditProd')} --audit-level=<level>\` の形で1箇所に書いてください。`
    ).toBe(1)
  })

  it('security.yml に本番依存の監査がちょうど1つある', () => {
    expect(
      levelsOf(securityYml, WORKFLOW_PATTERN).length,
      `\n.github/workflows/security.yml に \`pnpm audit --prod --audit-level=<level>\` が\n` +
        `ちょうど1つ見つかりません。\n` +
        `修正方法: 本番依存の監査ステップを復元してください。`
    ).toBe(1)
  })

  it('preflight.js と security.yml の本番依存の監査基準が同じ', () => {
    const [local] = levelsOf(preflight, PREFLIGHT_PATTERN)
    const [ci] = levelsOf(securityYml, WORKFLOW_PATTERN)

    expect(
      local,
      `\n本番依存の脆弱性監査の基準が手元と CI でずれています。\n` +
        `  scripts/preflight.js:            --audit-level=${local}\n` +
        `  .github/workflows/security.yml:  --audit-level=${ci}\n` +
        `ずれていると、手元の pnpm preflight は通るのに push 後の CI だけが落ちます。\n` +
        `修正方法: 両方を同じ --audit-level にそろえてください。`
    ).toBe(ci)
  })
})
