/**
 * 整合性テスト: 「N層防御」の数がドキュメント間で一致する。
 *
 * 防御層を追加する際（例: 8層 → 9層）に、CLAUDE.md と SPECIFICATION.md
 * の両方を更新する必要があるが、片方だけ更新されると AI が古い数字を
 * 信じてしまう。本日の作業（第9層追加）で実際に発生した問題への対策。
 *
 * @category 整合性
 * @priority 🟡 important
 */
/* eslint-disable sonarjs/slow-regex */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

describe('整合性: 防御層の数がドキュメント間で一致する', () => {
  it('CLAUDE.md と SPECIFICATION.md の「N層防御」が同じ数字である', () => {
    const claude = readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8')
    const spec = readFileSync(path.join(ROOT, 'SPECIFICATION.md'), 'utf8')

    /**
     * 「N層防御」のパターン（N は1〜2桁の整数）を全件抽出。
     * 「第N層防御」のような個別層名は除外する（lookbehindで「第」を排除）。
     * 例:
     *   "9層防御"           → 9 を抽出（全体の体制を指す）
     *   "第8層防御・7種"    → 抽出しない（個別の第8層を指す）
     */
    const extract = (text: string): number[] => {
      const layerCounts = [...text.matchAll(/(?<!第)(\d+)層防御/g)].map((m) => parseInt(m[1], 10))
      return layerCounts
    }

    const claudeLayers = extract(claude)
    const specLayers = extract(spec)

    expect(claudeLayers.length, 'CLAUDE.md に「N層防御」の記載がありません').toBeGreaterThan(0)
    expect(specLayers.length, 'SPECIFICATION.md に「N層防御」の記載がありません').toBeGreaterThan(0)

    const allLayers = [...claudeLayers, ...specLayers]
    const unique = [...new Set(allLayers)]

    if (unique.length > 1) {
      const hint =
        `\n防御層の数がドキュメント間で不整合です: ${unique.join(', ')} が混在しています\n` +
        `  CLAUDE.md: ${[...new Set(claudeLayers)].join(', ')}\n` +
        `  SPECIFICATION.md: ${[...new Set(specLayers)].join(', ')}\n\n` +
        `修正方法:\n` +
        `  両方のドキュメントで「N層防御」の N を統一してください（最大値が現在の正解）。`
      expect(unique, hint).toHaveLength(1)
    }
  })

  it('CLAUDE.md の防御層テーブルの行数と「N層防御」の N が一致する', () => {
    const claude = readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8')

    // "セキュリティ体制（N層防御）" を抽出
    const titleMatch = /セキュリティ体制(?:[（(])(\d+)層防御(?:[）)])/.exec(claude)
    if (!titleMatch) {
      throw new Error('CLAUDE.md に「セキュリティ体制（N層防御）」の見出しがありません')
    }
    const declared = parseInt(titleMatch[1], 10)

    // 「**第N層**」の行を全件カウント
    const layerRows = [...claude.matchAll(/\|\s*\*\*第(\d+)層\*\*\s*\|/g)].map((m) =>
      parseInt(m[1], 10)
    )
    const uniqueRows = [...new Set(layerRows)]

    expect(
      uniqueRows.length,
      `\nCLAUDE.md の防御層テーブルの行数 (${uniqueRows.length}) が「${declared}層防御」と一致しません\n` +
        `  検出された層番号: ${uniqueRows.join(', ')}\n` +
        `修正方法: テーブルに第1〜第${declared}層を漏れなく記載してください。`
    ).toBe(declared)

    // 第1層から第N層まで連続しているか
    const expected = Array.from({ length: declared }, (_, i) => i + 1)
    const sortedRows = [...uniqueRows].sort((a, b) => a - b)
    expect(sortedRows, '\n防御層が連続していません。第1層から順に記載してください。').toEqual(
      expected
    )
  })
})
