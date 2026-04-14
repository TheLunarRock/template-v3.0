/**
 * 整合性テスト: 必須 MCP サーバーリストが全ファイルで一致する。
 *
 * このテンプレートは Claude Code + 4種類の必須 MCP サーバー
 * （serena / context7 / sequential-thinking / morphllm-fast-apply）を
 * 前提とする。リストが CLAUDE.md / SETUP_GUIDE.md / setup.js で
 * ズレると、新規セットアップ時に AI が誤った MCP セットを推奨する。
 *
 * @category 整合性
 * @priority 🟢 recommended
 */
/* eslint-disable security/detect-non-literal-fs-filename */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

/**
 * このテンプレートが必須とする MCP サーバー。
 * 増減する場合はここを更新し、各ファイルへの記載も同時に更新する。
 */
const REQUIRED_MCPS = ['serena', 'context7', 'sequential-thinking', 'morphllm-fast-apply'] as const

const filesToCheck = [
  'CLAUDE.md',
  'SETUP_GUIDE.md',
  'SPECIFICATION.md',
  'scripts/setup.js',
] as const

describe('整合性: 必須 MCP サーバーが全ドキュメント・スクリプトに記載されている', () => {
  describe.each(REQUIRED_MCPS)('MCP: %s', (mcp) => {
    it.each(filesToCheck)('%s に記載されている', (file) => {
      const content = readFileSync(path.join(ROOT, file), 'utf8')
      expect(
        content.includes(mcp),
        `\n${file} に MCP サーバー "${mcp}" の記載がありません。\n` +
          `修正方法: claude mcp add ${mcp} ... のセットアップ手順を追加してください。`
      ).toBe(true)
    })
  })

  it('setup.js の checkPrerequisites の MCP リストが REQUIRED_MCPS と一致する', () => {
    const setupCode = readFileSync(path.join(ROOT, 'scripts/setup.js'), 'utf8')
    // setup.js 内の requiredMcps 配列を抽出
    const arrayMatch = /const requiredMcps\s*=\s*\[([\s\S]*?)\]/.exec(setupCode)
    if (!arrayMatch) {
      throw new Error('scripts/setup.js 内に requiredMcps 配列が見つかりません')
    }

    const localeSort = (a: string, b: string) => a.localeCompare(b)
    const fromScript = [...arrayMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort(localeSort)
    const expected = [...REQUIRED_MCPS].sort(localeSort)

    expect(
      fromScript,
      `\nscripts/setup.js の MCP リストとテストの REQUIRED_MCPS が不一致です\n` +
        `  setup.js: ${fromScript.join(', ')}\n` +
        `  expected: ${expected.join(', ')}\n` +
        `修正方法: 両方を一致させてください`
    ).toEqual(expected)
  })
})
