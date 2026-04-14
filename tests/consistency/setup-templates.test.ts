/**
 * 整合性テスト: setup.js 内のワークフローテンプレートが
 * .github/workflows/ 配下の実ファイルと完全一致することを保証する。
 *
 * 本日（2026-04-13）の作業で、setup.js 内の ci.yml テンプレートが
 * 古いバージョン（pnpm 8 / node 18）のままで実ファイルと乖離していたこと、
 * security.yml の生成ロジック自体が欠落していたことが判明したため、
 * このテストを追加して再発を永続的に防ぐ。
 *
 * @category 整合性
 * @priority 🔴 critical
 */
/* eslint-disable security/detect-non-literal-regexp */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

describe('整合性: setup.js のワークフローテンプレートが実ファイルと完全一致する', () => {
  const setupCode = readFileSync(path.join(ROOT, 'scripts/setup.js'), 'utf8')

  /**
   * setup.js 内のテンプレート文字列を抽出して評価する。
   * `\${{ secrets.GITHUB_TOKEN }}` のような GitHub Actions 式を含むため、
   * eval で template literal を評価して文字列化する。
   */
  const extractTemplate = (variableName: string): string => {
    const pattern = new RegExp(`const ${variableName} = (\`[\\s\\S]*?\`)\\n\\s+fs\\.writeFileSync`)
    const match = pattern.exec(setupCode)
    if (!match) {
      throw new Error(
        `setup.js 内に ${variableName} のテンプレート定義が見つかりません。` +
          ` この変数名で writeFileSync の直前にテンプレート文字列が定義されている必要があります。`
      )
    }
    // eslint-disable-next-line no-eval, security/detect-eval-with-expression, sonarjs/code-eval
    return eval(match[1]) as string
  }

  it('ci.yml テンプレートが .github/workflows/ci.yml と完全一致する', () => {
    const generated = extractTemplate('ciWorkflow')
    const actual = readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8')

    if (generated !== actual) {
      const hint =
        '\n修正方法:\n' +
        '  1. setup.js の ciWorkflow テンプレートと .github/workflows/ci.yml を一致させてください\n' +
        '  2. 実ファイルが正しい場合: setup.js の該当箇所を更新\n' +
        '  3. テンプレートが正しい場合: pnpm prettier --write .github/workflows/ci.yml'
      expect(generated, hint).toBe(actual)
    }
  })

  it('security.yml テンプレートが .github/workflows/security.yml と完全一致する', () => {
    const generated = extractTemplate('securityWorkflow')
    const actual = readFileSync(path.join(ROOT, '.github/workflows/security.yml'), 'utf8')

    if (generated !== actual) {
      const hint =
        '\n修正方法:\n' +
        '  1. setup.js の securityWorkflow テンプレートと .github/workflows/security.yml を一致させてください\n' +
        '  2. 実ファイルが正しい場合: setup.js の該当箇所を更新\n' +
        '  3. テンプレートが正しい場合: pnpm prettier --write .github/workflows/security.yml'
      expect(generated, hint).toBe(actual)
    }
  })

  it('setup.js の Step 4 が ci.yml と security.yml の両方を生成する', () => {
    expect(setupCode, 'setup.js に ciWorkflow テンプレートが定義されていません').toContain(
      'const ciWorkflow = '
    )
    expect(
      setupCode,
      'setup.js に securityWorkflow テンプレートが定義されていません（第9層防御の整合性が崩れています）'
    ).toContain('const securityWorkflow = ')
  })
})
