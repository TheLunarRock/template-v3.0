/**
 * 整合性テスト: `.github/workflows/claude.yml` の起動ゲートと v1 仕様への追随。
 *
 * 2つの実害を機械的にブロックする。
 *
 * 1. 起動ゲートの欠落 → 他人の issue / コメントでも runner が立ち、
 *    GitHub Actions の分数を消費する。action 側の権限チェックは runner が
 *    起動してから走るため、その手前のジョブ条件（`if:`）で落とす必要がある。
 * 2. 廃止入力の残存 → `anthropics/claude-code-action` は v1.0 で
 *    `mode` / `direct_prompt` / `allowed_tools` / `model` を廃止し、
 *    `prompt` と `claude_args` に統合した。`@beta` のまま廃止入力を
 *    使い続けると、ある日ワークフローが動かなくなる。
 *
 * 参照: https://github.com/anthropics/claude-code-action/blob/main/docs/migration-guide.md
 *
 * @category 整合性
 * @priority 🔴 critical
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const WORKFLOW_PATH = '.github/workflows/claude.yml'

const raw = readFileSync(path.join(ROOT, WORKFLOW_PATH), 'utf8')

/**
 * YAML コメントを除去する。
 * 「廃止入力を使っていない」検証が、移行の経緯を説明したコメント文言に
 * 誤反応しないようにするため。
 */
const stripComments = (yaml: string): string =>
  yaml
    .split('\n')
    .map((line) => line.replace(/(^|\s)#.*$/, '$1'))
    .join('\n')

const yml = stripComments(raw)

describe('整合性: claude.yml の起動ゲートと claude-code-action v1 仕様', () => {
  it('ジョブ条件で OWNER のみに絞っている（Actions 分数の浪費防止）', () => {
    expect(
      /author_association\s*==\s*'OWNER'/.test(yml),
      `\n${WORKFLOW_PATH} のジョブ条件に OWNER 判定が見つかりません。\n` +
        `これがないと他人の issue / コメントでも runner が立ち、Actions 分数を消費します。\n` +
        `修正方法: jobs.claude.if に author_association == 'OWNER' の判定を追加してください。`
    ).toBe(true)

    expect(
      /github\.event_name\s*==\s*'issues'/.test(yml),
      `\n${WORKFLOW_PATH} のジョブ条件にイベント分岐が見つかりません。\n` +
        `comment と issue を || で繋ぐと「他人のコメント + issue 作成者が OWNER」で通る穴が残ります。\n` +
        `修正方法: github.event_name で issues とコメント系を分岐し、それぞれ\n` +
        `  github.event.issue.author_association / github.event.comment.author_association\n` +
        `を参照してください。`
    ).toBe(true)
  })

  it('anthropics/claude-code-action を @beta で参照していない', () => {
    const refs = raw.match(/anthropics\/claude-code-action@[\w.-]+/g) ?? []

    expect(
      refs.length,
      `\n${WORKFLOW_PATH} に anthropics/claude-code-action の参照が見つかりません。\n` +
        `修正方法: uses: anthropics/claude-code-action@v1 のステップを復元してください。`
    ).toBeGreaterThan(0)

    const beta = refs.filter((ref) => ref.endsWith('@beta'))
    expect(
      beta,
      `\n${WORKFLOW_PATH} が anthropics/claude-code-action を @beta で参照しています。\n` +
        `@beta は v0.x 系で、v1.0 で入力仕様が変わっています。\n` +
        `修正方法: uses: anthropics/claude-code-action@v1 に変更してください。`
    ).toEqual([])
  })

  it('v1 で廃止された入力（allowed_tools / model / direct_prompt / mode）を使っていない', () => {
    // v0.x 入力名 → v1 での代替
    const REMOVED_INPUTS: Record<string, string> = {
      allowed_tools: 'claude_args: --allowedTools',
      model: 'claude_args: --model',
      direct_prompt: 'prompt',
      mode: '（廃止。action が自動判定する）',
    }

    // 行頭のキー名だけを拾う（値や説明文への誤反応を避けるため）
    const declaredKeys = new Set(
      yml
        .split('\n')
        .map((line) => /^\s*([a-zA-Z_-]+):/.exec(line)?.[1])
        .filter((key): key is string => Boolean(key))
    )

    const used = Object.keys(REMOVED_INPUTS).filter((input) => declaredKeys.has(input))

    expect(
      used,
      `\n${WORKFLOW_PATH} が v1 で廃止された入力を使っています: ${used.join(', ')}\n` +
        `修正方法:\n` +
        used.map((input) => `  ${input}: → ${REMOVED_INPUTS[input]}`).join('\n')
    ).toEqual([])
  })

  it('concurrency が定義されている（連投時の多重起動防止）', () => {
    expect(
      /^concurrency:/m.test(yml),
      `\n${WORKFLOW_PATH} に concurrency が定義されていません。\n` +
        `同一 issue / PR への @claude 連投で runner が多重起動し、Actions 分数を浪費します。\n` +
        `修正方法: ワークフロー冒頭に以下を追加してください。\n` +
        `  concurrency:\n` +
        `    group: claude-\${{ github.event.issue.number || github.event.pull_request.number }}\n` +
        `    cancel-in-progress: true`
    ).toBe(true)
  })
})
