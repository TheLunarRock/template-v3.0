/**
 * 整合性テスト: バージョン番号がファイル間で一致する。
 *
 * 例: package.json の engines.node が更新されたら、
 *     SETUP_GUIDE.md の前提条件もそれに追従する必要がある。
 *     片方だけ更新されると、AI は古い情報に基づいて誤った案内を出す。
 *
 * @category 整合性
 * @priority 🟡 important
 */
/* eslint-disable sonarjs/slow-regex, security/detect-non-literal-fs-filename */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

interface PackageJson {
  engines: { node: string }
  packageManager: string
}

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as PackageJson

describe('整合性: バージョン番号がファイル間で一致する', () => {
  it('package.json engines.node が SETUP_GUIDE.md に記載されている', () => {
    const guide = readFileSync(path.join(ROOT, 'SETUP_GUIDE.md'), 'utf8')
    // "24.x" → "24.x"（先頭の ">=" 等の記号だけを除く）
    const minNodeVersion = pkg.engines.node.replace(/^[^\d]*/, '')

    if (!guide.includes(minNodeVersion)) {
      expect(
        guide.includes(minNodeVersion),
        `\nSETUP_GUIDE.md に Node.js ${minNodeVersion} の記載がありません。\n` +
          `package.json engines.node = ${pkg.engines.node}\n\n` +
          `修正方法:\n` +
          `  SETUP_GUIDE.md の前提条件セクションを Node.js ${minNodeVersion} 以上に更新してください。`
      ).toBe(true)
    }
  })

  it('package.json engines.node が SPECIFICATION.md 13章（前提条件）に記載されている', () => {
    const spec = readFileSync(path.join(ROOT, 'SPECIFICATION.md'), 'utf8')
    const minNodeVersion = pkg.engines.node.replace(/^[^\d]*/, '')
    // 13章だけ抽出
    const section13Match = /## 13\. 前提条件[\s\S]*?(?=\n## \d+\.)/.exec(spec)
    if (!section13Match) {
      throw new Error('SPECIFICATION.md に 13章「前提条件」が見つかりません')
    }
    const section13 = section13Match[0]

    expect(
      section13.includes(minNodeVersion),
      `\nSPECIFICATION.md 13章「前提条件」に Node.js ${minNodeVersion} の記載がありません。\n` +
        `修正方法: 13章の前提条件を package.json engines.node に合わせてください。`
    ).toBe(true)
  })

  it('package.json に packageManager がある（pnpm の単一の真実の源）', () => {
    expect(
      /^pnpm@\d+\.\d+\.\d+/.test(pkg.packageManager),
      `\npackage.json の packageManager が "pnpm@X.Y.Z" 形式ではありません: ${pkg.packageManager}\n` +
        `pnpm/action-setup@v6 はこのフィールドから pnpm のバージョンを読むため、\n` +
        `消すとワークフローがバージョンを決められなくなります。\n` +
        `修正方法: package.json に "packageManager": "pnpm@X.Y.Z" を設定してください。`
    ).toBe(true)
  })

  it('ワークフローが pnpm のバージョンを直書きしていない（packageManager を単一の真実の源にする）', () => {
    const targets = [
      'scripts/setup.js',
      '.github/workflows/ci.yml',
      '.github/workflows/security.yml',
    ] as const

    /**
     * pnpm/action-setup のステップ内に version: が直書きされていないか調べる。
     * ステップの範囲は「`- uses:` の行より深いインデントが続く間」で判定する。
     */
    const directVersions = (text: string): string[] => {
      const lines = text.split('\n')
      const found: string[] = []

      lines.forEach((line, index) => {
        if (!line.includes('pnpm/action-setup@')) return
        const baseIndent = line.search(/\S/)

        for (let cursor = index + 1; cursor < lines.length; cursor++) {
          const next = lines[cursor]
          if (next.trim() === '') continue
          if (next.search(/\S/) <= baseIndent) break // 次のステップに入った

          const match = /^\s*version:\s*(.+)$/.exec(next)
          if (match) found.push(match[1].trim())
        }
      })

      return found
    }

    for (const target of targets) {
      const content = readFileSync(path.join(ROOT, target), 'utf8')

      expect(
        directVersions(content),
        `\n${target} に pnpm のバージョン直書きが検出されました（v3.8.5〜禁止）。\n` +
          `pnpm/action-setup@v6 は package.json の packageManager（${pkg.packageManager}）から読むため、\n` +
          `直書きすると真実の源が2つになりズレます。\n` +
          `修正方法: pnpm/action-setup ステップから with: version: の記述を削除してください。`
      ).toEqual([])
    }

    // 検査が空振りしないよう、参照自体が消えていないことも確認する
    for (const workflow of ['.github/workflows/ci.yml', '.github/workflows/security.yml']) {
      const content = readFileSync(path.join(ROOT, workflow), 'utf8')

      expect(
        content.includes('pnpm/action-setup@'),
        `\n${workflow} に pnpm/action-setup の参照がありません。\n` +
          `修正方法: pnpm をセットアップするステップを復元してください。`
      ).toBe(true)
    }
  })

  it('CI/security ワークフローが .nvmrc を単一の真実の源として参照している', () => {
    const ciYml = readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8')
    const securityYml = readFileSync(path.join(ROOT, '.github/workflows/security.yml'), 'utf8')

    // 直書き禁止: setup-node の node-version: <数値リテラル> を検出して落とす
    const directVersionRegex = /setup-node@v\d+[\s\S]*?node-version:\s*['"]?(\d[\d.]*)['"]?\s*$/gm
    const ciDirect = [...ciYml.matchAll(directVersionRegex)]
    const secDirect = [...securityYml.matchAll(directVersionRegex)]

    expect(
      ciDirect.length + secDirect.length,
      `\nワークフロー内に node-version の直書きが検出されました（v3.7.2〜禁止）。\n` +
        `修正方法: setup-node ステップで node-version-file: '.nvmrc' を使用してください。`
    ).toBe(0)

    // node-version-file: '.nvmrc' が両ファイルに存在することを確認
    const nvmrcRefRegex = /setup-node@v\d+[\s\S]*?node-version-file:\s*['"]\.nvmrc['"]/g
    const ciRefs = [...ciYml.matchAll(nvmrcRefRegex)]
    const secRefs = [...securityYml.matchAll(nvmrcRefRegex)]

    expect(
      ciRefs.length > 0,
      `\nci.yml に node-version-file: '.nvmrc' 参照が見つかりません。\n` +
        `修正方法: 全ての setup-node ステップで .nvmrc を参照してください。`
    ).toBe(true)

    expect(
      secRefs.length > 0,
      `\nsecurity.yml に node-version-file: '.nvmrc' 参照が見つかりません。\n` +
        `修正方法: 全ての setup-node ステップで .nvmrc を参照してください。`
    ).toBe(true)
  })

  it('package.json engines.node がメジャー版＋".x" 形式で書かれている（Vercel の推奨形式）', () => {
    // 範囲指定（">=20.19.0" 等）だと Vercel は使える最新のメジャー版を選び、CI と版がずれる
    expect(
      /^\d+\.x$/.test(pkg.engines.node),
      `\npackage.json engines.node が "<メジャー版>.x" 形式ではありません: ${pkg.engines.node}\n` +
        `Vercel は .nvmrc を読まず engines.node で Node.js の版を選ぶため、範囲指定だと\n` +
        `CI（.nvmrc）と別の版でビルドされます。\n` +
        `修正方法: engines.node を "24.x" のように .nvmrc と同じメジャー版で指定してください。`
    ).toBe(true)
  })

  it('.nvmrc のメジャー版と package.json engines.node のメジャー版が一致する', () => {
    const nvmrc = readFileSync(path.join(ROOT, '.nvmrc'), 'utf8').trim()
    const nvmMajor = /^v?(\d+)/.exec(nvmrc)?.[1]
    const enginesMajor = /^\D*(\d+)/.exec(pkg.engines.node)?.[1]

    expect(
      nvmMajor !== undefined && nvmMajor === enginesMajor,
      `\n.nvmrc (${nvmrc}) と package.json engines.node (${pkg.engines.node}) のメジャー版が一致しません。\n` +
        `CI は .nvmrc、Vercel は engines.node を読むため、ずれると環境ごとに別の版で動きます。\n` +
        `修正方法: .nvmrc と engines.node を同じメジャー版にそろえてください（例: .nvmrc = 24, engines.node = "24.x"）。`
    ).toBe(true)
  })
})
