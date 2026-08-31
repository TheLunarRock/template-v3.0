/**
 * Bug ID: 2026-09-01-004
 * Date: 2026-09-01
 * Issue: 通知フックが Stop イベントで last_assistant_message を pbcopy へ入れて
 *        いたため、報告の受け渡しを壊していた。このプロジェクトの運用では
 *        Cursor が報告本文を pbcopy でクリップボードに入れ、それをユーザーが貼る。
 *        実際の順番は次のとおり。
 *
 *          1. Cursor が報告本文を pbcopy        ← ユーザーが欲しいもの
 *          2. Cursor がターンを終える
 *          3. Stop フックが発火 → last_assistant_message を pbcopy   ← 上書き
 *
 *        last_assistant_message は「報告をクリップボードにコピーしました」等の
 *        メタ文なので、報告が毎回失われてメタ文だけが貼られる。複数回発生した。
 * Feature: .claude/hooks/notify.sh
 * Fixed by: notify.sh からクリップボードへのコピーを削除。報告の受け渡しは
 *           Cursor 側の pbcopy が担うため、フックが触る必要がない。
 *           通知の文言・遅延・キャンセル・Slack の挙動は変更しない。
 *
 * 実機の OS に依存しないよう uname / pbcopy / alerter / curl を PATH のスタブに
 * 差し替えて検証する。curl をスタブにしているので実 Slack へは送信されない。
 *
 * @category 回帰
 * @priority 🔴 critical
 */

import { describe, it, expect } from 'vitest'
import { spawnSync } from 'child_process'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const HOOK = path.join(ROOT, '.claude/hooks/notify.sh')
const REPEAT_HOOK = path.join(ROOT, '.claude/hooks/notify-repeat.sh')

// PATH 依存のコマンド解決を避けるため絶対パスで起動する
const BASH_BIN = '/bin/bash'

interface Stub {
  dir: string
  log: string
}

function sh(script: string, args: string[] = []): string {
  return spawnSync(BASH_BIN, ['-c', script, 'sh', ...args], {
    encoding: 'utf8',
    timeout: 60_000,
  }).stdout
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * スタブ環境を作る。pbcopy は呼ばれたらログへ記録する（実際のクリップボードは
 * 触らない）。uname は Darwin を返してクリップボード経路を確実に通す。
 */
function makeStubEnv(): Stub {
  const dir = sh(`
    set -eu
    dir=$(mktemp -d)
    mkdir -p "$dir/bin"

    cat > "$dir/bin/uname" <<'EOF'
#!/bin/sh
echo Darwin
EOF

    cat > "$dir/bin/pbcopy" <<'EOF'
#!/bin/sh
printf 'pbcopy\n' >> "$CLAUDE_TEST_LOG"
cat > /dev/null
EOF

    cat > "$dir/bin/alerter" <<'EOF'
#!/bin/sh
printf 'alerter %s\n' "$*" >> "$CLAUDE_TEST_LOG"
case " $* " in
  *" --remove "*) exit 0 ;;
esac
sleep 8
EOF

    cat > "$dir/bin/curl" <<'EOF'
#!/bin/sh
printf 'curl\n' >> "$CLAUDE_TEST_LOG"
EOF

    chmod +x "$dir/bin/"*
    printf '%s' "$dir"
  `).trim()

  return { dir, log: path.join(dir, 'calls.log') }
}

function envFor(stub: Stub, projectDir: string): Record<string, string> {
  return {
    PATH: `${path.join(stub.dir, 'bin')}:${process.env.PATH ?? ''}`,
    CLAUDE_TEST_LOG: stub.log,
    CLAUDE_PROJECT_DIR: projectDir,
    CLAUDE_NOTIFY_WATCH_PID: String(process.pid),
    CLAUDE_NOTIFY_WEBHOOK: 'https://example.invalid/hook',
    CI: '',
    CLAUDE_NOTIFY_DISABLED: '',
    CLAUDE_NOTIFY_NO_SLACK: '',
    // PID ディレクトリはテストごとに分ける。既定の $HOME/.claude/notify-repeat を
    // 共有すると、stop-all がディレクトリ内の全 PID を kill する仕様のせいで
    // 並列実行中の別テストや実運用の通知を巻き添えにする（回帰 2026-09-01-006）。
    CLAUDE_NOTIFY_PIDDIR: path.join(stub.dir, 'piddir'),
    // 通知の発行そのものは即時にして観測しやすくする
    CLAUDE_NOTIFY_STOP_DELAY: '0',
  }
}

function runHook(payload: unknown, env: Record<string, string>): number | null {
  return spawnSync(BASH_BIN, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 60_000,
    env: { ...process.env, ...env },
  }).status
}

