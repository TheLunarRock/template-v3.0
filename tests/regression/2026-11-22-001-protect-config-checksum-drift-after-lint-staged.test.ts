/**
 * Bug ID: 2026-11-22-001
 * Date: 2026-11-22
 * Issue: `node scripts/protect-config.js --update` が記録するチェックサムは
 *        「整形される前」の保護対象ファイルのものだった。pre-commit は
 *        protect-config.js の検査のあとに lint-staged（prettier --write /
 *        eslint --fix）を実行するため、同じコミットの中で保護対象ファイルが
 *        整形し直されると、記録されたチェックサムとコミットされた中身がずれる。
 *        2415758 では next build が複数行に展開した tsconfig.json を prettier が
 *        1行に戻し、次のコミット（とクローン後の最初のコミット）が必ず
 *        pre-commit で止まる状態になった。CI はこの検査を実行しないため、push
 *        しても気付けなかった。
 * Feature: scripts/protect-config.js（--update / --init）
 * Fixed by: --update / --init が、チェックサムを取る前に、.lintstagedrc.json と
 *           同じ規則（対象のグロブとコマンド）で保護対象ファイルを整形する。
 *
 * このテストは pnpm test:unit に含まれ、pre-commit と CI の両方で走る。
 * 保護対象の一覧は protect-config.js の PROTECTED_FILES から読み、書き写さない。
 *
 * @category 回帰
 * @priority 🔴 critical
 */
/* eslint-disable security/detect-non-literal-fs-filename */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { createHash } from 'crypto'
import { spawnSync } from 'child_process'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

const extractProtectedFiles = (): string[] => {
  const code = readFileSync(path.join(ROOT, 'scripts/protect-config.js'), 'utf8')
  const arrayMatch = /const PROTECTED_FILES\s*=\s*\[([\s\S]*?)\]/.exec(code)
  if (!arrayMatch) {
    throw new Error('scripts/protect-config.js 内に PROTECTED_FILES 配列が見つかりません')
  }
  return [...arrayMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

const PROTECTED_FILES = extractProtectedFiles()
const savedChecksums = JSON.parse(
  readFileSync(path.join(ROOT, 'scripts/.config-checksums.json'), 'utf8')
) as Record<string, string>

const sha256 = (file: string): string =>
  createHash('sha256')
    .update(readFileSync(path.join(ROOT, file), 'utf8'))
    .digest('hex')

/** lint-staged と同じ照合（パターンに / が無ければファイル名だけで照合する） */
const lintStagedConfig = JSON.parse(
  readFileSync(path.join(ROOT, '.lintstagedrc.json'), 'utf8')
) as Record<string, string[]>
const isFormattedByPrettierOnCommit = (file: string): boolean =>
  Object.entries(lintStagedConfig).some(
    ([pattern, commands]) =>
      path.matchesGlob(pattern.includes('/') ? file : path.basename(file), pattern) &&
      commands.some((command) => command.startsWith('prettier --write'))
  )

describe('Regression: 2026-11-22-001 - 保護対象のチェックサムがコミット時の整形でずれる', () => {
  it('PROTECTED_FILES が抽出できる（検査が空振りしない）', () => {
    expect(PROTECTED_FILES.length).toBeGreaterThan(0)
  })

  it.each(PROTECTED_FILES)('%s の記録済みチェックサムが現在の内容と一致する', (file) => {
    expect(existsSync(path.join(ROOT, file)), `${file} が存在しません`).toBe(true)
    expect(
      savedChecksums[file],
      `\nscripts/.config-checksums.json に ${file} のチェックサムがありません。\n` +
        `修正方法: 持ち主が node scripts/protect-config.js --update を実行してください。`
    ).toBeDefined()
    expect(
      sha256(file),
      `\n${file} の内容が scripts/.config-checksums.json の記録と一致しません。\n` +
        `このままでは次のコミットが pre-commit の保護チェックで止まります。\n` +
        `よくある原因: --update のあと、コミット時の lint-staged が保護対象ファイルを整形し直した。\n` +
        `修正方法: 変更が正当なら、持ち主が node scripts/protect-config.js --update を実行してください\n` +
        `（--update はコミット時と同じ整形をしてからチェックサムを記録します）。`
    ).toBe(savedChecksums[file])
  })

  it('lint-staged が prettier をかける保護対象ファイルは、既に整形済みである（コミット時に中身が変わらない）', () => {
    const targets = PROTECTED_FILES.filter(isFormattedByPrettierOnCommit)
    expect(targets.length, 'prettier の対象になる保護対象ファイルが見つかりません').toBeGreaterThan(
      0
    )

    const result = spawnSync(
      path.join(ROOT, 'node_modules/.bin/prettier'),
      ['--check', ...targets],
      {
        cwd: ROOT,
        encoding: 'utf8',
      }
    )

    expect(
      result.status,
      `\nコミット時に lint-staged が整形し直す保護対象ファイルがあります。\n` +
        `${result.stdout}${result.stderr}\n` +
        `記録済みのチェックサムとコミットされる中身がずれる原因になります。\n` +
        `修正方法: 持ち主が node scripts/protect-config.js --update を実行してください。`
    ).toBe(0)
  })
})
