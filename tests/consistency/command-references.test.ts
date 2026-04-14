/**
 * 整合性テスト: ドキュメント内で参照されている pnpm コマンドが
 * package.json の scripts に実在することを保証する。
 *
 * AI ファースト時代において、ドキュメントは AI への命令書である。
 * 「pnpm sc:foo を実行してください」と書かれた指示が存在しない
 * コマンドだった場合、AI は実行できず、誤った代替手段を選ぶ可能性がある。
 *
 * @category 整合性
 * @priority 🔴 critical
 */
/* eslint-disable security/detect-non-literal-fs-filename */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

interface PackageJson {
  scripts: Record<string, string>
}

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as PackageJson

/**
 * pnpm 標準コマンド・外部ツール（package.json scripts に存在しなくても
 * pnpm 経由で実行可能なもの）。これらは存在チェックの対象外。
 */
const STANDARD_COMMANDS = new Set([
  // pnpm built-in
  'install',
  'add',
  'remove',
  'update',
  'why',
  'audit',
  'create',
  'exec',
  'dlx',
  'run',
  'i',
  'rm',
  'list',
  'outdated',
  'prune',
  // package.json で定義済みの基本コマンド
  'dev',
  'build',
  'start',
  'test',
  'lint',
  'typecheck',
  // pnpm 経由で叩く外部CLI
  'prettier',
  'next',
  'tsc',
  'eslint',
  'vitest',
])

const docs = [
  'CLAUDE.md',
  'SETUP_GUIDE.md',
  'SPECIFICATION.md',
  'README.md',
  'PROJECT_INFO.md',
  'SUPERCLAUDE_FINAL.md',
]

describe('整合性: ドキュメント内の pnpm コマンドが package.json scripts に実在する', () => {
  describe.each(docs)('%s', (doc) => {
    it(`内で参照される全 pnpm コマンドが package.json に定義されている`, () => {
      const content = readFileSync(path.join(ROOT, doc), 'utf8')
      // バックティック内の `pnpm xxx` を抽出（コマンドは英小文字・数字・ハイフン・コロン・アンスコ）
      const refs = [...content.matchAll(/`pnpm ([a-z][a-z0-9:_-]*)`/g)].map((m) => m[1])
      const filtered = refs.filter((cmd) => !STANDARD_COMMANDS.has(cmd))
      const unique = [...new Set(filtered)]
      const missing = unique.filter((cmd) => !(cmd in pkg.scripts))

      if (missing.length > 0) {
        const hint =
          `\n${doc} で参照されている存在しない pnpm コマンド:\n` +
          missing.map((cmd) => `  - pnpm ${cmd}`).join('\n') +
          '\n\n修正方法:\n' +
          '  1. ドキュメントから該当コマンドを削除する、または\n' +
          '  2. package.json の scripts に該当コマンドを追加する'
        expect(missing, hint).toEqual([])
      }
    })
  })
})
