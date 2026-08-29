/**
 * 整合性テスト: 必須 MCP サーバーリストが全ファイルで一致する。
 *
 * このテンプレートは Claude Code + 4種類の必須 MCP サーバー
 * （serena / context7 / sequential-thinking / morphllm-fast-apply）を
 * 前提とする。リストが CLAUDE.md / SETUP_GUIDE.md / setup.js で
 * ズレると、新規セットアップ時に AI が誤った MCP セットを推奨する。
 *
 * 検証方法（2026-08-30 に厳密化）: 以前は `content.includes('serena')` という
 * 部分一致だったため、`mcp__serena__write_memory` のような別文脈の文字列に
 * 引っかかって通ってしまい、逆に「ティア別」表の `**Context7**` は先頭大文字で
 * 一致しなかった。つまり「登録手順が書かれているか」を何も保証していなかった。
 * 現在は登録コマンド `claude mcp add <名前>` からサーバー名を抽出し、
 * 完全一致で検証する。
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
  // MCP 初回セットアップ手順（claude mcp add）の移動先。
  // CLAUDE.md から分離した際に検査が素通りしないよう対象に加える。
  'docs/SUPERCLAUDE_REFERENCE.md',
  'scripts/setup.js',
] as const

/**
 * `claude mcp add <名前>` の形で登録されているサーバー名を抽出する。
 * 部分一致ではなく登録コマンドの形で見るため、`mcp__serena__...` のような
 * 別文脈の出現には反応しない。
 */
const registeredMcps = (content: string): string[] =>
  [...content.matchAll(/claude mcp add ([A-Za-z0-9_.-]+)/g)].map((m) => m[1])

describe('整合性: 必須 MCP サーバーが全ドキュメント・スクリプトに記載されている', () => {
  describe.each(REQUIRED_MCPS)('MCP: %s', (mcp) => {
    it.each(filesToCheck)('%s に登録手順がある', (file) => {
      const content = readFileSync(path.join(ROOT, file), 'utf8')
      const registered = registeredMcps(content)
      expect(
        registered,
        `\n${file} に MCP サーバー "${mcp}" の登録手順がありません。\n` +
          `  検出できた登録コマンド: ${registered.length > 0 ? registered.join(', ') : '（なし）'}\n` +
          `修正方法: 「claude mcp add ${mcp} ...」の行を追加してください。\n` +
          `（部分一致ではなく登録コマンドの形で検証しています。名前の言及だけでは通りません）`
      ).toContain(mcp)
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
