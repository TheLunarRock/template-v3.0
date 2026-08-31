/**
 * 長時間ブロック操作ガードの動作検証。
 *
 * dev サーバーを禁止した結果、エージェントがブラウザ自動操作（claude-in-chrome）で
 * 実機確認を始め、拡張との往復が 13 回続いて作業が停止した事象が発生した。
 * 禁止すべきは「起動」ではなく終了条件が自分の手を離れている操作全般であるため、
 * 以下 3 カテゴリを機械的にブロックする。本テストはその判定が期待通りであること、
 * および正常なコマンド・言及を誤検知しないことを保証する。
 *
 * - A. ブラウザ自動操作（MCP / CLI）
 * - B. 常駐プロセス
 * - C. ログ追従・長時間待機
 *
 * 仕様: SPECIFICATION.md §15.2.2
 *
 * @category ユニット
 * @priority 🔴 critical
 */

import { describe, it, expect } from 'vitest'
import { spawnSync } from 'child_process'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const HOOK = path.join(ROOT, '.claude/hooks/blocking-op-guard.sh')

// PATH 依存のコマンド解決を避けるため絶対パスで起動する
const BASH_BIN = '/bin/bash'

const BLOCKED = 2
const PASSED = 0

/** PreToolUse Hook に任意のツール入力を渡し、終了コードを返す */
function runHook(payload: Record<string, unknown>): number | null {
  const result = spawnSync(BASH_BIN, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 30_000,
  })
  return result.status
}

/** Bash ツール呼び出しとしてコマンドを渡す */
const runCommand = (command: string): number | null =>
  runHook({ tool_name: 'Bash', tool_input: { command } })

/** Bash ツール呼び出しの stderr（ブロック理由メッセージ）を取得する */
function commandStderr(command: string): string {
  const result = spawnSync(BASH_BIN, [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
    timeout: 30_000,
  })
  return result.stderr
}

describe('A. ブラウザ自動操作をブロックする', () => {
  it.each([
    'mcp__claude-in-chrome__navigate',
    'mcp__claude-in-chrome__computer',
    'mcp__playwright__browser_click',
    'mcp__puppeteer__puppeteer_screenshot',
  ])('ブラウザ自動操作 MCP をブロックする: %s', (toolName) => {
    expect(runHook({ tool_name: toolName, tool_input: {} })).toBe(BLOCKED)
  })

  it.each([
    'npx playwright test',
    'pnpm exec playwright codegen https://example.com',
    'playwright test --headed',
    'npx -y lighthouse https://example.com',
    'chromedriver --port=9515',
  ])('ブラウザ自動操作 CLI をブロックする: %s', (command) => {
    expect(runCommand(command)).toBe(BLOCKED)
  })

  it('ブロック時に人間へ渡す運用を案内する', () => {
    expect(commandStderr('npx playwright test')).toContain('箇条書き')
  })
})

describe('B. 常駐プロセスをブロックする', () => {
  it.each([
    'pnpm start',
    'next start',
    'pnpm test:unit:watch',
    'pnpm test:unit:ui',
    'pnpm test:coverage:ui',
    'pnpm sc:debug',
    'pnpm fix:bug',
    'vitest',
    'jest',
    'vitest --ui',
    'tsc --watch',
    'node --watch server.js',
    'serve out',
    'npx http-server .',
    'ngrok http 3000',
    'supabase start',
    'docker compose up',
    'docker-compose up',
    'python3 -m http.server 8000',
    'php -S localhost:8000',
  ])('常駐プロセスをブロックする: %s', (command) => {
    expect(runCommand(command)).toBe(BLOCKED)
  })

  it('ブロック時に単発実行の代替手段を案内する', () => {
    expect(commandStderr('pnpm start')).toContain('pnpm build')
  })
})

describe('C. ログ追従・長時間待機をブロックする', () => {
  it.each([
    'tail -f /tmp/app.log',
    'tail --follow=name /var/log/system.log',
    'docker logs -f web',
    'kubectl logs -f pod/api',
    'gh run watch',
    'vercel logs --follow',
    'sleep 60',
    'sleep 300',
  ])('追従・待機をブロックする: %s', (command) => {
    expect(runCommand(command)).toBe(BLOCKED)
  })

  it('ブロック時にワンショット取得の代替手段を案内する', () => {
    expect(commandStderr('tail -f /tmp/app.log')).toContain('tail -n 200')
  })
})

describe('通常のコマンドは通す', () => {
  it.each([
    'pnpm build',
    'pnpm validate',
    'pnpm typecheck',
    'pnpm test',
    'pnpm test:regression',
    'vitest run',
    'vitest run tests/unit',
    'jest --runInBand run',
    'pnpm add -D @playwright/test',
    'pnpm remove puppeteer',
    'docker compose up -d',
    'tail -n 200 /tmp/app.log',
    'gh run list --limit 5',
    'gh run view 123 --log-failed',
    'vercel logs',
    'sleep 5',
    'git log --follow README.md',
    'git status && git diff',
  ])('通す: %s', (command) => {
    expect(runCommand(command)).toBe(PASSED)
  })

  it.each(['Read', 'Edit', 'Write', 'Grep'])('対象外ツールは通す: %s', (toolName) => {
    expect(runHook({ tool_name: toolName, tool_input: { file_path: 'src/app/page.tsx' } })).toBe(
      PASSED
    )
  })
})

describe('文字列としての言及は誤検知しない', () => {
  it.each([
    'echo "tail -f は禁止です"',
    "echo 'playwright は使わない'",
    'grep -rn "gh run watch" docs/',
    "cat > /tmp/rule.md << 'EOF'\n禁止: tail -f / pnpm start / npx playwright\nEOF",
  ])('通す: %s', (command) => {
    expect(runCommand(command)).toBe(PASSED)
  })
})

describe('配線: settings.json に deny とフックが登録されている', () => {
  interface Settings {
    permissions: { deny: string[] }
    hooks: {
      PreToolUse: { matcher: string; hooks: { type: string; command: string }[] }[]
    }
  }

  const settings = JSON.parse(
    readFileSync(path.join(ROOT, '.claude/settings.json'), 'utf8')
  ) as Settings

  it.each(['mcp__claude-in-chrome', 'mcp__playwright', 'mcp__puppeteer'])(
    'deny に %s が含まれる',
    (rule) => {
      expect(
        settings.permissions.deny,
        `\n.claude/settings.json の permissions.deny に "${rule}" がありません。\n` +
          `修正方法: deny 配列に "${rule}" を追加してください（緩和は settings.local.json 側で行う）。`
      ).toContain(rule)
    }
  )

  it('Bash とブラウザ自動操作 MCP の両方に blocking-op-guard.sh が登録されている', () => {
    const matchersWithGuard = settings.hooks.PreToolUse.filter((entry) =>
      entry.hooks.some((h) => h.command.includes('blocking-op-guard.sh'))
    ).map((entry) => entry.matcher)

    // matcher は 2026-09-01 に "Bash|mcp__.*__execute_shell_command" へ広げた
    // （serena のシェル経由でガードを迂回できたため。回帰 2026-09-01-005）。
    // ここでは「Bash への反応を失っていないこと」を選択肢単位で確認する。
    expect(
      matchersWithGuard.flatMap((m) => m.split('|')),
      '\n.claude/settings.json の PreToolUse に blocking-op-guard.sh の Bash 登録がありません。'
    ).toContain('Bash')

    expect(
      matchersWithGuard.some((m) => m.includes('claude-in-chrome')),
      '\n.claude/settings.json の PreToolUse にブラウザ自動操作 MCP 用の matcher がありません。'
    ).toBe(true)
  })
})