function readLog(stub: Stub): string {
  return sh('cat "$1" 2>/dev/null || true', [stub.log])
}

function countLine(log: string, value: string): number {
  return log.split('\n').filter((l) => l === value).length
}

/** 通知が出るまで待ってからログを返す */
async function waitForFire(stub: Stub, maxMs: number): Promise<string> {
  const deadline = Date.now() + maxMs
  for (;;) {
    const log = readLog(stub)
    if (log.includes('alerter ') || Date.now() >= deadline) return log
    await wait(100)
  }
}

async function withStub(
  projectDir: string,
  body: (stub: Stub, env: Record<string, string>) => Promise<void>
): Promise<void> {
  const stub = makeStubEnv()
  const env = envFor(stub, projectDir)
  try {
    await body(stub, env)
  } finally {
    spawnSync(BASH_BIN, [REPEAT_HOOK, 'stop', projectDir], {
      timeout: 60_000,
      env: { ...process.env, ...env },
    })
    sh('rm -rf "$1"', [stub.dir])
  }
}

const STOP_PAYLOAD = {
  hook_event_name: 'Stop',
  cwd: '/Users/example/my-app',
  last_assistant_message: '報告をクリップボードにコピーしました',
}

describe.concurrent('Regression: 2026-09-01-004 - 通知フックがクリップボードを上書きする', () => {
  it('Stop でも pbcopy を呼ばない（報告の受け渡しを壊さない）', async () => {
    await withStub('/Users/example/clip-stop', async (stub, env) => {
      expect(runHook(STOP_PAYLOAD, env)).toBe(0)
      const log = await waitForFire(stub, 8000)

      expect(countLine(log, 'pbcopy')).toBe(0)
    })
  }, 30_000)

  it('last_assistant_message があっても pbcopy を呼ばない', async () => {
    await withStub('/Users/example/clip-long-message', async (stub, env) => {
      runHook(
        {
          ...STOP_PAYLOAD,
          last_assistant_message: '複数行の\n報告本文\n"引用符" と \\ を含む',
        },
        env
      )
      const log = await waitForFire(stub, 8000)

      expect(countLine(log, 'pbcopy')).toBe(0)
    })
  }, 30_000)

  it('承認待ちでも pbcopy を呼ばない', async () => {
    await withStub('/Users/example/clip-permission', async (stub, env) => {
      runHook(
        {
          hook_event_name: 'Notification',
          notification_type: 'permission_prompt',
          cwd: '/Users/example/my-app',
        },
        env
      )
      const log = await waitForFire(stub, 8000)

      expect(countLine(log, 'pbcopy')).toBe(0)
    })
  }, 30_000)

  it('デスクトップ通知と Slack の挙動は変わらない', async () => {
    await withStub('/Users/example/clip-notify-intact', async (stub, env) => {
      runHook(STOP_PAYLOAD, env)
      const log = await waitForFire(stub, 8000)

      // 通知は 1 回だけ出る
      expect(log.split('\n').filter((l) => l.startsWith('alerter ')).length).toBe(1)
      expect(log).toContain('--sound Glass')
      // Slack も従来どおり送る
      expect(countLine(log, 'curl')).toBe(1)
    })
  }, 30_000)

  it('Stop の通知本文はクリップボードに言及しない', () => {
    const r = spawnSync(BASH_BIN, [HOOK], {
      input: JSON.stringify(STOP_PAYLOAD),
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, CLAUDE_NOTIFY_DRY_RUN: '1' },
    })
    const message = r.stdout.split('\n')[2] ?? ''

    expect(message).toBe('作業が終わりました')
    expect(message).not.toContain('クリップボード')
  })
})
