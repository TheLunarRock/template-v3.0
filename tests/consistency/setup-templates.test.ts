/**
 * 整合性テスト: setup.js 内の埋め込みテンプレートが実ファイルと完全一致することを保証する。
 *
 * 2026-04-13 の作業で、setup.js 内の ci.yml テンプレートが
 * 古いバージョン（pnpm 8 / node 18）のままで実ファイルと乖離していたこと、
 * security.yml の生成ロジック自体が欠落していたことが判明したため、
 * このテストを追加して再発を永続的に防いだ。
 *
 * 2026-09-01 に守備範囲を拡大。ci.yml / security.yml の2本しか見ていなかったため、
 * vitest.config.ts と tests/setup.ts のテンプレートが乖離したまま放置されていた
 * （とくに setupContent は vitest プロジェクトなのに jest.fn() を生成し、
 * 生成されたら jest is not defined で全テストが動かない状態だった）。
 * setup.js が writeFileSync で書き出すもののうち、リポジトリに実ファイルが
 * 存在するテンプレート全てを完全一致で検査する。
 *
 * @category 整合性
 * @priority 🔴 critical
 */
/* eslint-disable security/detect-non-literal-regexp, security/detect-non-literal-fs-filename */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

/**
 * 検査対象: setup.js がテンプレート文字列（template literal）として持ち、
 * そのまま writeFileSync で書き出すもの。
 */
const TEMPLATE_CASES = [
  { variable: 'ciWorkflow', file: '.github/workflows/ci.yml' },
  { variable: 'securityWorkflow', file: '.github/workflows/security.yml' },
  { variable: 'vitestConfig', file: 'vitest.config.ts' },
  { variable: 'setupContent', file: 'tests/setup.ts' },
  { variable: 'claudeDocsReadme', file: 'claudedocs/README.md' },
] as const

/**
 * 検査対象: setup.js がオブジェクトリテラルとして持ち、
 * JSON.stringify(obj, null, 2) の結果を書き出すもの。
 */
const JSON_TEMPLATE_CASES = [
  { variable: 'vscodeSettings', file: '.vscode/settings.json' },
  { variable: 'vscodeExtensions', file: '.vscode/extensions.json' },
] as const

describe('整合性: setup.js の埋め込みテンプレートが実ファイルと完全一致する', () => {
  const setupCode = readFileSync(path.join(ROOT, 'scripts/setup.js'), 'utf8')

  const notFound = (variableName: string, shape: string): Error =>
    new Error(
      `setup.js 内に ${variableName} の定義が見つかりません。` +
        ` この変数名で writeFileSync の直前に${shape}が定義されている必要があります。`
    )

  /**
   * setup.js 内のテンプレート文字列を抽出して評価する。
   * `\${{ secrets.GITHUB_TOKEN }}` のような GitHub Actions 式や
   * エスケープされたバッククォートを含むため、
   * eval で template literal を評価して文字列化する。
   */
  const extractTemplate = (variableName: string): string => {
    const pattern = new RegExp(`const ${variableName} = (\`[\\s\\S]*?\`)\\n\\s+fs\\.writeFileSync`)
    const match = pattern.exec(setupCode)
    if (!match) {
      throw notFound(variableName, 'テンプレート文字列')
    }
    // eslint-disable-next-line no-eval, security/detect-eval-with-expression, sonarjs/code-eval
    return eval(match[1]) as string
  }

  /**
   * setup.js 内のオブジェクトリテラルを抽出し、
   * setup.js と同じ `JSON.stringify(obj, null, 2)` で文字列化する。
   *
   * .vscode/*.json はテンプレート文字列ではなくオブジェクトから生成されるため、
   * extractTemplate（template literal 前提）はそのままでは流用できない。
   */
  const extractJsonTemplate = (variableName: string): string => {
    const pattern = new RegExp(
      `const ${variableName} = (\\{[\\s\\S]*?\\n\\s*\\})\\n\\s+fs\\.writeFileSync`
    )
    const match = pattern.exec(setupCode)
    if (!match) {
      throw notFound(variableName, 'オブジェクトリテラル')
    }
    // eslint-disable-next-line no-eval, security/detect-eval-with-expression, sonarjs/code-eval
    return JSON.stringify(eval(`(${match[1]})`), null, 2)
  }

  const expectExactMatch = (variable: string, file: string, generated: string): void => {
    const actual = readFileSync(path.join(ROOT, file), 'utf8')
    const hint =
      `\nsetup.js の ${variable} テンプレートと ${file} が一致しません。\n` +
      '修正方法:\n' +
      `  1. 実ファイル（${file}）が正: setup.js の ${variable} を実ファイルに合わせる\n` +
      `  2. テンプレートが正: ${file} を更新したうえで pnpm prettier --write ${file}\n` +
      '  ※ 「部分一致」や「キーワード確認」に緩めないこと。乖離を機械的に止めるのが目的。'
    expect(generated, hint).toBe(actual)
  }

  it.each(TEMPLATE_CASES)(
    'テンプレート $variable が $file と完全一致する',
    ({ variable, file }) => {
      expectExactMatch(variable, file, extractTemplate(variable))
    }
  )

  it.each(JSON_TEMPLATE_CASES)(
    'オブジェクト $variable の JSON 出力が $file と完全一致する',
    ({ variable, file }) => {
      expectExactMatch(variable, file, extractJsonTemplate(variable))
    }
  )

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
