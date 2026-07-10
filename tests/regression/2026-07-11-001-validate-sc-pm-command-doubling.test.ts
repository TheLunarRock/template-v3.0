/**
 * Bug ID: 2026-07-11-001
 * Date: 2026-07-11
 * Issue: scripts/validate-sc.js が pmRun を getPackageManagerCommand(pm) で生成していた。
 *        getPackageManagerCommand はコマンド種別（'run' 等）を受け取る設計のため、PM名を
 *        渡すとフォールバックで "pnpm pnpm" のような二重語コマンドを生成する。pnpm では
 *        偶然 exit 0 になるが、npm/yarn 環境では "npm npm ..." となり壊れる。
 * Feature: scripts/validate-sc (pnpm validate)
 * Fixed by: getPackageManagerCommand('run') に修正
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { createRequire } from 'module'

// CJS スクリプトを動的 require で取り込む（consistency/regression テスト共通方針。.js を直接 import しない）。
const require = createRequire(import.meta.url)
const { getPackageManagerCommand } = require('../../scripts/utils.js') as {
  getPackageManagerCommand: (command: string) => string
}

const ROOT = path.resolve(__dirname, '../..')
const validateSrc = readFileSync(path.join(ROOT, 'scripts/validate-sc.js'), 'utf8')

describe('Regression: 2026-07-11-001 - validate-sc の PM コマンド二重語', () => {
  it('getPackageManagerCommand(\'run\') は二重語（"pnpm pnpm" 等）を生成しない', () => {
    const run = getPackageManagerCommand('run')
    expect(run.length).toBeGreaterThan(0)
    // 先頭語が重複する形（"pnpm pnpm" / "npm npm"）でないこと。
    // 正しい 'run' 形（pnpm→"pnpm" / npm→"npm run" / yarn→"yarn"）はいずれもこれに該当しない。
    expect(/^(\S+)\s+\1(\s|$)/.test(run)).toBe(false)
  })

  it('PM名を種別キーとして誤って渡すと二重語になる（バグ原因の記録）', () => {
    // このフォールバック挙動こそが原因。呼び出し側は必ず種別キー（'run' 等）を渡す必要がある。
    expect(getPackageManagerCommand('pnpm')).toMatch(/^\S+ pnpm$/)
  })

  it('validate-sc.js は getPackageManagerCommand(pm) を使わず run 種別を渡す（再発防止）', () => {
    expect(validateSrc).not.toMatch(/getPackageManagerCommand\(pm\)/)
    expect(validateSrc).toMatch(/getPackageManagerCommand\('run'\)/)
  })
})
