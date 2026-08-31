/**
 * Bug ID: 2026-09-01-001
 * Date: 2026-09-01
 * Issue: cf8a5ba で入れた繰り返し通知が実運用で邪魔になっていた。作業完了のたびに
 *        最大 10 回 × 15 秒＝2 分 30 秒鳴り続け、バナーをバツ印で消しても止まらない。
 *        osascript の display notification はディスミスをコールバックしないため、
 *        停止経路が「次のプロンプト送信」か「次のツール実行」しか無かった。
 *        2026-08-31 の実機検証で alerter が
 *        activationType "closed"（バツ印）/ "timeout"（放置）を返して
 *        ブロックすることを確認したため、繰り返す必要が無くなった。
 * Feature: .claude/hooks/notify-repeat.sh（notify.sh から委譲される通知の発行）
 * Fixed by: alerter があれば「消すまで残る通知」を 1 回だけ出し、無ければ従来の
 *           繰り返しループにフォールバックする二経路構成に変更。停止は
 *           alerter --remove <group> と PID kill の両方を行う。
 *
 * テンプレートは友人に配られるため brew install を前提にできない。
 * したがって「alerter がある経路」と「無い経路」の両方を保証する必要がある。
 *
 * 実機の alerter 有無・OS に依存しないよう、uname / alerter / osascript / afplay を
 * PATH のスタブで差し替えて検証する（CI は ubuntu のため uname も差し替える）。
 *
 * @category 回帰
 * @priority 🔴 critical
 */

import { describe, it, expect, afterEach } from 'vitest'
import { spawnSync } from 'child_process'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const HOOK = path.join(ROOT, '.claude/hooks/notify.sh')
const REPEAT_HOOK = path.join(ROOT, '.claude/hooks/notify-repeat.sh')
const STOP_HOOK = path.join(ROOT, '.claude/hooks/notify-stop.sh')

// PATH 依存のコマンド解決を避けるため絶対パスで起動する
const BASH_BIN = '/bin/bash'

/** 後始末対象（スタブ環境の一時ディレクトリと、起動した通知のプロジェクト） */
const cleanups: (() => void)[] = []

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.()
  }
})

/** シェルスクリプトを実行して stdout を返す（fs の動的パス参照を避けるため） */
function sh(script: string, args: string[] = [], env: Record<string, string> = {}): string {
  const r = spawnSync(BASH_BIN, ['-c', script, 'sh', ...args], {
    encoding: 'utf8',
    timeout: 30_000,
    env: { ...process.env, ...env },
  })
  return r.stdout
}

/**
 * スタブ環境を作る。
 *
 * uname は Darwin を返し（ubuntu の CI でも macOS 経路を通す）、
 * alerter / osascript / afplay は呼び出しを CLAUDE_TEST_LOG に追記する。
 * alerter スタブは本物と同じくブロックする（前景で呼んでいたら気付けるように）。
 */
function makeStubEnv(options: { withAlerter: boolean }): { dir: string; log: string } {
  const dir = sh(
    `
    set -eu
    dir=$(mktemp -d)
    mkdir -p "$dir/bin"

    cat > "$dir/bin/uname" <<'EOF'
#!/bin/sh
echo Darwin
EOF

    cat > "$dir/bin/osascript" <<'EOF'
#!/bin/sh
printf 'osascript\n' >> "$CLAUDE_TEST_LOG"
EOF

    cat > "$dir/bin/afplay" <<'EOF'
#!/bin/sh
printf 'afplay\n' >> "$CLAUDE_TEST_LOG"
EOF

    if [ "$1" = "with-alerter" ]; then
      cat > "$dir/bin/alerter" <<'EOF'
#!/bin/sh
printf 'alerter %s\n' "$*" >> "$CLAUDE_TEST_LOG"
case " $* " in
  *" --remove "*) exit 0 ;;
esac
# 本物の alerter は通知が消されるまでブロックする。前景で呼ばれていたら
# フックが返らなくなるため、その退行をテストから検出できるようにする。
sleep 5
EOF
    fi

    chmod +x "$dir/bin/"*
    printf '%s' "$dir"
  `,
    [options.withAlerter ? 'with-alerter' : 'no-alerter']
  ).trim()

  cleanups.push(() => {
    sh('rm -rf "$1"', [dir])
  })

  return { dir, log: path.join(dir, 'calls.log') }
}

/** スタブ環境で通知フックを動かすための環境変数 */
function envFor(stub: { dir: string; log: string }, projectDir: string): Record<string, string> {
  return {
    PATH: `${path.join(stub.dir, 'bin')}:${process.env.PATH ?? ''}`,
    CLAUDE_TEST_LOG: stub.log,
    CLAUDE_PROJECT_DIR: projectDir,
    // 監視対象を生きているプロセスにする（セッション終了扱いで弾かれないように）
    CLAUDE_NOTIFY_WATCH_PID: String(process.pid),
    // CI では通知しない仕様のため、検証時は明示的に外す
    CI: '',
    CLAUDE_NOTIFY_DISABLED: '',
  }
}

/** 通知フックにペイロードを渡す。戻るまでの所要時間も返す（前景呼び出しの検出用） */
function runHook(
  payload: unknown,
  env: Record<string, string>
): { status: number | null; elapsedMs: number } {
  const startedAt = Date.now()
  const r = spawnSync(BASH_BIN, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 30_000,
    env: { ...process.env, ...env },
  })
  return { status: r.status, elapsedMs: Date.now() - startedAt }
}

