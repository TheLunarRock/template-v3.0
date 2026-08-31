/**
 * 通知フック（Stop / Notification）の判定検証。
 *
 * claude.ai は作業が止まると通知を出すが、エディタ内の Claude Code は既定では
 * 無音のため、作業完了・承認待ち・無応答を見逃す実害があった。テンプレート同梱の
 * .claude/hooks/notify.sh がその通知を担う。本テストは以下を保証する。
 *
 * - Stop / Notification それぞれで正しい文言・サウンドが選ばれる
 * - クリップボードには一切触れない（報告を pbcopy で受け渡す運用と衝突し、
 *   Stop フックが後から上書きして報告を壊すため廃止。回帰 2026-09-01-004）
 * - 待機（idle_prompt）では通知しない（Slack が積み上がるため。回帰 2026-09-01-002）
 * - 対象外イベント・壊れた入力では何もしない
 * - 通知専用フックとして、いかなる入力でも作業をブロックしない（常に exit 0）
 * - 繰り返し通知のループがプロジェクト単位で分離される（並行作業中に混線しない）
 * - セッションが終了していればループを起動しない（エディタを閉じた後に鳴り続けない）
 *
 * 判定のみを検証するため CLAUDE_NOTIFY_DRY_RUN=1 で実行する
 * （osascript / afplay / Slack 送信の副作用は起こさない）。
 *
 * 仕様: SPECIFICATION.md §11
 *
 * @category ユニット
 * @priority 🟡 important
 */

import { describe, it, expect, afterAll } from 'vitest'
import { spawnSync } from 'child_process'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const HOOK = path.join(ROOT, '.claude/hooks/notify.sh')
const REPEAT_HOOK = path.join(ROOT, '.claude/hooks/notify-repeat.sh')
const STOP_HOOK = path.join(ROOT, '.claude/hooks/notify-stop.sh')

// PATH 依存のコマンド解決を避けるため絶対パスで起動する
const BASH_BIN = '/bin/bash'

interface HookResult {
  status: number | null
  /** 1行目: OK | SKIP */
  kind: string
  title: string
  message: string
  sound: string
}

/** 通知フックにペイロードを渡し、判定結果を構造化して返す */
function runHook(payload: unknown, env: Record<string, string> = {}): HookResult {
  const result = spawnSync(BASH_BIN, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 30_000,
    env: { ...process.env, CLAUDE_NOTIFY_DRY_RUN: '1', ...env },
  })
  const lines = result.stdout.split('\n')
  return {
    status: result.status,
    kind: lines[0] ?? '',
    title: lines[1] ?? '',
    message: lines[2] ?? '',
    sound: lines[3] ?? '',
  }
}

const CWD = '/Users/example/Documents/GitHub/my-app'

describe('Stop: 作業完了の通知', () => {
  it('プロジェクト名つきの文言とサウンドを選ぶ', () => {
    const r = runHook({ hook_event_name: 'Stop', cwd: CWD })

    expect(r.kind).toBe('OK')
    expect(r.title).toContain('my-app')
    expect(r.message).toBe('作業が終わりました')
    expect(r.sound).toBe('Glass')
  })

  // 報告は呼び出し側が pbcopy で受け渡す。フックが last_assistant_message を
  // クリップボードへ入れると、その報告を後から上書きして壊す（回帰 2026-09-01-004）。
  it('last_assistant_message があっても文言は変わらず、判定結果にも現れない', () => {
    const report = '実装しました。\n- 引用符 " を含む\n- バックスラッシュ \\ を含む'
    const r = runHook({ hook_event_name: 'Stop', cwd: CWD, last_assistant_message: report })

    expect(r.message).toBe('作業が終わりました')
    expect(r.message).not.toContain('クリップボード')
    expect(r.sound).toBe('Glass')
  })
})

