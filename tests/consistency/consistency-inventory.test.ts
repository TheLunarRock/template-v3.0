/**
 * 整合性テスト: テスト目録の自己検証。
 *
 * `tests/consistency/` 配下の整合性テストファイル数・一覧が、
 * CLAUDE.md と SPECIFICATION.md の記載と一致することを保証する。
 *
 * 過去、`vercel-config.test.ts` を追加したのにドキュメントのファイル数
 * （「8ファイル」）と一覧表が更新されず、静かに乖離した。件数を検証する
 * 仕組みが無かったことが根本原因。本テストがその再発を機械的にブロックする。
 *
 * @category 整合性
 * @priority 🟢 recommended
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const CONSISTENCY_DIR = path.join(ROOT, 'tests/consistency')

const testFiles = readdirSync(CONSISTENCY_DIR)
  .filter((f) => f.endsWith('.test.ts'))
  .sort((a, b) => a.localeCompare(b))

const claudeMd = readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8')
const spec = readFileSync(path.join(ROOT, 'SPECIFICATION.md'), 'utf8')

/**
 * 「`tests/consistency/` 配下の **Nファイル**」表記を持つファイル。
 * README.md は 2026-08-30 に追加（それまで「57テスト」という
 * 誰も見張っていない総数が書かれ、実測 90 件と乖離していた）。
 */
const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8')
const COUNT_SOURCES = [
  ['CLAUDE.md', claudeMd],
  ['README.md', readme],
] as const
const COUNT_PATTERN = /配下の\s*\*\*(\d+)\s*ファイル/

describe('整合性: テスト目録の自己検証（consistency-inventory）', () => {
  it.each(COUNT_SOURCES)(
    '%s の記載ファイル数が tests/consistency の実数と一致する',
    (file, content) => {
      const m = COUNT_PATTERN.exec(content)
      expect(
        m,
        `${file} に「\`tests/consistency/\` 配下の **Nファイル**」表記が見つからない`
      ).not.toBeNull()
      expect(
        Number(m?.[1]),
        `\n${file} の記載ファイル数が実数と一致しません。\n` +
          `  ${file}: ${m?.[1]} ファイル\n` +
          `  実数:  ${testFiles.length} ファイル\n` +
          `修正方法: ${file} の「配下の **Nファイル**」を ${testFiles.length} に更新してください。`
      ).toBe(testFiles.length)
    }
  )

  it('全テストファイルが CLAUDE.md の整合性表に記載されている', () => {
    const missing = testFiles.filter((f) => !claudeMd.includes(f))
    expect(missing, `CLAUDE.md に未記載: ${missing.join(', ')}`).toEqual([])
  })

  it('全テストファイルが SPECIFICATION.md に記載されている', () => {
    const missing = testFiles.filter((f) => !spec.includes(f))
    expect(missing, `SPECIFICATION.md に未記載: ${missing.join(', ')}`).toEqual([])
  })
})
