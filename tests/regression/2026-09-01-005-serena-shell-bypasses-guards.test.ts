/**
 * Bug ID: 2026-09-01-005
 * Date: 2026-09-01
 * Issue: permissions.allow に mcp__serena__execute_shell_command が含まれており、
 *        一方 PreToolUse のガードフック（git-push-guard / dev-server-guard /
 *        blocking-op-guard）の matcher は "Bash" だけだった。そのため serena の
 *        シェル経由なら pnpm dev（開発サーバー起動禁止）・
 *        git push --force origin main（deny にも ask にも載っている）・
 *        npx playwright（ブラウザ自動操作禁止）が、警告もブロックも無く通った。
 *        deny ルールも Bash(...) 形式なので効かない。3層で守っているつもりの
 *        ものが allow の 1 エントリで迂回できる状態だった。
 * Feature: .claude/settings.json（permissions と PreToolUse フック登録）
 * Fixed by: serena のシェル実行を allow から外して deny へ移し、ガードフックの
 *           matcher を "Bash|mcp__.*__execute_shell_command" に広げた。
 *           あわせて allow からワークフローと矛盾する項目・使わない危険な項目
 *           （git push / curl / npx / rm）を落とし、rm -rf / rm -r を ask に追加した。
 *
 * 設計上の前提: コマンド名を allow に並べる方式は、任意コード実行
 * （node -e / sed -i / bash -c）を許した時点で実行内容の境界にならない。
 * 実効的に効いているのは内容を検査して確定ブロックするガードフックであり、
 * allow の役割は「毎回聞かれる煩わしさを減らすこと」に過ぎない。
 * そのため Bash(node:*) は意図的に allow へ残している（外しても bash -c で
 * 同じことができ、プロンプトが増えるだけで防御は増えない）。
 *
 * @category 回帰
 * @priority 🔴 critical
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

interface HookEntry {
  matcher?: string
  hooks?: { type?: string; command?: string }[]
}

const settings = JSON.parse(readFileSync(path.join(ROOT, '.claude/settings.json'), 'utf8')) as {
  permissions?: { allow?: string[]; deny?: string[]; ask?: string[] }
  hooks?: Record<string, HookEntry[]>
}

const allow = settings.permissions?.allow ?? []
const deny = settings.permissions?.deny ?? []
const ask = settings.permissions?.ask ?? []

const SERENA_SHELL = 'mcp__serena__execute_shell_command'

/** ガードフックの matcher に入れる、シェル実行系 MCP を受けるパターン */
const SHELL_MCP_PATTERN = 'mcp__.*__execute_shell_command'

/** ガードフック名 → それを登録している PreToolUse エントリの matcher 一覧 */
function matchersFor(hookName: string): string[] {
  return (settings.hooks?.PreToolUse ?? [])
    .filter((e) => (e.hooks ?? []).some((h) => (h.command ?? '').includes(hookName)))
    .map((e) => e.matcher ?? '')
}

describe('Regression: 2026-09-01-005 - serena のシェル実行がガードを迂回する', () => {
  it('matcher 用パターンが serena のシェル実行ツール名に一致する', () => {
    // SHELL_MCP_PATTERN が実際に目的のツール名を捕まえることの確認。
    // リテラル正規表現で書き、設定由来の文字列は RegExp に渡さない。
    expect(/^mcp__.*__execute_shell_command$/.test(SERENA_SHELL)).toBe(true)
    expect(/^mcp__.*__execute_shell_command$/.test('mcp__serena__find_symbol')).toBe(false)
  })

  it('serena のシェル実行は allow に無い', () => {
    expect(allow).not.toContain(SERENA_SHELL)
  })

  it('serena のシェル実行は deny にある', () => {
    expect(deny).toContain(SERENA_SHELL)
  })

  // 2 で deny したので現状は到達しないが、将来別の MCP が同種のツールを
  // 持ち込んだときの保険として matcher 側でも受ける（多層防御）。
  it.each(['git-push-guard', 'dev-server-guard', 'blocking-op-guard'])(
    '%s の matcher が Bash 以外のシェル実行系ツールにも一致する',
    (hookName) => {
      const matchers = matchersFor(hookName)
      expect(matchers.length).toBeGreaterThan(0)

      // matcher は "A|B" 形式。選択肢単位で見る
      // （設定由来の文字列を RegExp に流し込まないため）
      const alternatives = matchers.flatMap((m) => m.split('|'))

      expect(alternatives).toContain(SHELL_MCP_PATTERN)
      // Bash への反応を失っていないこと（広げただけで狭めていない）
      expect(alternatives).toContain('Bash')
    }
  )

  it.each(['Bash(git push:*)', 'Bash(curl:*)', 'Bash(npx:*)', 'Bash(rm:*)'])(
    'ワークフローと矛盾する／使わない危険な項目は allow に無い: %s',
    (entry) => {
      expect(allow).not.toContain(entry)
    }
  )

  // 「危険だから」と将来消されるのを防ぐための明示。外しても bash -c で
  // 同じことができ、プロンプトが増えるだけで防御は増えない。
  it('Bash(node:*) は意図的に allow へ残している', () => {
    expect(allow).toContain('Bash(node:*)')
  })

  it.each(['Bash(rm -rf:*)', 'Bash(rm -r:*)'])('再帰削除は ask にある: %s', (entry) => {
    expect(ask).toContain(entry)
  })

  // 検査を弱めていないことの確認（追加のみ・削除なし）
  it('既存の deny 24件・ask 16件が減っていない', () => {
    expect(deny.length).toBeGreaterThanOrEqual(24)
    expect(ask.length).toBeGreaterThanOrEqual(16)
  })

  it('serena のシェル実行以外の機能は allow に残っている', () => {
    const kept = allow.filter((a) => a.startsWith('mcp__serena__') && a !== SERENA_SHELL)

    expect(kept).toContain('mcp__serena__find_symbol')
    expect(kept).toContain('mcp__serena__replace_symbol_body')
    expect(kept.length).toBeGreaterThanOrEqual(20)
  })
})
