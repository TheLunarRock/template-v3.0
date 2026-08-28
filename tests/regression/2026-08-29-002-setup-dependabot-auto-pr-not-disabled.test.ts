/**
 * Bug ID: 2026-08-29-002
 * Date: 2026-08-29
 * Issue: scripts/setup.js は「Dependabot自動PR作成は意図的に行わない」とコメントしていたが、
 *        実際には有効化しないだけで明示的な無効化をしていなかった。
 *        GitHub 側のデフォルトで automated-security-fixes が有効になるため、
 *        pnpm setup:sc を実行しても Dependabot 自動PRが動き続けていた。
 *        2026-08-29 の調査で 41 リポジトリ中 11 リポジトリで有効を確認。
 *        GitHub Actions 無料枠 2,000分/月のうち約1,600分を Dependabot Updates が消費し、
 *        CI に回せる枠がほとんど残っていなかった。
 * Feature: scripts/setup.js（GitHub側セキュリティ設定）/ コスト保護
 * Fixed by: vulnerability-alerts -X PUT の直後に automated-security-fixes -X DELETE を追加
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')
const setupSrc = readFileSync(path.join(ROOT, 'scripts/setup.js'), 'utf8')

describe('Regression: 2026-08-29-002 - setup.js が Dependabot自動PRを無効化していない', () => {
  it('automated-security-fixes を -X DELETE で明示的に無効化する', () => {
    const hasExplicitDisable =
      /automated-security-fixes[^\n]*-X DELETE|-X DELETE[^\n]*automated-security-fixes/.test(
        setupSrc
      )

    expect(
      hasExplicitDisable,
      [
        'scripts/setup.js に automated-security-fixes の -X DELETE 呼び出しがありません。',
        '',
        'コメントだけでは無効化されない。GitHub デフォルトで有効になるため、',
        '「有効化しない」だけでは Dependabot 自動PR は止まらず、',
        'pnpm setup:sc 実行後も自動PRが動き続けて GitHub Actions 無料枠を消費する。',
        '',
        '対処: vulnerability-alerts -X PUT の直後に以下を追加する。',
        '  gh api repos/${repoInfo}/automated-security-fixes -X DELETE',
      ].join('\n')
    ).toBe(true)
  })

  it('vulnerability-alerts の -X PUT（アラート有効化）は維持されている', () => {
    const hasAlertEnable = /vulnerability-alerts[^\n]*-X PUT/.test(setupSrc)

    expect(
      hasAlertEnable,
      [
        'scripts/setup.js に vulnerability-alerts の -X PUT 呼び出しがありません。',
        '',
        '止めるのは自動PR作成だけで、脆弱性アラート自体は有効のまま維持する必要がある。',
        '（片方だけ消える事故を防ぐためのチェック）',
      ].join('\n')
    ).toBe(true)
  })
})