describe('Notification: 止まっている状態の通知', () => {
  it.each([
    ['permission_prompt', '確認待ちで止まっています（ツール使用の承認）'],
    ['elicitation_dialog', '入力を求めて止まっています'],
    ['elicitation_url_dialog', 'URL の入力を求めて止まっています'],
    ['agent_needs_input', 'サブエージェントが入力を待っています'],
  ])('%s に専用の文言を出す', (notificationType, expected) => {
    const r = runHook({
      hook_event_name: 'Notification',
      cwd: CWD,
      notification_type: notificationType,
    })

    expect(r.kind).toBe('OK')
    expect(r.message).toBe(expected)
    expect(r.sound).toBe('Ping')
  })

  it('未知の種別では message にフォールバックし、本文を1行に正規化する', () => {
    const r = runHook({
      hook_event_name: 'Notification',
      cwd: CWD,
      notification_type: 'quota_auto_resume_fired',
      message: 'Quota   resumed\nnow',
    })

    expect(r.kind).toBe('OK')
    expect(r.message).toBe('Quota resumed now')
  })

  it('種別も message も無い場合は既定の文言を出す', () => {
    const r = runHook({ hook_event_name: 'Notification', cwd: CWD })

    expect(r.kind).toBe('OK')
    expect(r.message).toBe('確認待ちで止まっています')
  })

  // 待機は通知しない。Stop で 1 通目が出たあと待つほど発火し、Slack が
  // 積み上がるため（回帰: 2026-09-01-002）。
  it('idle_prompt では通知しない', () => {
    const r = runHook({
      hook_event_name: 'Notification',
      cwd: CWD,
      notification_type: 'idle_prompt',
    })

    expect(r.kind).toBe('SKIP')
  })
})

describe('通知しないケース', () => {
  it.each(['PreToolUse', 'PostToolUse', 'SessionStart'])(
    '対象外イベントでは何もしない: %s',
    (event) => {
      expect(runHook({ hook_event_name: event }).kind).toBe('SKIP')
    }
  )

  it('CLAUDE_NOTIFY_DISABLED=1 で完全に無効化される', () => {
    const r = runHook({ hook_event_name: 'Stop', cwd: CWD }, { CLAUDE_NOTIFY_DISABLED: '1' })

    expect(r.kind).toBe('')
    expect(r.status).toBe(0)
  })
})

describe('通知フックは作業をブロックしない', () => {
  it.each([
    ['正常な Stop', { hook_event_name: 'Stop', cwd: CWD, last_assistant_message: 'done' }],
    [
      '正常な Notification',
      { hook_event_name: 'Notification', notification_type: 'permission_prompt' },
    ],
    [
      '通知しない Notification',
      { hook_event_name: 'Notification', notification_type: 'idle_prompt' },
    ],
    ['対象外イベント', { hook_event_name: 'PreToolUse' }],
    ['空ペイロード', {}],
  ])('%s で exit 0 を返す', (_label, payload) => {
    expect(runHook(payload).status).toBe(0)
  })

  it('壊れた入力でも exit 0 を返し、何も通知しない', () => {
    const result = spawnSync(BASH_BIN, [HOOK], {
      input: 'not json at all',
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, CLAUDE_NOTIFY_DRY_RUN: '1' },
    })

    expect(result.status).toBe(0)
    expect(result.stdout.split('\n')[0]).toBe('SKIP')
  })
})

/**
 * 繰り返し通知は「気付くまで鳴らす」ため、止め忘れると鳴り続ける。
 * 複数リポジトリを並行で動かすので、あるプロジェクトで操作を再開しても
 * 別プロジェクトのループを巻き込んで止めてはならない。
 * キーの生成は notify-repeat.sh に集約されており、その一意性を検証する。
 *
 * 仕様: SPECIFICATION.md §11.10
 */
describe('繰り返し通知: プロジェクト単位の分離', () => {
  /** PID ファイル名に使うキーを取得する */
  function keyFor(dir: string): string {
    const r = spawnSync(BASH_BIN, [REPEAT_HOOK, 'key', dir], {
      encoding: 'utf8',
      timeout: 30_000,
    })
    return r.stdout.trim()
  }

  it('プロジェクトが違えば別のキーになる', () => {
    expect(keyFor('/Users/example/GitHub/app-a')).not.toBe(keyFor('/Users/example/GitHub/app-b'))
  })

  it('同じディレクトリなら常に同じキーになる（起動側と停止側でズレない）', () => {
    const dir = '/Users/example/GitHub/my-app'

    expect(keyFor(dir)).toBe(keyFor(dir))
  })

  it('同名でもパスが違えば衝突しない', () => {
    expect(keyFor('/Users/example/GitHub/my-app')).not.toBe(keyFor('/Users/example/work/my-app'))
  })

  it('キーはプロジェクト名を含み、ファイル名として安全な文字だけで構成される', () => {
    const key = keyFor('/Users/example/GitHub/my-app')

    expect(key).toContain('my-app')
    expect(key).toMatch(/^[A-Za-z0-9._-]+$/)
  })
})

