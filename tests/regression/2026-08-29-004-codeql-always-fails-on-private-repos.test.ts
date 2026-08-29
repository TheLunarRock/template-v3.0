/**
 * Bug ID: 2026-08-29-004
 * Date: 2026-08-29
 * Issue: security.yml の CodeQL ジョブが visibility を問わず実行されていた。
 *        private リポジトリの Code scanning は GitHub Advanced Security（有料）が必須で、
 *        無料プランでは結果をアップロードできず必ず失敗する
 *        （`Code scanning is not enabled for this repository.`）。
 *        にもかかわらず解析自体は完走するため 1 回あたり約 228 秒（private 実測）を消費し、
 *        毎 push で赤い×を出しながらセキュリティ価値はゼロだった。
 *        2026-08 の実測では private の Security 実走 86 回 ≒ 326 分/月を無為に消費し、
 *        無料枠 2,000 分/月の 16% を占めて CI 全停止の一因となっていた。
 * Feature: .github/workflows/security.yml（CI/CD）/ コスト保護
 * Fixed by: codeql ジョブに visibility == 'public' のガードを追加
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')
const workflow = readFileSync(path.join(ROOT, '.github/workflows/security.yml'), 'utf8')
const setupSrc = readFileSync(path.join(ROOT, 'scripts/setup.js'), 'utf8')

/** codeql ジョブのブロック（次のジョブ定義または EOF まで）を切り出す */
function extractCodeqlJob(source: string): string {
  const start = source.indexOf('\n  codeql:')
  if (start === -1) return ''
  const rest = source.slice(start + 1)
  const nextJob = rest.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/)
  return nextJob === -1 ? rest : rest.slice(0, nextJob + 1)
}

const GUARD = /if:\s*github\.event\.repository\.visibility\s*==\s*'public'/

describe('Regression: 2026-08-29-004 - private で必ず失敗する CodeQL が分数を消費する', () => {
  it('security.yml の codeql ジョブが public 限定になっている', () => {
    const job = extractCodeqlJob(workflow)

    expect(job, '.github/workflows/security.yml に codeql ジョブが見つかりません').not.toBe('')
    expect(
      GUARD.test(job),
      [
        'codeql ジョブに visibility ガードがありません。',
        '',
        'private リポジトリの Code scanning は GitHub Advanced Security（有料）が必須で、',
        '無料プランでは `Code scanning is not enabled for this repository.` で必ず失敗する。',
        '解析自体は完走するため 1 回あたり約 228 秒を消費し、価値ゼロで無料枠を削る。',
        '',
        "対処: codeql ジョブに if: github.event.repository.visibility == 'public' を追加する。",
      ].join('\n')
    ).toBe(true)
  })

  it('setup.js が配布する security.yml テンプレートにも同じガードがある', () => {
    const job = extractCodeqlJob(setupSrc)

    expect(
      job,
      'scripts/setup.js の security.yml テンプレートに codeql ジョブが見つかりません'
    ).not.toBe('')
    expect(
      GUARD.test(job),
      [
        'setup.js が配布する security.yml テンプレートに visibility ガードがありません。',
        'クローン先の private リポジトリで同じ無駄が再発する。',
      ].join('\n')
    ).toBe(true)
  })
})
