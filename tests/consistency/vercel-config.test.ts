/**
 * 整合性テスト: vercel.json が main 以外の preview deployment を停止する設定になっている。
 *
 * 過去事例（2026-04-24）: Dependabot 自動PR + 修正push連鎖でVercel build minutes が
 * 1リポジトリで7連投・累積9時間に到達。原因の一つは preview deployment が
 * デフォルトで全 branch に対して有効だったこと。
 *
 * 本テストは vercel.json の git.deploymentEnabled が
 * { "**": false, "main": true } の意図通り設定されていることを保証する。
 *
 * Vercel docs:
 * https://vercel.com/docs/projects/project-configuration/git-configuration
 *
 * @category 整合性
 * @priority 🔴 critical
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

describe('整合性: vercel.json が main 以外の deploy を停止する設定', () => {
  it('vercel.json が存在する', () => {
    expect(
      () => readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'),
      `\nvercel.json が見つかりません。\n` +
        `修正方法: テンプレートに vercel.json を新規作成してください。\n` +
        `内容例:\n` +
        `{\n` +
        `  "$schema": "https://openapi.vercel.sh/vercel.json",\n` +
        `  "git": {\n` +
        `    "deploymentEnabled": {\n` +
        `      "**": false,\n` +
        `      "main": true\n` +
        `    }\n` +
        `  }\n` +
        `}`
    ).not.toThrow()
  })

  it('git.deploymentEnabled が "**": false と "main": true を持つ', () => {
    const raw = readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')
    const config = JSON.parse(raw) as {
      git?: { deploymentEnabled?: Record<string, boolean> | boolean }
    }

    const enabled = config.git?.deploymentEnabled
    expect(
      typeof enabled === 'object' && enabled !== null,
      '\nvercel.json の git.deploymentEnabled がオブジェクトではありません。\n' +
        '修正方法: { "**": false, "main": true } の形式に変更してください。'
    ).toBe(true)

    if (typeof enabled === 'object' && enabled !== null) {
      expect(
        enabled['**'],
        '\nvercel.json の git.deploymentEnabled["**"] が false ではありません。\n' +
          'これがないと feature branch でも preview deployment が走り、Vercel クレジットが消費されます。\n' +
          '修正方法: vercel.json の git.deploymentEnabled に "**": false を追加してください。'
      ).toBe(false)

      expect(
        enabled.main,
        '\nvercel.json の git.deploymentEnabled["main"] が true ではありません。\n' +
          'これがないと main の production deployment も止まってしまいます。\n' +
          '修正方法: vercel.json の git.deploymentEnabled に "main": true を追加してください。'
      ).toBe(true)
    }
  })

  it('CLAUDE.md にブランチ運用ルール由来のセクションが存在する', () => {
    const claude = readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8')
    expect(
      claude.includes('feature branch をリモートに push しない'),
      '\nCLAUDE.md にブランチ運用ルールが見つかりません。\n' +
        '修正方法: 「## 🔴 ブランチ運用ルール」セクションを CLAUDE.md に追加してください。'
    ).toBe(true)
  })
})
