/**
 * 整合性テスト: 設定ファイル保護リストが
 * CLAUDE.md と scripts/protect-config.js で一致する。
 *
 * CLAUDE.md には「絶対に変更してはいけない設定ファイル」一覧があり、
 * scripts/protect-config.js が実際にチェックサム検証を行う。
 * 両者がズレると「文書では保護対象だが、実装では保護されていない」
 * という抜け穴が発生する。
 *
 * @category 整合性
 * @priority 🟢 recommended
 */
/* eslint-disable security/detect-non-literal-fs-filename */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

describe('整合性: 設定ファイル保護リストが CLAUDE.md と protect-config.js で一致する', () => {
  /**
   * scripts/protect-config.js から PROTECTED_FILES 配列を抽出する。
   */
  const extractProtectedFilesFromScript = (): string[] => {
    const code = readFileSync(path.join(ROOT, 'scripts/protect-config.js'), 'utf8')
    const arrayMatch = /const PROTECTED_FILES\s*=\s*\[([\s\S]*?)\]/.exec(code)
    if (!arrayMatch) {
      throw new Error('scripts/protect-config.js 内に PROTECTED_FILES 配列が見つかりません')
    }
    return [...arrayMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  }

  /**
   * CLAUDE.md の「絶対に変更してはいけない設定ファイル」表から
   * ファイル名（**fileName** 形式）を抽出する。
   */
  const extractProtectedFilesFromClaudeMd = (): string[] => {
    const md = readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8')
    // 「絶対に変更してはいけない設定ファイル」セクションを抽出
    const sectionMatch = /## ⛔ 絶対に変更してはいけない設定ファイル[\s\S]*?(?=\n## )/.exec(md)
    if (!sectionMatch) {
      throw new Error(
        'CLAUDE.md に「絶対に変更してはいけない設定ファイル」セクションが見つかりません'
      )
    }
    const section = sectionMatch[0]
    // **fileName.ext** 形式を抽出
    return [...section.matchAll(/\*\*([a-zA-Z][a-zA-Z0-9._-]*\.[a-zA-Z]+)\*\*/g)].map((m) => m[1])
  }

  it('protect-config.js の PROTECTED_FILES が全て実在する', () => {
    const protectedFiles = extractProtectedFilesFromScript()
    const missing = protectedFiles.filter((f) => !existsSync(path.join(ROOT, f)))

    if (missing.length > 0) {
      const hint =
        `\nscripts/protect-config.js が存在しないファイルを保護対象にしています:\n` +
        missing.map((f) => `  - ${f}`).join('\n') +
        '\n\n修正方法:\n' +
        '  1. 該当ファイル名が変更されている可能性があります（例: .eslintrc.json → eslint.config.mjs）\n' +
        '  2. PROTECTED_FILES 配列を実ファイル名に合わせて更新してください'
      expect(missing, hint).toEqual([])
    }
  })

  it('CLAUDE.md の保護対象表に記載されたファイルが全て実在する', () => {
    const documented = extractProtectedFilesFromClaudeMd()
    const missing = documented.filter((f) => !existsSync(path.join(ROOT, f)))

    if (missing.length > 0) {
      const hint =
        `\nCLAUDE.md に存在しないファイル名が記載されています:\n` +
        missing.map((f) => `  - ${f}`).join('\n') +
        '\n\n修正方法: 表のファイル名を実ファイル名に合わせて更新してください'
      expect(missing, hint).toEqual([])
    }
  })

  it('CLAUDE.md と protect-config.js の保護リストが一致する', () => {
    const localeSort = (a: string, b: string) => a.localeCompare(b)
    const fromScript = extractProtectedFilesFromScript().sort(localeSort)
    const fromDoc = extractProtectedFilesFromClaudeMd().sort(localeSort)

    const onlyInScript = fromScript.filter((f) => !fromDoc.includes(f))
    const onlyInDoc = fromDoc.filter((f) => !fromScript.includes(f))

    if (onlyInScript.length > 0 || onlyInDoc.length > 0) {
      const newline = '\n'
      const onlyInScriptList = onlyInScript.map((f) => `    - ${f}`).join(newline)
      const onlyInDocList = onlyInDoc.map((f) => `    - ${f}`).join(newline)
      const hint =
        '\n保護リストが CLAUDE.md と scripts/protect-config.js で不整合です\n' +
        (onlyInScript.length > 0
          ? `\n  scripts/protect-config.js のみに存在:\n${onlyInScriptList}\n`
          : '') +
        (onlyInDoc.length > 0 ? `\n  CLAUDE.md のみに存在:\n${onlyInDocList}\n` : '') +
        '\n修正方法: 両方を実態に合わせて統一してください'
      expect({ onlyInScript, onlyInDoc }, hint).toEqual({
        onlyInScript: [],
        onlyInDoc: [],
      })
    }
  })
})
