/**
 * Bug ID: 2026-09-01-003
 * Date: 2026-09-01
 * Issue: Stop フックは「タスクが完了した」ではなく「アシスタントが1回の応答を
 *        終えた」で発火する。Cursor の auto mode は1つの作業を何ターンにも分けて
 *        進めるため、作業の途中で何度も「作業が終わりました」が鳴っていた。
 *        「本当に止まったか」は発火時点では判定できず、次にツールが動くか
 *        ユーザーがプロンプトを送るかを待って初めて分かる。
 * Feature: .claude/hooks/notify.sh / .claude/hooks/notify-repeat.sh
 * Fixed by: Stop の通知を既定 15 秒遅延させ、その間に PreToolUse /
 *           UserPromptSubmit（= notify-stop.sh）が来たらキャンセルする。
 *           遅延・Slack 送信・デスクトップ通知を 1 本のバックグラウンドジョブに
 *           まとめ、PID ファイル 1 つで丸ごとキャンセルできるようにした。
 *
 * 最重要: キャンセルされたら Slack も送られないこと。デスクトップ通知だけ
 * 取り消されて Slack が飛ぶと、遅延させた意味が無くなる（Slack は履歴なので
 * 積み上がる）。
 *
 * 承認待ち（permission_prompt / agent_needs_input / elicitation_*）は
 * 人間が動かないと進まない状態なので遅延させない。
 *
 * 実機の alerter 有無・OS に依存しないよう、uname / alerter / osascript /
 * afplay / curl を PATH のスタブに差し替えて検証する。curl をスタブに
 * しているため、本テストから実際の Slack へは 1 通も送信されない。
 *
 * @category 回帰
 * @priority 🔴 critical
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { spawnSync } from 'child_process'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const HOOK = path.join(ROOT, '.claude/hooks/notify.sh')
const REPEAT_HOOK = path.join(ROOT, '.claude/hooks/notify-repeat.sh')
const STOP_HOOK = path.join(ROOT, '.claude/hooks/notify-stop.sh')

// PATH 依存のコマンド解決を避けるため絶対パスで起動する
const BASH_BIN = '/bin/bash'

interface Stub {
  dir: string
  log: string
}

/** シェルスクリプトを実行して stdout を返す（fs の動的パス参照を避けるため） */
function sh(script: string, args: string[] = []): string {
  return spawnSync(BASH_BIN, ['-c', script, 'sh', ...args], {
    encoding: 'utf8',
    timeout: 60_000,
  }).stdout
}

/**
 * 待ち時間。同期的にブロックするとイベントループを占有して
 * describe.concurrent が実際には並行にならないため setTimeout を使う。
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * スタブ環境を作る。uname は Darwin を返し（ubuntu の CI でも macOS 経路を通す）、
 * alerter / osascript / afplay / curl は呼び出しをログへ追記する。
 * curl をスタブにしているので実 Slack へは送信されない。
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

    cat > "$dir/bin/alerter" <<'EOF'
#!/bin/sh
printf 'alerter %s\n' "$*" >> "$CLAUDE_TEST_LOG"
case " $* " in
  *" --remove "*) exit 0 ;;
esac
# 本物は通知が消されるまでブロックする
sleep 8
EOF

    cat > "$dir/bin/osascript" <<'EOF'
#!/bin/sh
printf 'osascript\n' >> "$CLAUDE_TEST_LOG"
EOF

    cat > "$dir/bin/afplay" <<'EOF'
#!/bin/sh
printf 'afplay\n' >> "$CLAUDE_TEST_LOG"
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

/**
 * スタブ環境で通知フックを動かすための環境変数。
 * Slack を到達可能にするため Webhook を明示的に与える（送信先はスタブの curl）。
 */
