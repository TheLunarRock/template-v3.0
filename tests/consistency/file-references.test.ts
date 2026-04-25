/**
 * 整合性テスト: ドキュメント内で参照されているファイルパスが
 * リポジトリ上に実在することを保証する。
 *
 * AI ファースト時代において、AI はドキュメントに書かれたパスを
 * 真実として扱い、`scripts/old-script.js` のような存在しないファイルを
 * 参照する誤った実装を生成する可能性がある。
 *
 * @category 整合性
 * @priority 🔴 critical
 */
/* eslint-disable security/detect-non-literal-fs-filename, security/detect-non-literal-regexp */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

/**
 * 検査対象ディレクトリのプレフィックス（バックティック内パスの先頭）。
 * 拡張すべき場合はここに追加する。
 */
const PATH_PREFIXES = [
  'scripts',
  'src',
  'tests',
  '.github',
  '.husky',
  '.claude',
  'superclaude',
] as const

/**
 * 例外的に許可するパス（テンプレート用プレースホルダー、未来計画など）。
 * 必要最小限に留める。
 */
const ALLOWED_MISSING = new Set<string>([
  // PR運用モード ON 時のみ pnpm sc:enable-pr が生成する。
  // OFF（テンプレートデフォルト）状態では存在しないが、SPECIFICATION.md §24 で
  // 仕様として記載されているため許可する。
  '.github/workflows/claude-code-review.yml',
  // .gitignore で除外されている個人用設定ファイル。
  // 各ローカル環境で生成されるが git 管理外のため CI では存在しない。
  // CLAUDE.md / SPECIFICATION.md / SETUP_GUIDE.md で仕様として参照されるため許可。
  '.claude/settings.local.json',
])

const docs = ['CLAUDE.md', 'SPECIFICATION.md', 'SETUP_GUIDE.md', 'README.md', 'PROJECT_INFO.md']

describe('整合性: ドキュメント内のファイルパス参照が実在する', () => {
  describe.each(docs)('%s', (doc) => {
    it(`内の全ファイルパス参照が実在する`, () => {
      const content = readFileSync(path.join(ROOT, doc), 'utf8')

      const prefixGroup = PATH_PREFIXES.map((p) => p.replace('.', '\\.')).join('|')
      // バックティック内のパス（拡張子があるもの・ディレクトリ末尾は除外）
      const regex = new RegExp('`((?:' + prefixGroup + ')/[a-zA-Z0-9._/-]+\\.[a-zA-Z]+)`', 'g')
      const refs = [...content.matchAll(regex)].map((m) => m[1])
      const unique = [...new Set(refs)].filter((p) => !ALLOWED_MISSING.has(p))
      const missing = unique.filter((filePath) => !existsSync(path.join(ROOT, filePath)))

      if (missing.length > 0) {
        const hint =
          `\n${doc} で参照されている存在しないファイルパス:\n` +
          missing.map((p) => `  - ${p}`).join('\n') +
          '\n\n修正方法:\n' +
          '  1. ドキュメントから該当パスを削除する、または\n' +
          '  2. 該当ファイルを作成する、または\n' +
          '  3. プレースホルダーの場合は ALLOWED_MISSING に追加する'
        expect(missing, hint).toEqual([])
      }
    })
  })
})
