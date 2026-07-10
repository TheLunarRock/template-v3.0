/**
 * Bug ID: 2026-07-11-002
 * Date: 2026-07-11
 * Issue: scripts/preflight.js が SuperClaude モード時に MCP_CONFIG.priority.testing を
 *        参照していたが、MCP_CONFIG.priority に testing キーは存在せず「推奨MCP: undefined
 *        (テスト用)」と表示していた。本テンプレートは E2E/Playwright を意図的に削除しており、
 *        テスト用 MCP は存在しないため、値を捏造せず当該節を除去した。
 * Feature: scripts/preflight (pnpm preflight --sc-*)
 * Fixed by: 壊れた (テスト用) 節を削除し、実在する analysis 推奨のみ表示
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { MCP_CONFIG } = require('../../scripts/utils.js') as {
  MCP_CONFIG: { priority: Record<string, string> }
}

const ROOT = path.resolve(__dirname, '../..')
const preflightSrc = readFileSync(path.join(ROOT, 'scripts/preflight.js'), 'utf8')

describe('Regression: 2026-07-11-002 - preflight の推奨MCP undefined 表示', () => {
  it('MCP_CONFIG.priority に testing キーは存在しない（前提の記録）', () => {
    expect(MCP_CONFIG.priority.testing).toBeUndefined()
  })

  it('preflight.js は存在しない priority.testing を参照しない（再発防止）', () => {
    expect(preflightSrc).not.toMatch(/priority\.testing/)
  })
})
