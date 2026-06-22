/**
 * Bug ID: 2026-06-22-001
 * Date: 2026-06-22
 * Issue: `pnpm sc:start`（scripts/git-safety-check.js）が PR運用OFF（個人開発）でも
 *        main を無条件で保護ブランチ扱いし exit 1 していた。CLAUDE.md の
 *        「PR運用OFF時は main に直接 commit & push」という運用ルールと矛盾し、
 *        OFFモードの正規フロー上で sc:start が必ず失敗していた。
 * Feature: scripts/git-safety-check (sc:start)
 * Fixed by: isProtectedBranch(branch, prMode) を PR_MODE 準拠化（OFF時は保護しない）＋
 *           getPrMode() で CLAUDE.md の PR_MODE_FLAG を読み取り
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

// CJS スクリプトを動的 require で取り込む（tsc の宣言解決を避ける・consistency テストと同様に .js を直接扱わない方針）。
// require の戻り値は any のため、利用する関数の型を明示して unsafe 参照を避ける。
const require = createRequire(import.meta.url)
const { isProtectedBranch, getPrMode } = require('../../scripts/git-safety-check.js') as {
  isProtectedBranch: (branch: string, prMode?: string) => boolean
  getPrMode: () => string
}

describe('Regression: 2026-06-22-001 - sc:start が OFF モードで main をブロックしない', () => {
  it('PR運用OFF では main / master を保護ブランチ扱いしない（main 直作業を許可）', () => {
    expect(isProtectedBranch('main', 'OFF')).toBe(false)
    expect(isProtectedBranch('master', 'OFF')).toBe(false)
  })

  it('PR運用ON では main/master/develop/production を保護する', () => {
    expect(isProtectedBranch('main', 'ON')).toBe(true)
    expect(isProtectedBranch('master', 'ON')).toBe(true)
    expect(isProtectedBranch('develop', 'ON')).toBe(true)
    expect(isProtectedBranch('production', 'ON')).toBe(true)
  })

  it('feature ブランチはどちらのモードでも安全', () => {
    expect(isProtectedBranch('feature/auth', 'ON')).toBe(false)
    expect(isProtectedBranch('feature/auth', 'OFF')).toBe(false)
  })

  it('prMode 省略時は後方互換で ON 扱い（既存挙動を破壊しない）', () => {
    expect(isProtectedBranch('main')).toBe(true)
  })

  it('getPrMode() は CLAUDE.md から ON/OFF のいずれかを読み取る', () => {
    expect(['ON', 'OFF']).toContain(getPrMode())
  })
})