/** ログに pattern が現れるまで待ってから全文を返す */
function waitForLog(log: string, pattern: string): string {
  return sh(
    `
    for _ in $(seq 1 100); do
      if grep -qE -e "$2" "$1" 2>/dev/null; then break; fi
      sleep 0.05
    done
    cat "$1" 2>/dev/null || true
  `,
    [log, pattern]
  )
}

/** 起動した通知を確実に止める（PID ファイルを残さない） */
function stopFor(projectDir: string, env: Record<string, string> = {}): void {
  spawnSync(BASH_BIN, [REPEAT_HOOK, 'stop', projectDir], {
    timeout: 30_000,
    env: { ...process.env, ...env },
  })
}

/** PID ファイル名にも使われるグループ ID */
function keyFor(dir: string): string {
  return spawnSync(BASH_BIN, [REPEAT_HOOK, 'key', dir], {
    encoding: 'utf8',
    timeout: 30_000,
  }).stdout.trim()
}

const STOP_PAYLOAD = { hook_event_name: 'Stop', cwd: '/Users/example/my-app' }

describe('Regression: 2026-09-01-001 - 繰り返し通知をバツ印で消せない', () => {
  it('alerter があれば繰り返しループを起動せず alerter を 1 回だけ呼ぶ', () => {
    const project = '/Users/example/regress-alerter-once'
    const stub = makeStubEnv({ withAlerter: true })
    const env = envFor(stub, project)
    cleanups.push(() => stopFor(project, env))

    runHook(STOP_PAYLOAD, env)
    const log = waitForLog(stub.log, 'alerter')

    const alerterCalls = log.split('\n').filter((l) => l.startsWith('alerter '))
    expect(alerterCalls).toHaveLength(1)
    // 繰り返し方式（osascript + afplay のループ）は起動していないこと
    expect(log).not.toMatch(/^osascript$/m)
  })

  it('alerter 経路では消すまで残る通知として発行する（--group と --timeout を渡す）', () => {
    const project = '/Users/example/regress-alerter-args'
    const stub = makeStubEnv({ withAlerter: true })
    const env = envFor(stub, project)
    cleanups.push(() => stopFor(project, env))

    runHook(STOP_PAYLOAD, env)
    const log = waitForLog(stub.log, 'alerter')

    // グループ ID は PID ファイルと同じキー生成を流用する（起動側と停止側でズレない）
    expect(log).toContain(`--group ${keyFor(project)}`)
    expect(log).toMatch(/--timeout \d+/)
    expect(log).toContain('--sound Glass')
  })

  it('alerter を前景で呼ばない（ブロックする通知でもフックは即座に返る）', () => {
    const project = '/Users/example/regress-alerter-async'
    const stub = makeStubEnv({ withAlerter: true })
    const env = envFor(stub, project)
    cleanups.push(() => stopFor(project, env))

    const r = runHook(STOP_PAYLOAD, env)

    // スタブは 5 秒ブロックする。前景で呼んでいれば必ずここを超える
    expect(r.elapsedMs).toBeLessThan(4000)
    expect(r.status).toBe(0)
  })

  it('alerter が無ければ従来の繰り返し方式にフォールバックする', () => {
    const project = '/Users/example/regress-fallback'
    const stub = makeStubEnv({ withAlerter: false })
    const env = {
      ...envFor(stub, project),
      // 実機に alerter が入っていてもフォールバック経路を通す
      CLAUDE_NOTIFY_ALERTER: 'none',
      CLAUDE_NOTIFY_INTERVAL: '1',
      CLAUDE_NOTIFY_MAX: '1',
    }
    cleanups.push(() => stopFor(project, env))

    runHook(STOP_PAYLOAD, env)
    const log = waitForLog(stub.log, 'osascript')

    expect(log).toMatch(/^osascript$/m)
    expect(log).not.toContain('alerter ')
  })

  it('停止フックは alerter --remove にグループ ID を渡して通知を消す', () => {
    const project = '/Users/example/regress-alerter-remove'
    const stub = makeStubEnv({ withAlerter: true })
    const env = envFor(stub, project)
    cleanups.push(() => stopFor(project, env))

    runHook(STOP_PAYLOAD, env)
    waitForLog(stub.log, 'alerter')

    const stopped = spawnSync(BASH_BIN, [STOP_HOOK], {
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, ...env },
    })
    const log = waitForLog(stub.log, '--remove')

    expect(stopped.status).toBe(0)
    expect(log).toContain(`--remove ${keyFor(project)}`)
  })

  it('グループ ID はプロジェクト単位で一意（別リポジトリの通知を消さない）', () => {
    expect(keyFor('/Users/example/GitHub/app-a')).not.toBe(keyFor('/Users/example/GitHub/app-b'))
    expect(keyFor('/Users/example/GitHub/my-app')).not.toBe(keyFor('/Users/example/work/my-app'))
  })

  it('CLAUDE_NOTIFY_DRY_RUN の 5 行フォーマットは両経路で変わらない', () => {
    const withAlerter = spawnSync(BASH_BIN, [HOOK], {
      input: JSON.stringify(STOP_PAYLOAD),
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, CLAUDE_NOTIFY_DRY_RUN: '1' },
    }).stdout
    const withoutAlerter = spawnSync(BASH_BIN, [HOOK], {
      input: JSON.stringify(STOP_PAYLOAD),
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, CLAUDE_NOTIFY_DRY_RUN: '1', CLAUDE_NOTIFY_ALERTER: 'none' },
    }).stdout

    expect(withAlerter).toBe(withoutAlerter)
    expect(withAlerter.split('\n').slice(0, 4)).toEqual([
      'OK',
      '✅ Claude Code — my-app',
      '作業が終わりました',
      'Glass',
    ])
  })
})