describe('繰り返し通知: フックは作業をブロックしない', () => {
  it('稼働中のループが無くても停止フックは exit 0 を返す', () => {
    const r = spawnSync(BASH_BIN, [STOP_HOOK], {
      encoding: 'utf8',
      timeout: 30_000,
      // 存在しないプロジェクトを指しても落ちないこと
      env: { ...process.env, CLAUDE_PROJECT_DIR: '/Users/example/no-such-project-for-test' },
    })

    expect(r.status).toBe(0)
  })

  it.each(['', 'bogus'])('未知の action では何もせず exit 0 を返す: %s', (action) => {
    const r = spawnSync(BASH_BIN, [REPEAT_HOOK, action, '/Users/example/app'], {
      encoding: 'utf8',
      timeout: 30_000,
    })

    expect(r.status).toBe(0)
  })
})

/**
 * ループはバックグラウンドで動くため、放置するとエディタを閉じた後も鳴り続ける。
 * 実際に「閉じたはずの Cursor の通知が止まらない」事故が起きたため、
 * 呼び出し元セッションの生存を監視し、死んでいれば起動しないことを保証する。
 *
 * 仕様: SPECIFICATION.md §11.10
 */
describe('繰り返し通知: セッションが終了していたら鳴らさない', () => {
  // 実運用の $HOME/.claude/notify-repeat とは共有しない。stop-all はディレクトリ内の
  // 全 PID を kill するため、既定値のままだと並列実行中の別テストの待機ジョブや
  // 開発者の実運用の通知まで巻き添えで消える（回帰 2026-09-01-006）。
  const PIDDIR = spawnSync(BASH_BIN, ['-c', 'mktemp -d'], {
    encoding: 'utf8',
    timeout: 30_000,
  }).stdout.trim()

  afterAll(() => {
    spawnSync(BASH_BIN, ['-c', 'rm -rf "$1"', 'sh', PIDDIR], { timeout: 30_000 })
  })

  /** 起動を試み、PID ファイルが作られたかどうかを返す */
  function tryStart(env: Record<string, string>, dir: string): boolean {
    spawnSync(BASH_BIN, [REPEAT_HOOK, 'start', dir, 'テスト', '本文', 'Ping', '60', '1'], {
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, CLAUDE_NOTIFY_PIDDIR: PIDDIR, ...env },
    })
    const key = spawnSync(BASH_BIN, [REPEAT_HOOK, 'key', dir], {
      encoding: 'utf8',
      timeout: 30_000,
    }).stdout.trim()
    const pidfile = path.join(PIDDIR, `${key}.pid`)
    // fs の動的パス参照を避け、判定はシェルに任せる
    const existed =
      spawnSync(BASH_BIN, ['-c', 'test -f "$1"', 'sh', pidfile], { timeout: 30_000 }).status === 0
    // 後始末（万一起動していた場合に鳴らし続けないため）
    spawnSync(BASH_BIN, [REPEAT_HOOK, 'stop', dir], {
      timeout: 30_000,
      env: { ...process.env, CLAUDE_NOTIFY_PIDDIR: PIDDIR },
    })
    return existed
  }

  it('監視対象のセッションが既に終了していれば起動しない', () => {
    // 存在しない PID を監視対象にする＝エディタを閉じた後と同じ状態
    const started = tryStart({ CLAUDE_NOTIFY_WATCH_PID: '999999' }, '/Users/example/closed-session')

    expect(started).toBe(false)
  })

  it('CI では起動しない', () => {
    const started = tryStart(
      { CI: 'true', CLAUDE_NOTIFY_WATCH_PID: String(process.pid) },
      '/Users/example/ci-session'
    )

    expect(started).toBe(false)
  })

  it('CLAUDE_NOTIFY_DISABLED=1 では起動しない', () => {
    const started = tryStart(
      { CLAUDE_NOTIFY_DISABLED: '1', CLAUDE_NOTIFY_WATCH_PID: String(process.pid) },
      '/Users/example/disabled-session'
    )

    expect(started).toBe(false)
  })

  it('stop-all は稼働中のループが無くても exit 0 を返す', () => {
    // 既定の PIDDIR を向けると実運用の通知まで消えるため、必ず専用ディレクトリを渡す
    const r = spawnSync(BASH_BIN, [REPEAT_HOOK, 'stop-all'], {
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, CLAUDE_NOTIFY_PIDDIR: PIDDIR },
    })

    expect(r.status).toBe(0)
  })
})
