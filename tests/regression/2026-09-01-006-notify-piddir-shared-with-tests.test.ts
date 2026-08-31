/**
 * Bug ID: 2026-09-01-006
 * Date: 2026-09-01
 * Issue: 通知フックの PID ディレクトリがテストと実運用で共有されていた。
 *        notify-repeat.sh の PIDDIR は "$HOME/.claude/notify-repeat" 固定で、
 *        stop-all はその中の *.pid を全て読んで kill する（プロジェクト単位ではない）。
 *        vitest はテストファイルを並列実行するため、遅延待ちのジョブが
 *        別ファイルの stop-all に巻き込まれて殺されていた。
 *        CI（ci.yml のテストジョブ）が3プッシュ連続で赤くなり、落ちるのは常に
 *        2026-09-01-003 の「遅延時間が経過すれば通知が出る」で
 *        AssertionError: expected +0 to be 1 だった。
 *        同じ理由で、テストを走らせると開発者の実運用の通知も消えていた。
 * Feature: .claude/hooks/notify-repeat.sh（PID ディレクトリの解決）
 * Fixed by: PIDDIR を環境変数 CLAUDE_NOTIFY_PIDDIR で上書きできるようにし、
 *           通知フックを起動する全テストがテストごとの一時ディレクトリを渡すようにした。
 *
 * 原因はタイミングではなく共有状態のため、タイムアウトを延ばす対処はしていない。
 *
 * @category 回帰
 * @priority 🔴 critical
 */

import { describe, it, expect } from 'vitest'
import { spawnSync } from 'child_process'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const REPEAT_HOOK = path.join(ROOT, '.claude/hooks/notify-repeat.sh')

// PATH 依存のコマンド解決を避けるため絶対パスで起動する
const BASH_BIN = '/bin/bash'

/** 実運用の PID ディレクトリ。テストは絶対にここへ触れてはならない */
const REAL_PIDDIR = path.join(process.env.HOME ?? '', '.claude/notify-repeat')

function sh(script: string, args: string[] = []): string {
  return spawnSync(BASH_BIN, ['-c', script, 'sh', ...args], {
    encoding: 'utf8',
    timeout: 60_000,
  }).stdout
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mkTmp(): string {
  return sh('mktemp -d').trim()
}

function rmTmp(dir: string): void {
  sh('rm -rf "$1"', [dir])
}

/** そのプロジェクトの PID ファイル名に使われるキー */
function keyFor(projectDir: string): string {
  return spawnSync(BASH_BIN, [REPEAT_HOOK, 'key', projectDir], {
    encoding: 'utf8',
    timeout: 30_000,
  }).stdout.trim()
}

/** ファイルの存在判定はシェルに任せる（fs の動的パス参照を避けるため） */
function exists(filePath: string): boolean {
  return (
    spawnSync(BASH_BIN, ['-c', 'test -e "$1"', 'sh', filePath], { timeout: 30_000 }).status === 0
  )
}

function alive(pid: string): boolean {
  if (!pid) return false
  return (
    spawnSync(BASH_BIN, ['-c', 'kill -0 "$1" 2>/dev/null', 'sh', pid], { timeout: 30_000 })
      .status === 0
  )
}

/**
 * 通知ジョブを起動する。alerter は無効化し、遅延を長めに取って
 * 実際の通知を出さないまま待機状態に留める。
 */
function startJob(piddir: string, projectDir: string, delaySec: string): void {
  spawnSync(
    BASH_BIN,
    [REPEAT_HOOK, 'start', projectDir, 'テスト', '本文', 'Ping', '60', '1', delaySec],
    {
      encoding: 'utf8',
      timeout: 30_000,
      env: {
        ...process.env,
        CLAUDE_NOTIFY_PIDDIR: piddir,
        CLAUDE_NOTIFY_ALERTER: 'none',
        CLAUDE_NOTIFY_WATCH_PID: String(process.pid),
        CI: '',
        CLAUDE_NOTIFY_DISABLED: '',
        CLAUDE_NOTIFY_NO_SLACK: '1',
      },
    }
  )
}

describe('Regression: 2026-09-01-006 - 通知の PID ディレクトリがテストと実運用で共有される', () => {
  it('別の PID ディレクトリを指定した stop-all では、稼働中のジョブが生き残る', async () => {
    const mine = mkTmp()
    const other = mkTmp()
    const project = '/Users/example/piddir-survivor'
    try {
      startJob(mine, project, '30')
      await wait(600)

      const pidfile = path.join(mine, `${keyFor(project)}.pid`)
      expect(exists(pidfile)).toBe(true)
      const pid = sh('cat "$1" 2>/dev/null || true', [pidfile]).trim()
      expect(alive(pid)).toBe(true)

      // 無関係な PID ディレクトリに対する stop-all（＝並列実行中の別テスト）
      spawnSync(BASH_BIN, [REPEAT_HOOK, 'stop-all'], {
        timeout: 30_000,
        env: { ...process.env, CLAUDE_NOTIFY_PIDDIR: other },
      })
      await wait(600)

      expect(alive(pid)).toBe(true)
      expect(exists(pidfile)).toBe(true)
    } finally {
      spawnSync(BASH_BIN, [REPEAT_HOOK, 'stop-all'], {
        timeout: 30_000,
        env: { ...process.env, CLAUDE_NOTIFY_PIDDIR: mine },
      })
      rmTmp(mine)
      rmTmp(other)
    }
  }, 30_000)

  it('PID ディレクトリを環境変数で指定したら、実運用のディレクトリにファイルを作らない', async () => {
    const mine = mkTmp()
    const project = '/Users/example/piddir-isolated'
    const realPidfile = path.join(REAL_PIDDIR, `${keyFor(project)}.pid`)
    try {
      startJob(mine, project, '30')
      await wait(600)

      // 指定した側にはできている
      expect(exists(path.join(mine, `${keyFor(project)}.pid`))).toBe(true)
      // 実運用側には一切作られない
      expect(exists(realPidfile)).toBe(false)
    } finally {
      spawnSync(BASH_BIN, [REPEAT_HOOK, 'stop-all'], {
        timeout: 30_000,
        env: { ...process.env, CLAUDE_NOTIFY_PIDDIR: mine },
      })
      rmTmp(mine)
    }
  }, 30_000)
})
