/**
 * Bug ID: 2026-08-29-001
 * Date: 2026-08-29
 * Issue: package.json の pnpm.overrides にバージョン範囲を持たないブランケット指定
 *        `"vite": "^6.4.2"` が残っており、devDependencies の `vite: ^6.4.3` と矛盾していた。
 *        pnpm-lock.yaml の importer には生の `^6.4.3` が記録される一方、pnpm は overrides
 *        適用後の `^6.4.2` と突き合わせるため specifier が不一致になる。
 *        通常の `pnpm install` は黙って正規化するが、`--frozen-lockfile` が既定の
 *        CI / Vercel では ERR_PNPM_OUTDATED_LOCKFILE で install ごと落ちる。
 * Feature: package.json (pnpm.overrides) / CI・Vercel デプロイ
 * Fixed by: ブランケット指定 `"vite": "^6.4.2"` を削除（範囲付き `vite@<=6.4.2` は維持）
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  pnpm?: { overrides?: Record<string, string> }
}

/**
 * pnpm の override セレクタから「対象パッケージ名」と「バージョン範囲の有無」を取り出す。
 *
 * セレクタの形式:
 *   - `vite`                        → ブランケット（範囲なし・全 vite を無条件に上書き）
 *   - `vite@<=6.4.2`                → 範囲あり
 *   - `@babel/core@>=7.0.0 <7.29.6` → スコープ付き・範囲あり（先頭の `@` は区切りではない）
 *   - `@babel/core`                 → スコープ付き・ブランケット
 *   - `foo>bar@1.2.3`               → 親>子。対象は子（`bar`）
 */
function parseOverrideSelector(selector: string): { name: string; hasRange: boolean } {
  // スコープ付き（`@scope/name`）は先頭の `@` を範囲区切りと誤認しないよう index 1 以降を探す。
  // 範囲側にも `>` が含まれ得る（例: `@babel/core@>=7.0.0 <7.29.6`）ため、
  // 親 `>` 子の分解より先に名前と範囲を切り分ける。
  const separatorIndex = selector.indexOf('@', selector.startsWith('@') ? 1 : 0)

  const namePart = separatorIndex === -1 ? selector : selector.slice(0, separatorIndex)
  const rangePart = separatorIndex === -1 ? '' : selector.slice(separatorIndex + 1)

  return {
    // 親指定 `parent>child` は最後のセグメントが対象パッケージ
    name: (namePart.split('>').pop() ?? namePart).trim(),
    hasRange: rangePart.trim().length > 0,
  }
}

describe('Regression: 2026-08-29-001 - pnpm.overrides のブランケット指定と直接依存の衝突', () => {
  it('セレクタ解析はスコープ付きパッケージの先頭 @ を範囲区切りと誤認しない', () => {
    expect(parseOverrideSelector('vite')).toEqual({ name: 'vite', hasRange: false })
    expect(parseOverrideSelector('vite@<=6.4.2')).toEqual({ name: 'vite', hasRange: true })
    expect(parseOverrideSelector('@babel/core')).toEqual({ name: '@babel/core', hasRange: false })
    expect(parseOverrideSelector('@babel/core@>=7.0.0 <7.29.6')).toEqual({
      name: '@babel/core',
      hasRange: true,
    })
    expect(parseOverrideSelector('foo>bar@1.2.3')).toEqual({ name: 'bar', hasRange: true })
  })

  it('ブランケット override が dependencies / devDependencies と同名で衝突しない', () => {
    const overrides = pkg.pnpm?.overrides ?? {}
    const directDeps = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ])

    const collisions = Object.keys(overrides)
      .map((selector) => ({ selector, ...parseOverrideSelector(selector) }))
      .filter(({ hasRange }) => !hasRange)
      .filter(({ name }) => directDeps.has(name))
      .map(({ selector, name }) => {
        const declared = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]
        return `  - "${selector}": "${overrides[selector]}" が直接依存 "${name}": "${declared}" と衝突`
      })

    expect(
      collisions,
      [
        'pnpm.overrides のブランケット指定（バージョン範囲なし）が直接依存と同名で存在します。',
        '',
        ...collisions,
        '',
        'このとき pnpm-lock.yaml の importer には package.json の生の specifier が記録される一方、',
        'pnpm は overrides 適用後の値と突き合わせるため lockfile と食い違い、',
        '--frozen-lockfile が既定の CI / Vercel が ERR_PNPM_OUTDATED_LOCKFILE で落ちる',
        '（ローカルの通常 `pnpm install` は黙って正規化するため気付けない）。',
        '',
        '対処: ブランケット指定を削除し、脆弱性排除の意図は範囲付き（例: "vite@<=6.4.2"）で表現する。',
      ].join('\n')
    ).toEqual([])
  })
})
