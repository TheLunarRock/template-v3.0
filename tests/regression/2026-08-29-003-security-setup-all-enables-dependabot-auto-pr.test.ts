/**
 * Bug ID: 2026-08-29-003
 * Date: 2026-08-29
 * Issue: scripts/security-setup-all.sh（pnpm security:setup-all）が全リポジトリに対して
 *        dependabot_security_updates: enabled を能動的に設定していた。
 *        CLAUDE.md / SPECIFICATION.md の「Dependabot auto-PR OFF は維持」と正面から矛盾し、
 *        2026-08-29-002 で setup.js を修正しても、このコマンドを一度実行すれば
 *        全41リポジトリで自動PRが復活する状態だった。
 *        自動PRは 2026-08 に GitHub Actions 無料枠 2,000分/月のうち約1,600分を消費し、
 *        8月下旬の private リポジトリ CI 全停止（無料枠枯渇）の主因となっていた。
 * Feature: scripts/security-setup-all.sh（全リポジトリ一括セキュリティ設定）/ コスト保護
 * Fixed by: PATCH から dependabot_security_updates を削除し、明示的な DELETE に置き換え
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')
const scriptSrc = readFileSync(path.join(ROOT, 'scripts/security-setup-all.sh'), 'utf8')

describe('Regression: 2026-08-29-003 - security-setup-all.sh が Dependabot自動PRを有効化する', () => {
  it('dependabot_security_updates を enabled にしない', () => {
    const enablesAutoPr = /"dependabot_security_updates"\s*:\s*\{\s*"status"\s*:\s*"enabled"/.test(
      scriptSrc
    )

    expect(
      enablesAutoPr,
      [
        'scripts/security-setup-all.sh が dependabot_security_updates を enabled にしています。',
        '',
        'これは CLAUDE.md / SPECIFICATION.md §15.5.3 の「Dependabot auto-PR OFF は維持」と矛盾し、',
        'pnpm security:setup-all を実行するだけで全リポジトリの自動PRが復活する。',
        '2026-08 は自動PRが無料枠 2,000分/月のうち約1,600分を消費し、private の CI が全停止した。',
        '',
        '対処: PATCH から当該キーを削除し、automated-security-fixes -X DELETE に置き換える。',
      ].join('\n')
    ).toBe(false)
  })

  it('automated-security-fixes を -X DELETE で明示的に無効化する', () => {
    const hasExplicitDisable =
      /automated-security-fixes[^\n]*-X DELETE|-X DELETE[^\n]*automated-security-fixes/.test(
        scriptSrc
      )

    expect(
      hasExplicitDisable,
      [
        'scripts/security-setup-all.sh に automated-security-fixes の -X DELETE がありません。',
        '',
        '「有効化しない」だけでは止まらない（GitHub デフォルトで有効になる）。',
        'scripts/setup.js と同じく明示的な DELETE が必要。',
      ].join('\n')
    ).toBe(true)
  })

  it('vulnerability-alerts の -X PUT（アラート有効化）は維持されている', () => {
    expect(
      /vulnerability-alerts[^\n]*-X PUT/.test(scriptSrc),
      '止めるのは自動PR作成だけで、脆弱性アラート自体は有効のまま維持する必要がある。'
    ).toBe(true)
  })

  it('画面表示が「自動修正を有効化する」と案内していない', () => {
    const misleading = /Dependabot自動修正（修正PRの?自動?作成）/.test(scriptSrc)

    expect(
      misleading,
      [
        'scripts/security-setup-all.sh の案内文が「Dependabot自動修正（修正PR作成）」を',
        '適用対象として表示しています。実装は無効化するため、表示と実装が矛盾する。',
      ].join('\n')
    ).toBe(false)
  })
})
