/**
 * 整合性テスト: SPECIFICATION.md「2. 技術スタック」の依存バージョン表が
 * package.json と一致する。
 *
 * 実害: 2026-08-30 時点で §2 の 15 行中 14 行が package.json と食い違っていた
 * （Next.js `^15.3.3` に対し実際は `^15.5.24` 等）。ドキュメントは AI への
 * 命令書であり、古いバージョンを真実として参照すると、存在しない API を
 * 前提にした実装や不要なダウングレードを誘発する。
 *
 * 設計方針: `mcp-list.test.ts` の REQUIRED_MCPS と同じく、
 * 「表示名 → package.json のキー」の対応表をテスト内に明示的に持つ。
 * 表の暗黙パースに頼らず、追跡対象を意図的に宣言する。
 *
 * @category 整合性
 * @priority 🔴 critical
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as PackageJson
const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies }

/**
 * SPECIFICATION.md §2 の表に載せている依存と、package.json 上のキーの対応。
 * §2 に行を足したらここにも足す（追跡漏れを防ぐため意図的に手書きで持つ）。
 */
const TRACKED = [
  // 2.1 コアフレームワーク
  { label: 'Next.js', pkg: 'next' },
  { label: 'React', pkg: 'react' },
  { label: 'React DOM', pkg: 'react-dom' },
  { label: 'TypeScript', pkg: 'typescript' },
  // 2.2 スタイリング
  { label: 'Tailwind CSS', pkg: 'tailwindcss' },
  { label: 'PostCSS', pkg: 'postcss' },
  { label: 'Autoprefixer', pkg: 'autoprefixer' },
  // 2.3 状態管理・データ
  { label: 'Zustand', pkg: 'zustand' },
  { label: '@supabase/supabase-js', pkg: '@supabase/supabase-js' },
  // 2.5 テスト
  { label: 'Vitest', pkg: 'vitest' },
  { label: '@testing-library/react', pkg: '@testing-library/react' },
  // 2.6 品質管理
  { label: 'ESLint', pkg: 'eslint' },
  { label: 'Prettier', pkg: 'prettier' },
  { label: 'Husky', pkg: 'husky' },
  { label: 'lint-staged', pkg: 'lint-staged' },
] as const

const SECTION_START = '## 2. 技術スタック'
const SECTION_END = '## 3. ディレクトリ構造'

const spec = readFileSync(path.join(ROOT, 'SPECIFICATION.md'), 'utf8')
const startIndex = spec.indexOf(SECTION_START)
const endIndex = spec.indexOf(SECTION_END)
const section = startIndex >= 0 && endIndex > startIndex ? spec.slice(startIndex, endIndex) : ''

/**
 * §2 の Markdown 表から「表示名 → 記載バージョン」を取り出す。
 * 行は `| ラベル | バージョン | 用途 |` の形。
 */
const documentedVersions = new Map<string, string>()
for (const line of section.split('\n')) {
  if (!line.startsWith('|')) continue
  const cells = line.split('|').map((c) => c.trim())
  // cells[0] は行頭 `|` の左側（空文字）
  if (cells.length < 4) continue
  const [, label, version] = cells
  if (!label || !version || version.startsWith('---')) continue
  documentedVersions.set(label, version)
}

describe('整合性: SPECIFICATION.md §2 の依存バージョンが package.json と一致する', () => {
  it('SPECIFICATION.md に「2. 技術スタック」セクションが存在する', () => {
    expect(
      section.length,
      `\nSPECIFICATION.md に「${SECTION_START}」〜「${SECTION_END}」が見つかりません。\n` +
        `修正方法: 見出しを復元するか、本テストの SECTION_START / SECTION_END を実際の見出しに合わせてください。`
    ).toBeGreaterThan(0)
  })

  it.each(TRACKED)('$label のバージョンが package.json と一致する', ({ label, pkg: key }) => {
    const actual = deps[key]
    expect(
      actual,
      `\npackage.json に "${key}" が見つかりません（SPECIFICATION.md §2 の「${label}」行）。\n` +
        `修正方法:\n` +
        `  1. パッケージを削除したなら SPECIFICATION.md §2 から「${label}」行を消す、または\n` +
        `  2. 本テストの TRACKED から該当エントリを外す`
    ).toBeDefined()

    const documented = documentedVersions.get(label)
    expect(
      documented,
      `\nSPECIFICATION.md §2 に「${label}」の行が見つかりません。\n` +
        `修正方法: §2 の表に「| ${label} | ${actual} | 用途 |」の行を追加してください。`
    ).toBeDefined()

    expect(
      documented,
      `\nSPECIFICATION.md §2 の「${label}」が package.json と食い違っています。\n` +
        `  SPECIFICATION.md: ${documented}\n` +
        `  package.json:     ${actual}\n` +
        `修正方法: SPECIFICATION.md §2 の該当行のバージョンを ${actual} に更新してください。\n` +
        `（package.json が正。ドキュメントを実装に合わせる）`
    ).toBe(actual)
  })
})
