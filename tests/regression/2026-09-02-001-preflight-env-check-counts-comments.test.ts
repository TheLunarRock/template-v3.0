/**
 * Bug ID: 2026-09-02-001
 * Date: 2026-09-02
 * Issue: preflight の環境変数チェックが、コメントアウトされた行を「設定済み」と
 *        誤判定していた。
 *
 *          .env.local:
 *            # NEXT_PUBLIC_APP_NAME=foo
 *
 *          pnpm preflight
 *          → ✓ NEXT_PUBLIC_APP_NAME ✓ (.env.local)
 *
 *        判定が envContent.includes(`${envVar}=`) という単純な部分一致だったため、
 *        コメント行・空の値・末尾一致する別キーのいずれにも反応していた。
 *        つまり環境変数チェックが「その文字列がファイルのどこかにあるか」しか
 *        見ておらず、チェックとして機能していなかった。
 * Feature: scripts/preflight.js（pnpm preflight の環境変数チェック）
 * Fixed by: 判定を isEnvVarConfigured() に切り出し、行単位で解析する。
 *           env ファイルの # はコメントなので、JS 用の stripComments は使わない
 *           （`#` を扱えないうえ、文字列リテラル保護など不要な処理が入るため）。
 *
 * @category 回帰
 * @priority 🟡 important
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const preflight = require('../../scripts/preflight.js') as {
  isEnvVarConfigured: (envContent: string, envVar: string) => boolean
}

const KEY = 'NEXT_PUBLIC_APP_NAME'

describe('Regression: 2026-09-02-001 - コメント行を環境変数の設定済みと誤判定する', () => {
  it('コメント行だけの env は「未設定」と判定される', () => {
    expect(preflight.isEnvVarConfigured(`# ${KEY}=foo\n`, KEY)).toBe(false)
  })

  it('行頭に空白があるコメント行も「未設定」と判定される', () => {
    expect(preflight.isEnvVarConfigured(`  # ${KEY}=foo\n`, KEY)).toBe(false)
    expect(preflight.isEnvVarConfigured(`\t#${KEY}=foo\n`, KEY)).toBe(false)
  })

  it('値が設定されていれば「設定済み」と判定される（退行確認）', () => {
    expect(preflight.isEnvVarConfigured(`${KEY}=template-v3.0\n`, KEY)).toBe(true)
  })

  it('値が空（KEY=）は「未設定」と判定される', () => {
    expect(preflight.isEnvVarConfigured(`${KEY}=\n`, KEY)).toBe(false)
    expect(preflight.isEnvVarConfigured(`${KEY}=   \n`, KEY)).toBe(false)
  })

  it('コメント行と実設定が混在していれば「設定済み」と判定される', () => {
    const content = ['# 環境変数', `# ${KEY}=commented-out`, '', `${KEY}=real-value`, ''].join('\n')
    expect(preflight.isEnvVarConfigured(content, KEY)).toBe(true)
  })

  it('末尾が一致するだけの別キーは「設定済み」と判定されない', () => {
    expect(preflight.isEnvVarConfigured(`MY_${KEY}=x\n`, KEY)).toBe(false)
  })

  it('キー前後に空白があっても設定済みと判定される', () => {
    expect(preflight.isEnvVarConfigured(`  ${KEY} = value\n`, KEY)).toBe(true)
  })

  it('= を含まない行は無視される', () => {
    expect(preflight.isEnvVarConfigured(`${KEY}\n`, KEY)).toBe(false)
  })

  it('CI が使う .env.ci の内容は「設定済み」と判定される', () => {
    const envCi = ['# CI/CD環境用の環境変数', `${KEY}=template-v3.0-ci`, 'NODE_ENV=test', ''].join(
      '\n'
    )
    expect(preflight.isEnvVarConfigured(envCi, KEY)).toBe(true)
  })
})
