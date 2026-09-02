/**
 * Bug ID: 2026-09-03-001
 * Date: 2026-09-03
 * Issue: ~/.claude/settings.json（全プロジェクト共通）とプロジェクトの
 *        .claude/settings.json の両方に通知フックがある環境では、1 回の Stop で
 *        notify.sh が 2 回起動される。notify-repeat.sh の start は先頭で
 *        stop_loop を呼んで古いジョブを消してから始めるが、2 つのプロセスが
 *        同時に走ると、後発の stop_loop が先発の PID ファイル書き込みより先に
 *        走り、どちらも生き残る。実測でデスクトップ通知 2 回 / Slack 2 通になった。
 *        共通フックとプロジェクトフックの併用は普通の構成なので、テンプレート側が
 *        これに耐える必要がある。
 * Feature: .claude/hooks/notify-repeat.sh（start 経路）
 * Fixed by: stop_loop から PID ファイル書き込みまでを、PIDDIR 配下の
 *           <key>.lock（mkdir の原子性）でプロジェクト単位の排他区間にした。
 *           取れなければ短くリトライし、上限を超えたらロック無しで続行する
 *           （通知を落とすより出す方がまし）。古いロックは残骸として取り除く。
 *
 * 競合の再現方法:
 *   stop_loop と PID ファイル書き込みの間で notify-repeat.sh は uname -s を
 *   呼ぶ。この uname スタブを 0.5 秒遅らせることで「両方が stop_loop を通過
 *   してからどちらも PID ファイルを書く」状態を毎回確実に作る。実機のタイミング
 *   任せにすると半々でしか再現せず、回帰検知として役に立たないため。
 *
 * 2026-09-01-003 と同じスタブ方式（uname / alerter / curl を PATH で差し替え、
 * CLAUDE_NOTIFY_PIDDIR でテストごとに隔離）を使う。curl をスタブにしているため、
 * 本テストから実際の Slack へは 1 通も送信されない。
 *
 * @category 回帰
 * @priority 🔴 critical
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { spawn, spawnSync } from 'child_process'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const HOOK = path.join(ROOT, '.claude/hooks/notify.sh')
const REPEAT_HOOK = path.join(ROOT, '.claude/hooks/notify-repeat.sh')

// PATH 依存のコマンド解決を避けるため絶対パスで起動する
const BASH_BIN = '/bin/bash'

/** notify-repeat.sh がロック取得を諦めてロック無しで続行するまでの上限（秒） */
const LOCK_WAIT_MAX_SEC = 3

