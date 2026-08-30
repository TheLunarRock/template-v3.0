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

/**
 * SPECIFICATION.md 側の件数表記。§23.2 は「ファイル数と一覧は
 * consistency-inventory.test.ts が CLAUDE.md / SPECIFICATION.md の記載と自動照合」
 * と書いているのに、実際には SPECIFICATION.md の数値を見ていなかった
 * （仕様書の記述が実態と食い違っていた）。2026-08-30 に監視対象へ追加。
 */
const SPEC_COUNT_PATTERNS = [
  ['§23.2 テストファイル数', /\*\*テストファイル数\*\*\s*\|\s*(\d+)\s*ファイル/],
  ['§23.3 見出し', /整合性テストファイル一覧（(\d+)ファイル）/],
] as const

/**
 * §23.4「検証する整合性問題のN類型」は**ファイル数とは独立した数**。
 * 1ファイルが複数類型を担うこともあれば（setup-templates は #1・#2）、
 * 1類型を複数ファイルで担うこともある（#8 は mcp-list と protected-files）。
 * したがって実ファイル数ではなく、類型表の行数と突き合わせる。
 */
const TYPE_SECTION_PATTERN = /### 23\.4 検証する整合性問題の(\d+)類型\n([\s\S]*?)\n### /
const TYPE_ROW_PATTERN = /^\|\s*\d+\s*\|/gm

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

  it.each(SPEC_COUNT_PATTERNS)(
    'SPECIFICATION.md %s の件数が tests/consistency の実数と一致する',
    (label, pattern) => {
      const m = pattern.exec(spec)
      expect(
        m,
        `\nSPECIFICATION.md の ${label} に件数表記が見つかりません。\n` +
          `  探しているパターン: ${String(pattern)}\n` +
          `修正方法: 見出し・表の文言を戻すか、本テストのパターンを実際の表記に合わせてください。`
      ).not.toBeNull()
      expect(
        Number(m?.[1]),
        `\nSPECIFICATION.md の ${label} が実数と一致しません。\n` +
          `  SPECIFICATION.md: ${m?.[1]}\n` +
          `  実数:             ${testFiles.length}\n` +
          `修正方法: SPECIFICATION.md の ${label} を ${testFiles.length} に更新してください。`
      ).toBe(testFiles.length)
    }
  )

  it('SPECIFICATION.md §23.4 の見出しの類型数が類型表の行数と一致する', () => {
    const m = TYPE_SECTION_PATTERN.exec(spec)
    expect(
      m,
      `\nSPECIFICATION.md に §23.4「検証する整合性問題のN類型」セクションが見つかりません。\n` +
        `修正方法: 見出しを戻すか、本テストの TYPE_SECTION_PATTERN を実際の表記に合わせてください。`
    ).not.toBeNull()

    const declared = Number(m?.[1])
    const rows = (m?.[2] ?? '').match(TYPE_ROW_PATTERN) ?? []

    expect(
      rows.length,
      `\nSPECIFICATION.md §23.4 の見出しの類型数が、類型表の行数と一致しません。\n` +
        `  見出し: ${declared} 類型\n` +
        `  表の行数: ${rows.length} 行\n` +
        `修正方法: 類型を追加/削除したら見出しの数値も合わせてください。\n` +
        `（類型数は tests/consistency のファイル数とは独立した数です。1ファイルが複数類型を担うことがあります）`
    ).toBe(declared)
  })
})
