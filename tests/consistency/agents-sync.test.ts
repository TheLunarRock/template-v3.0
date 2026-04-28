/**
 * 整合性テスト: AGENTS.md と CLAUDE.md の always-on ルール抜粋が同期している。
 *
 * AGENTS.md は Cursor / GitHub Codex / Aider など Claude Code 以外の
 * AI ツール向けに、リポジトリの always-on ルールを抜粋したファイル。
 * CLAUDE.md でルールを変更した場合、AGENTS.md にも反映しないと
 * 他ツールが古いルールに基づいて誤った実装を生成する。
 *
 * 本テストは、両ファイルが相互参照していること、および
 * 重要な always-on ルールのキー概念が両ファイルに存在することを保証する。
 *
 * @category 整合性
 * @priority 🟡 important
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

const agents = readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8')
const claude = readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8')

describe('整合性: AGENTS.md と CLAUDE.md の always-on ルールが同期している', () => {
  it('AGENTS.md と CLAUDE.md が相互参照している', () => {
    expect(
      agents.includes('CLAUDE.md'),
      `\nAGENTS.md に CLAUDE.md への参照が見つかりません。\n` +
        `修正方法: AGENTS.md 末尾の参照表に CLAUDE.md へのリンクを追加してください。`
    ).toBe(true)

    expect(
      claude.includes('AGENTS.md'),
      `\nCLAUDE.md に AGENTS.md への参照が見つかりません。\n` +
        `修正方法: CLAUDE.md の参照ドキュメント表に AGENTS.md を追加してください。`
    ).toBe(true)
  })

  it('always-on ルールのキー概念が両ファイルに存在する', () => {
    const KEY_CONCEPTS = [
      'フックは絶対にindex.tsから公開しない',
      '計算済みデータ',
      '回帰テスト',
      'force-with-lease',
      'tests/consistency/',
      // v3.7.7〜: ブランチ運用ルール（PR運用OFF時は feature branch をリモートpush禁止）
      'feature branch をリモートに push しない',
      // v3.7.7〜: 過去事例の参照（4/24 silver-hp Vercel build minutes 爆発）
      'silver-hp',
    ] as const

    const missingInAgents = KEY_CONCEPTS.filter((c) => !agents.includes(c))
    const missingInClaude = KEY_CONCEPTS.filter((c) => !claude.includes(c))

    if (missingInAgents.length > 0) {
      const hint =
        `\nAGENTS.md にキー概念が見つかりません:\n` +
        missingInAgents.map((c) => `  - 「${c}」`).join('\n') +
        '\n\n修正方法: AGENTS.md の always-on ルール抜粋に該当ルールを追加してください。'
      expect(missingInAgents, hint).toEqual([])
    }

    if (missingInClaude.length > 0) {
      const hint =
        `\nCLAUDE.md にキー概念が見つかりません(AGENTS.md と乖離しています):\n` +
        missingInClaude.map((c) => `  - 「${c}」`).join('\n') +
        '\n\n修正方法: CLAUDE.md の対応箇所を確認し、AGENTS.md と表現を揃えてください。'
      expect(missingInClaude, hint).toEqual([])
    }
  })
})