interface Stub {
  dir: string
  log: string
  piddir: string
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
 * スタブ環境を作る。uname は Darwin を返す（ubuntu の CI でも macOS 経路を通す）が、
 * 競合の窓を確実に再現するため 0.5 秒待ってから返す（冒頭コメント参照）。
 * alerter / osascript / afplay / curl は呼び出しをログへ追記する。
 * curl をスタブにしているので実 Slack へは送信されない。
 */
function makeStubEnv(): Stub {
  const dir = sh(`
    set -eu
    dir=$(mktemp -d)
    mkdir -p "$dir/bin" "$dir/piddir"

    cat > "$dir/bin/uname" <<'EOF'
#!/bin/sh
sleep 0.5
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

  return { dir, log: path.join(dir, 'calls.log'), piddir: path.join(dir, 'piddir') }
}

/**
 * スタブ環境で通知フックを動かすための環境変数。
 * Slack を到達可能にするため Webhook を明示的に与える（送信先はスタブの curl）。
 * 同時起動の検証なので、Stop の遅延はフルスイート実行時の spawn の遅れを
 * 吸収できる長さにする（遅延中に後発が先発を破棄する、が期待動作）。
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
    CLAUDE_NOTIFY_STOP_DELAY: '6',
    // PID ディレクトリはテストごとに分ける（回帰 2026-09-01-006）。
    // ロックもこの配下に作られるため、テスト間でロックが衝突することもない
    CLAUDE_NOTIFY_PIDDIR: stub.piddir,
  }
}

/**
 * notify.sh を非同期に起動し、終了コードで解決する Promise を返す。
 * 同時起動を再現するため spawnSync ではなく spawn を使う
 * （spawnSync だと 1 本目が終わるまで 2 本目が始まらない）。
 */
function launchHook(payload: unknown, env: Record<string, string>): Promise<number | null> {
  return new Promise((resolve) => {
    const child = spawn(BASH_BIN, [HOOK], {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'ignore', 'ignore'],
    })
    child.on('error', () => resolve(null))
    child.on('close', (code) => resolve(code))
    child.stdin.end(JSON.stringify(payload))
  })
}

function readLog(stub: Stub): string {
  return sh('cat "$1" 2>/dev/null || true', [stub.log])
}

/** 実際に画面へ出た通知の行（--remove は数えない） */
function fireLines(log: string): string[] {
  return log.split('\n').filter((l) => l.startsWith('alerter ') && !l.includes('--remove'))
}

function fireCount(log: string): number {
  return fireLines(log).length
}

/** 指定した alerter グループ（＝プロジェクトのキー）で出た通知の回数 */
function fireCountForGroup(log: string, key: string): number {
  return fireLines(log).filter((l) => l.includes(` --group ${key} `)).length
}

function slackCount(log: string): number {
  return log.split('\n').filter((l) => l === 'curl').length
}

/** 通知が min 回出るまで待ってからログを返す（固定待ちより早く抜けるため） */
async function waitForFire(stub: Stub, min: number, maxMs: number): Promise<string> {
  const deadline = Date.now() + maxMs
  for (;;) {
    const log = readLog(stub)
    if (fireCount(log) >= min || Date.now() >= deadline) return log
    await wait(100)
  }
}

/** そのプロジェクトの PID ファイル・ロック名に使われるキー */
function keyFor(projectDir: string): string {
  return spawnSync(BASH_BIN, [REPEAT_HOOK, 'key', projectDir], {
    encoding: 'utf8',
    timeout: 30_000,
  }).stdout.trim()
}

function lockDirFor(stub: Stub, projectDir: string): string {
  return path.join(stub.piddir, `${keyFor(projectDir)}.lock`)
}

/** ディレクトリの存在判定はシェルに任せる（fs の動的パス参照を避けるため） */
function exists(target: string): boolean {
  return spawnSync(BASH_BIN, ['-c', 'test -e "$1"', 'sh', target], { timeout: 30_000 }).status === 0
}

/** PID ディレクトリに残っている *.lock の一覧 */
function leftoverLocks(stub: Stub): string[] {
  return sh('ls -d "$1"/*.lock 2>/dev/null || true', [stub.piddir]).split('\n').filter(Boolean)
}

/**
 * スタブ環境を用意してテスト本体を実行し、必ず後始末する。
 * 各テストは自分専用の一時ディレクトリとプロジェクトキーを使うため互いに
 * 干渉しない。後始末は stop-all で自分の PID ディレクトリだけを対象にする。
 */
async function withStub(body: (stub: Stub) => Promise<void>): Promise<void> {
  const stub = makeStubEnv()
  try {
    await body(stub)
  } finally {
    spawnSync(BASH_BIN, [REPEAT_HOOK, 'stop-all'], {
      timeout: 60_000,
      env: { ...process.env, CLAUDE_NOTIFY_PIDDIR: stub.piddir },
    })
    sh('rm -rf "$1"', [stub.dir])
  }
}

const STOP_PAYLOAD = { hook_event_name: 'Stop', cwd: '/Users/example/my-app' }

describe.concurrent(
  'Regression: 2026-09-03-001 - 同じプロジェクトの通知が同時に 2 回起動されると二重に出る',
  () => {
    it('同じプロジェクトを同時に 2 回起動しても、デスクトップ通知 1 回・Slack 1 通である', async () => {
      await withStub(async (stub) => {
        const project = '/Users/example/concurrent-same'
        const env = envFor(stub, project)

        // 共通フックとプロジェクトフックが同じ Stop で同時に起動した状態
        const codes = await Promise.all([
          launchHook(STOP_PAYLOAD, env),
          launchHook(STOP_PAYLOAD, env),
        ])
        expect(codes).toEqual([0, 0])

        // 起動側は両方とも終わっている（＝排他区間を抜けている）ので、ロックは残らない
        expect(leftoverLocks(stub)).toEqual([])

        // 1 回目が出てから、二重なら直後に出るはずの 2 回目を待ってから数える
        await waitForFire(stub, 1, 20_000)
        await wait(3000)

        const log = readLog(stub)
        expect(fireCount(log)).toBe(1)
        expect(slackCount(log)).toBe(1)
      })
    }, 40_000)

    it('別プロジェクトを同時に起動した場合は、それぞれ 1 回ずつ出る（ロックがプロジェクトをまたがない）', async () => {
      await withStub(async (stub) => {
        const projectA = '/Users/example/concurrent-other-a'
        const projectB = '/Users/example/concurrent-other-b'

        const codes = await Promise.all([
          launchHook(STOP_PAYLOAD, envFor(stub, projectA)),
          launchHook(STOP_PAYLOAD, envFor(stub, projectB)),
        ])
        expect(codes).toEqual([0, 0])
        expect(leftoverLocks(stub)).toEqual([])

        await waitForFire(stub, 2, 20_000)
        await wait(3000)

        const log = readLog(stub)
        expect(fireCountForGroup(log, keyFor(projectA))).toBe(1)
        expect(fireCountForGroup(log, keyFor(projectB))).toBe(1)
        expect(fireCount(log)).toBe(2)
        expect(slackCount(log)).toBe(2)
      })
    }, 40_000)

    it('古いロックが残骸として残っていても通知は出て、残骸は取り除かれる', async () => {
      await withStub(async (stub) => {
        const project = '/Users/example/stale-lock'
        const env = { ...envFor(stub, project), CLAUDE_NOTIFY_STOP_DELAY: '1' }
        const lock = lockDirFor(stub, project)

        // 異常終了で残った古いロック（作成時刻を過去にする）
        sh('mkdir -p "$1" && touch -t 202001010000 "$1"', [lock])
        expect(exists(lock)).toBe(true)

        expect(await launchHook(STOP_PAYLOAD, env)).toBe(0)

        const log = await waitForFire(stub, 1, 15_000)
        expect(fireCount(log)).toBe(1)
        expect(slackCount(log)).toBe(1)
        // 残骸は取り除かれ、自分のロックも解放されている
        expect(exists(lock)).toBe(false)
      })
    }, 40_000)

    it('新しいロックに居座られていても、上限を過ぎたらロック無しで通知を出す（他人のロックは消さない）', async () => {
      await withStub(async (stub) => {
        const project = '/Users/example/held-lock'
        const env = { ...envFor(stub, project), CLAUDE_NOTIFY_STOP_DELAY: '1' }
        const lock = lockDirFor(stub, project)

        // 別プロセスが取得中のロック（作成したばかりなので残骸ではない）
        sh('mkdir -p "$1"', [lock])

        const started = Date.now()
        expect(await launchHook(STOP_PAYLOAD, env)).toBe(0)
        // 待つのは上限まで。永久に待って通知を落とす方向に倒れてはいけない
        expect(Date.now() - started).toBeLessThan((LOCK_WAIT_MAX_SEC + 10) * 1000)

        const log = await waitForFire(stub, 1, 15_000)
        expect(fireCount(log)).toBe(1)
        expect(slackCount(log)).toBe(1)
        // 自分のものではないロックには触らない
        expect(exists(lock)).toBe(true)
      })
    }, 40_000)

    it('冒頭のコメントに、ロックが要る理由（共通フックとプロジェクトフックの二重起動）が残っている', () => {
      const src = readFileSync(REPEAT_HOOK, 'utf8')
      const header = src.split('\nset -u')[0] ?? ''

      expect(header).toContain('.lock')
      expect(header).toMatch(/共通フック/)
      expect(header).toMatch(/二重|2 回|2回/)
    })
  }
)