function envFor(stub: Stub, projectDir: string): Record<string, string> {
  return {
    PATH: `${path.join(stub.dir, 'bin')}:${process.env.PATH ?? ''}`,
    CLAUDE_TEST_LOG: stub.log,
    CLAUDE_PROJECT_DIR: projectDir,
    CLAUDE_NOTIFY_WATCH_PID: String(process.pid),
    // 実在しない Webhook。curl はスタブなので送信そのものが起こらない
    CLAUDE_NOTIFY_WEBHOOK: 'https://example.invalid/hook',
    CI: '',
    CLAUDE_NOTIFY_DISABLED: '',
    CLAUDE_NOTIFY_NO_SLACK: '',
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

/** 実際に画面へ出た通知の回数（--remove は数えない） */
function fireCount(log: string): number {
  return log.split('\n').filter((l) => l.startsWith('alerter ') && !l.includes('--remove')).length
}

function slackCount(log: string): number {
  return log.split('\n').filter((l) => l === 'curl').length
}

/** 通知が出るまで待ってからログを返す（固定待ちより早く抜けるため） */
async function waitForFire(stub: Stub, maxMs: number): Promise<string> {
  const deadline = Date.now() + maxMs
  for (;;) {
    const log = readLog(stub)
    if (fireCount(log) > 0 || Date.now() >= deadline) return log
    await wait(100)
  }
}

/** notify-stop.sh を実行する。対象は env の CLAUDE_PROJECT_DIR で決まる */
function stopFor(env: Record<string, string>): void {
  spawnSync(BASH_BIN, [STOP_HOOK], {
    timeout: 60_000,
    env: { ...process.env, ...env },
  })
}

/**
 * スタブ環境を用意してテスト本体を実行し、必ず後始末する。
 *
 * 各テストは自分専用の一時ディレクトリとプロジェクトキーを使うため互いに
 * 干渉しない。後始末をテストローカルに閉じることで並行実行でき、待ち時間の
 * 合計ではなく最長のテストだけが所要時間になる（pre-commit で毎回走るため）。
 */
async function withStub(
  projectDir: string,
  extraEnv: Record<string, string>,
  body: (stub: Stub, env: Record<string, string>) => Promise<void>
): Promise<void> {
  const stub = makeStubEnv()
  const env = { ...envFor(stub, projectDir), ...extraEnv }
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

const STOP_PAYLOAD = { hook_event_name: 'Stop', cwd: '/Users/example/my-app' }
const PERMISSION_PAYLOAD = {
  hook_event_name: 'Notification',
  notification_type: 'permission_prompt',
  cwd: '/Users/example/my-app',
}

describe.concurrent('Regression: 2026-09-01-003 - Stop 通知が作業の途中で鳴る', () => {
  it('遅延時間の経過前は通知を出していない', async () => {
    await withStub(
      '/Users/example/delay-pending',
      { CLAUDE_NOTIFY_STOP_DELAY: '10' },
      async (stub, env) => {
        expect(runHook(STOP_PAYLOAD, env)).toBe(0)
        await wait(800)

        const log = readLog(stub)
        expect(fireCount(log)).toBe(0)
        expect(slackCount(log)).toBe(0)
      }
    )
  }, 40_000)

  it('遅延中に notify-stop.sh が来たら通知を出さないまま終わる', async () => {
    await withStub(
      '/Users/example/delay-cancelled',
      { CLAUDE_NOTIFY_STOP_DELAY: '10' },
      async (stub, env) => {
        runHook(STOP_PAYLOAD, env)
        // 待たずに即キャンセルする。フルスイート実行時は spawn だけで数秒
        // かかることがあり、待ってから送ると遅延時間を追い越して flaky になる
        stopFor(env)
        // 遅延時間を過ぎても発火しないことを確認する
        await wait(11_000)

        expect(fireCount(readLog(stub))).toBe(0)
      }
    )
  }, 40_000)

  it('キャンセルされたら Slack も送られない', async () => {
    await withStub(
      '/Users/example/delay-cancelled-slack',
      { CLAUDE_NOTIFY_STOP_DELAY: '10' },
      async (stub, env) => {
        runHook(STOP_PAYLOAD, env)
        // 待たずに即キャンセルする（理由は上のテストと同じ）
        stopFor(env)
        await wait(11_000)

        expect(slackCount(readLog(stub))).toBe(0)
      }
    )
  }, 40_000)

  it('遅延時間が経過すれば通知が出る', async () => {
    await withStub(
      '/Users/example/delay-elapsed',
      { CLAUDE_NOTIFY_STOP_DELAY: '1' },
      async (stub, env) => {
        runHook(STOP_PAYLOAD, env)
        const log = await waitForFire(stub, 12_000)

        expect(fireCount(log)).toBe(1)
        expect(slackCount(log)).toBe(1)
      }
    )
  }, 40_000)

  it('承認待ちは遅延させず即時に通知する', async () => {
    // Stop の遅延を長く設定しても承認待ちには効かないこと
    await withStub(
      '/Users/example/permission-immediate',
      { CLAUDE_NOTIFY_STOP_DELAY: '30' },
      async (stub, env) => {
        runHook(PERMISSION_PAYLOAD, env)

        expect(fireCount(await waitForFire(stub, 12_000))).toBe(1)
      }
    )
  }, 40_000)

  it('遅延中に次の Stop が来たら古い方は破棄され二重に鳴らない', async () => {
    await withStub(
      '/Users/example/delay-superseded',
      { CLAUDE_NOTIFY_STOP_DELAY: '10' },
      async (stub, env) => {
        runHook(STOP_PAYLOAD, env)
        // 1 回目の遅延中に 2 回目を送る（待たずに送って確実に間に合わせる）
        runHook(STOP_PAYLOAD, env)
        await wait(11_000)

        const log = readLog(stub)
        expect(fireCount(log)).toBe(1)
        expect(slackCount(log)).toBe(1)
      }
    )
  }, 40_000)

  it('CLAUDE_NOTIFY_STOP_DELAY=0 なら従来どおり即時に鳴る', async () => {
    await withStub(
      '/Users/example/delay-zero',
      { CLAUDE_NOTIFY_STOP_DELAY: '0' },
      async (stub, env) => {
        runHook(STOP_PAYLOAD, env)

        expect(fireCount(await waitForFire(stub, 12_000))).toBe(1)
      }
    )
  }, 40_000)

  it('既定では遅延する（環境変数を渡さなければすぐには鳴らない）', async () => {
    await withStub('/Users/example/delay-default', {}, async (stub, env) => {
      runHook(STOP_PAYLOAD, env)
      await wait(2000)

      expect(fireCount(readLog(stub))).toBe(0)
    })
  }, 40_000)

  it('既定の遅延は 15 秒である', () => {
    const src = readFileSync(path.join(ROOT, '.claude/hooks/notify.sh'), 'utf8')

    expect(src).toContain('CLAUDE_NOTIFY_STOP_DELAY:-15')
  })
})
