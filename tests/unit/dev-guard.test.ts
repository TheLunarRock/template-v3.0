/**
 * 開発サーバー起動禁止ガードの動作検証。
 *
 * AI エージェントが開発サーバーを起動するとターミナルが占有され、
 * エージェントの作業がそこで停止する。この停止が繰り返し発生していたため、
 * プロンプト指示ではなく機械的な強制として二層のガードを実装した。
 * 本テストはその二層が期待通り動作することを保証する。
 *
 * - 第1層: scripts/dev-guard.js（ツール非依存・Cursor にも効く）
 * - 第2層: .claude/hooks/dev-server-guard.sh（Claude Code の Bash をブロック）
 *
 * 仕様: SPECIFICATION.md §15.2.1
 *
 * @category ユニット
 * @priority 🔴 critical
 */

import { describe, it, expect } from 'vitest'
import { spawnSync } from 'child_process'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const GUARD = path.join(ROOT, 'scripts/dev-guard.js')
const HOOK = path.join(ROOT, '.claude/hooks/dev-server-guard.sh')

// PATH 依存のコマンド解決を避けるため絶対パスで起動する
const NODE_BIN = process.execPath
const BASH_BIN = '/bin/bash'

/** 自動化を示す環境変数を取り除いた素の環境（人間のターミナル相当） */
const CLEAN_ENV: NodeJS.ProcessEnv = (() => {
  const env = Object.assign({}, process.env)
  const automationKeys = [
    'CLAUDECODE',
    'CLAUDE_CODE',
    'CURSOR_AGENT',
    'AIDER_MODEL',
    'CODEX_SANDBOX',
    'GITHUB_ACTIONS',
    'CI',
    'ALLOW_DEV_SERVER',
  ]
  for (const key of automationKeys) delete env[key]
  return env
})()

/** dev-guard.js を非対話（stdin にパイプ）で実行し、終了コードと出力を返す */
function runGuard(extraEnv: Record<string, string> = {}): {
  status: number | null
  output: string
} {
  const result = spawnSync(NODE_BIN, [GUARD], {
    env: Object.assign({}, CLEAN_ENV, extraEnv),
    input: '',
    encoding: 'utf8',
    timeout: 30_000,
  })
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
  }
}

/** PreToolUse Hook にコマンドを渡し、終了コードを返す */
function runHook(command: string): number | null {
  const result = spawnSync(BASH_BIN, [HOOK], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
    timeout: 30_000,
  })
  return result.status
}

describe('第1層: scripts/dev-guard.js', () => {
  it('自動化環境変数なしでも非対話実行なら拒否する（エージェントのパイプ実行を捕捉）', () => {
    expect(runGuard().status).toBe(1)
  })

  it.each([
    ['CLAUDECODE', '1'],
    ['CLAUDE_CODE', '1'],
    ['CURSOR_AGENT', '1'],
    ['AIDER_MODEL', 'gpt-4'],
    ['CODEX_SANDBOX', '1'],
    ['GITHUB_ACTIONS', 'true'],
    ['CI', 'true'],
  ])('自動化環境 %s を検出して拒否する', (key, value) => {
    expect(runGuard({ [key]: value }).status).toBe(1)
  })

  it('ALLOW_DEV_SERVER=1 なら起動を許可する（人間の明示オプトイン）', () => {
    expect(runGuard({ ALLOW_DEV_SERVER: '1' }).status).toBe(0)
  })

  it('拒否時に代替手段 pnpm build を案内する', () => {
    const { output } = runGuard({ CLAUDECODE: '1' })
    expect(output).toContain('pnpm build')
  })

  it('拒否時は即座に終了しハングしない（エージェントを止めない）', () => {
    const start = Date.now()
    runGuard({ CLAUDECODE: '1' })
    expect(Date.now() - start).toBeLessThan(10_000)
  })
})

describe('第2層: .claude/hooks/dev-server-guard.sh', () => {
  it.each([
    'pnpm dev',
    'pnpm run dev',
    'npm run dev',
    'yarn dev',
    'bun dev',
    'next dev',
    'npx next dev',
    'vercel dev',
    'pnpm dev:safe',
    'ALLOW_DEV_SERVER=1 pnpm dev',
    'cd /tmp/app && pnpm dev',
    'pnpm dev --port 3001',
  ])('開発サーバー起動をブロックする: %s', (command) => {
    expect(runHook(command)).toBe(2)
  })

  it.each([
    'pnpm build',
    'pnpm validate',
    'pnpm typecheck',
    'pnpm test',
    'pnpm dev:supabase-check',
    'git push origin main',
    'node scripts/dev-guard.js',
  ])('通常のコマンドは通す: %s', (command) => {
    expect(runHook(command)).toBe(0)
  })

  it.each([
    'echo "pnpm dev は禁止です"',
    'grep -rn "next dev" docs/',
    "cat > /tmp/rule.md << 'EOF'\n禁止: pnpm dev / next dev\nEOF",
  ])('文字列としての言及は誤検知しない: %s', (command) => {
    expect(runHook(command)).toBe(0)
  })
})

describe('配線: package.json の dev スクリプトがガードを経由する', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>
  }

  it.each(['dev', 'dev:safe'])('%s が dev-guard.js を前段で実行する', (name) => {
    expect(
      pkg.scripts[name],
      `\npackage.json の "${name}" が scripts/dev-guard.js を経由していません。\n` +
        `修正方法: "${name}" の先頭に "node scripts/dev-guard.js && " を追加してください。`
    ).toContain('node scripts/dev-guard.js')
  })
})
