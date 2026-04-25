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
/* eslint-disable sonarjs/slow-regex */

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
    // ">=20.19.0" → "20.19.0"
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

  it('package.json packageManager のバージョンが整合している', () => {
    // "pnpm@9.12.0" → "9"
    const pmMatch = /^pnpm@(\d+)/.exec(pkg.packageManager)
    if (!pmMatch) {
      throw new Error('package.json packageManager が "pnpm@X.Y.Z" 形式ではありません')
    }
    const majorVersion = pmMatch[1]

    // setup.js / ci.yml / security.yml で pnpm の major バージョンが一致するか
    const setupCode = readFileSync(path.join(ROOT, 'scripts/setup.js'), 'utf8')
    const ciYml = readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8')
    const securityYml = readFileSync(path.join(ROOT, '.github/workflows/security.yml'), 'utf8')

    // pnpm/action-setup の version: N を抽出
    const extractActionVersions = (text: string): string[] =>
      [...text.matchAll(/pnpm\/action-setup@v\d+[\s\S]*?version:\s*(\d+)/g)].map((m) => m[1])

    const allVersions = [
      ...extractActionVersions(setupCode),
      ...extractActionVersions(ciYml),
      ...extractActionVersions(securityYml),
    ]
    const unique = [...new Set(allVersions)]

    expect(
      unique.length,
      `\npnpm メジャーバージョンが ci.yml / security.yml / setup.js で不整合です: ${unique.join(', ')}\n` +
        `package.json packageManager: ${pkg.packageManager}\n` +
        `修正方法: 全ファイルで pnpm/action-setup の version を ${majorVersion} に統一してください。`
    ).toBe(1)

    expect(
      unique[0],
      `\npnpm メジャーバージョンが package.json と一致しません: ${unique[0]} vs ${majorVersion}\n` +
        `修正方法: pnpm/action-setup version を ${majorVersion} に更新してください。`
    ).toBe(majorVersion)
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

  it('.nvmrc が package.json engines.node の最小要件を満たす', () => {
    const nvmrc = readFileSync(path.join(ROOT, '.nvmrc'), 'utf8').trim()
    const minNodeVersion = pkg.engines.node.replace(/^[^\d]*/, '')
    const [nvmMajor, nvmMinor = '0', nvmPatch = '0'] = nvmrc.split('.').map(Number) as [
      number,
      number?,
      number?,
    ]
    const [minMajor, minMinor = 0, minPatch = 0] = minNodeVersion.split('.').map(Number) as [
      number,
      number?,
      number?,
    ]

    const meets =
      nvmMajor > minMajor ||
      (nvmMajor === minMajor && Number(nvmMinor) > minMinor) ||
      (nvmMajor === minMajor && Number(nvmMinor) === minMinor && Number(nvmPatch) >= minPatch)

    expect(
      meets,
      `\n.nvmrc (${nvmrc}) が package.json engines.node (${pkg.engines.node}) の最小要件を満たしていません。\n` +
        `修正方法: .nvmrc を ${minNodeVersion} 以上に更新してください。`
    ).toBe(true)
  })
})
