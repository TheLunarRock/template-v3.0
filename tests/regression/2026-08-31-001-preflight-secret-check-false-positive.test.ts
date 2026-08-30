/**
 * Bug ID: 2026-08-31-001
 * Date: 2026-08-31
 * Issue: scripts/preflight.js のシークレット漏洩チェックが「キーワードがファイルに
 *        出現したか」だけを見ていたため、値のハードコードが無くても error になっていた。
 *        実際に main の CI（ビルドチェック > Preflightチェック）が
 *        「潜在的なシークレット露出: SECRET が検出されました」で赤くなり、
 *        原因は src/utils/error-handling/user-friendly.ts の定数名
 *        （SECRET_ASSIGNMENT_PATTERN / JSON_SECRET_PATTERN）だった。
 *        シークレットを伏せるためのコードがシークレット検査に誤検知される構図で、
 *        2026-08-30-002（検査器がコメントを本物のコードと誤認）と同型。
 * Feature: scripts/preflight.js（pnpm preflight）
 * Fixed by: キーワードの出現ではなく「機密っぽい名前への文字列リテラル代入」を
 *           行単位で検出する方式に変更。process.env からの読み出しとプレースホルダは除外。
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

interface SecretFinding {
  lineNumber: number
  name: string
  masked: string
}

const preflight = require('../../scripts/preflight.js') as {
  findHardcodedSecrets: (content: string) => SecretFinding[]
}

const namesOf = (findings: SecretFinding[]): string[] => findings.map((f) => f.name)

describe('Regression: 2026-08-31-001 - preflight のシークレット検査が識別子に誤反応する', () => {
  it('定数名だけの出現は検出しない（値のハードコードではない）', () => {
    const content = [
      'const SECRET_ASSIGNMENT_PATTERN =',
      '  /([\\w-]*(?:password|token|secret|api[_-]?key)[\\w-]*)\\s*[=:]\\s*[\'"]?[^\'"\\s]+[\'"]?/gi',
      '',
      'const JSON_SECRET_PATTERN =',
      '  /("[\\w-]*(?:password|token|secret)[\\w-]*"\\s*:\\s*)("[^"]*"|[^,}\\s]+)/gi',
      '',
    ].join('\n')

    expect(
      namesOf(preflight.findHardcodedSecrets(content)),
      [
        '定数名の出現だけで検出されています（誤検知）。',
        'シークレットを伏せるためのコードが検査に引っかかり、CI が赤になります。',
        '修正方法: キーワードの出現ではなく、文字列リテラルの代入を検出してください。',
      ].join('\n')
    ).toEqual([])
  })

  it('リテラル値の代入は検出する', () => {
    // gitleaks（第2層防御）が本物のキーと誤認しないよう、低エントロピーの値を使う。
    // 検出条件は「機密っぽい名前 + 8文字以上の空白なし ASCII 文字列」なのでこれで足りる。
    const findings = preflight.findHardcodedSecrets("const API_KEY = 'abcabcabcabcabc'\n")

    expect(findings.length, '本物のハードコードを見落としています').toBeGreaterThan(0)
    expect(findings[0].name).toBe('API_KEY')
    expect(findings[0].lineNumber).toBe(1)
  })

  it('検出結果に値そのものを含めない（CI ログへ流出させない）', () => {
    const findings = preflight.findHardcodedSecrets("const password = 'hunter2-real-value'\n")

    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0].masked, 'ログに出す行から値が伏せられていること').not.toContain(
      'hunter2-real-value'
    )
    expect(findings[0].masked).toContain('***')
  })

  it('process.env からの読み出しは検出しない', () => {
    const content = [
      'const token = process.env.API_TOKEN',
      'const apiKey = process.env.NEXT_PUBLIC_API_KEY ?? ""',
      'const secret = process.env.CLIENT_SECRET',
    ].join('\n')

    expect(namesOf(preflight.findHardcodedSecrets(content))).toEqual([])
  })

  it('空文字とプレースホルダは検出しない', () => {
    const content = [
      "const API_KEY = ''",
      "const clientSecret = 'your-api-key-here'",
      "const password = 'changeme'",
    ].join('\n')

    expect(
      namesOf(preflight.findHardcodedSecrets(content)),
      '空文字やプレースホルダで CI を止めない（実害が無く、開発の邪魔になるため）'
    ).toEqual([])
  })

  it('日本語のユーザー向け文言は検出しない（実際に出た誤検知）', () => {
    // src/utils/error-handling/supabase.ts の SUPABASE_USER_MESSAGES と同じ形。
    // 名前に credentials を含むが、値は資格情報ではなく画面表示用の文言。
    const content = [
      'const SUPABASE_USER_MESSAGES = {',
      "  ERR_INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません。',",
      '}',
    ].join('\n')

    expect(namesOf(preflight.findHardcodedSecrets(content))).toEqual([])
  })

  it('機密と無関係な名前への代入は検出しない', () => {
    const content = ["const appName = 'template-v3.0'", "const locale = 'ja'"].join('\n')

    expect(namesOf(preflight.findHardcodedSecrets(content))).toEqual([])
  })

  it('コメント内の例は検出しない', () => {
    const content = [
      "// 例: const API_KEY = 'sk-proj-xxxx' はハードコード禁止",
      ' * password: "..."',
    ].join('\n')

    expect(namesOf(preflight.findHardcodedSecrets(content))).toEqual([])
  })
})
