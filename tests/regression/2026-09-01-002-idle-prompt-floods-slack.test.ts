/**
 * Bug ID: 2026-09-01-002
 * Date: 2026-09-01
 * Issue: 作業が終わったあと、スマホに Slack 通知が連続で数通届いていた。
 *        `.claude/settings.json` の Notification マッチャーに `idle_prompt` が
 *        含まれていたため、Stop で 1 通目が飛んだあと、待機し続けるたびに
 *        idle_prompt が発火して 2 通目・3 通目と積み上がっていた。
 *        デスクトップ通知は `alerter --group <プロジェクトキー>` で上書きされ
 *        1 枚に見えるが、Slack は履歴なので全部残る。あわせて Stop の
 *        「作業が終わりました」が idle_prompt の「応答がないまま止まっています」
 *        に化ける問題もあった。
 * Feature: .claude/settings.json の Notification フック / .claude/hooks/notify.sh
 * Fixed by: マッチャーから idle_prompt を外し、通知を「作業完了（Stop）」と
 *           「承認待ち（permission_prompt 等）」の 2 種類だけにした。
 *           マッチャーをすり抜けて呼ばれた場合の保険として notify.sh 側でも弾く。
 *           あわせて検証時に実 Slack を飛ばさないための
 *           CLAUDE_NOTIFY_NO_SLACK=1 を追加した。
 *
 * idle を落としても運用は成立する。Stop の通知は消すまで画面に残るため、
 * それを見てプロジェクトへ移動して入力すれば UserPromptSubmit で消える。
 * 「通知が残っている＝未着手」が成り立つ。
 *
 * permission_prompt / agent_needs_input は Stop では発火せず、放置すると
 * エージェントが止まったまま進まないため、絶対に外してはならない。
 * これらは繰り返し発火しないので通知が積み上がる原因にもならない。
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

// PATH 依存のコマンド解決を避けるため絶対パスで起動する
const BASH_BIN = '/bin/bash'

interface HookEntry {
  matcher?: string
  hooks?: { type?: string; command?: string }[]
}

const settings = JSON.parse(readFileSync(path.join(ROOT, '.claude/settings.json'), 'utf8')) as {
  hooks?: Record<string, HookEntry[]>
}

/** notify.sh を登録している Notification エントリのマッチャー */
const notificationMatcher: string = (settings.hooks?.Notification ?? [])
  .filter((e) => (e.hooks ?? []).some((h) => (h.command ?? '').includes('notify.sh')))
  .map((e) => e.matcher ?? '')
  .join('|')

/** notify.sh にペイロードを渡し、判定結果の1行目（OK | SKIP）を返す */
function judge(payload: unknown): { kind: string; message: string; status: number | null } {
  const r = spawnSync(BASH_BIN, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 30_000,
    env: { ...process.env, CLAUDE_NOTIFY_DRY_RUN: '1' },
  })
  const lines = r.stdout.split('\n')
  return { kind: lines[0] ?? '', message: lines[2] ?? '', status: r.status }
}

const CWD = '/Users/example/my-app'

describe('Regression: 2026-09-01-002 - idle_prompt が Slack 通知を積み上げる', () => {
  it('Notification マッチャーに idle_prompt が含まれていない', () => {
    expect(notificationMatcher).not.toContain('idle_prompt')
  })

  it.each([
    'permission_prompt',
    'elicitation_dialog',
    'elicitation_url_dialog',
    'agent_needs_input',
  ])('承認待ち系は外さない: %s', (type) => {
    expect(notificationMatcher).toContain(type)
  })

  it('notify.sh は idle_prompt では通知を出さない（マッチャーすり抜けの保険）', () => {
    const r = judge({
      hook_event_name: 'Notification',
      notification_type: 'idle_prompt',
      cwd: CWD,
    })

    expect(r.kind).toBe('SKIP')
    expect(r.status).toBe(0)
  })

  it('作業完了（Stop）は通知する', () => {
    const r = judge({ hook_event_name: 'Stop', cwd: CWD })

    expect(r.kind).toBe('OK')
    expect(r.message).toContain('作業が終わりました')
  })

  it('承認待ち（permission_prompt）は通知する', () => {
    const r = judge({
      hook_event_name: 'Notification',
      notification_type: 'permission_prompt',
      cwd: CWD,
    })

    expect(r.kind).toBe('OK')
    expect(r.message).toContain('確認待ち')
  })
})

/**
 * 動作確認で notify.sh を直接叩くと 1 回ごとに実際の Slack が飛ぶ。
 * 今回スマホが鳴った引き金のひとつがこれだったため、送信だけを止める
 * 逃げ道を用意する。デスクトップ通知の仕組みには手を入れない。
 */
describe('Regression: 2026-09-01-002 - CLAUDE_NOTIFY_NO_SLACK で送信を止められる', () => {
  /**
   * curl を差し替えた環境で notify.sh を実行し、curl が呼ばれたかを返す。
   * uname は Linux を返させてデスクトップ通知経路を通さない
   * （テスト実行中に実際の通知を出さないため）。
   *
   * Slack 送信は notify-repeat.sh のバックグラウンドジョブへ移った
   * （キャンセル時に Slack だけ飛ぶのを防ぐため。2026-09-01-003）。
   * 同期的には観測できないので、Stop の遅延を 0 にしたうえで少し待つ。
   */
  function slackAttempted(env: Record<string, string>): boolean {
    const setup = spawnSync(
      BASH_BIN,
      [
        '-c',
        `
    set -eu
    dir=$(mktemp -d)
    mkdir -p "$dir/bin"
    cat > "$dir/bin/curl" <<'EOF'
#!/bin/sh
printf 'curl\\n' >> "$CLAUDE_TEST_LOG"
EOF
    cat > "$dir/bin/uname" <<'EOF'
#!/bin/sh
echo Linux
EOF
    chmod +x "$dir/bin/"*
    printf '%s' "$dir"
  `,
      ],
      { encoding: 'utf8', timeout: 30_000 }
    )
    const dir = setup.stdout.trim()
    const log = path.join(dir, 'calls.log')

    spawnSync(BASH_BIN, [HOOK], {
      input: JSON.stringify({ hook_event_name: 'Stop', cwd: CWD }),
      encoding: 'utf8',
      timeout: 30_000,
      env: {
        ...process.env,
        PATH: `${path.join(dir, 'bin')}:${process.env.PATH ?? ''}`,
        CLAUDE_TEST_LOG: log,
        // 実在しない Webhook。curl はスタブなので送信は起こらない
        CLAUDE_NOTIFY_WEBHOOK: 'https://example.invalid/hook',
        CI: '',
        CLAUDE_NOTIFY_DISABLED: '',
        // 遅延は本テストの関心ではないので即時にする
        CLAUDE_NOTIFY_STOP_DELAY: '0',
        // PID ディレクトリはテストごとに分ける。既定の $HOME/.claude/notify-repeat を
        // 共有すると、stop-all がディレクトリ内の全 PID を kill する仕様のせいで
        // 並列実行中の別テストや実運用の通知を巻き添えにする（回帰 2026-09-01-006）。
        CLAUDE_NOTIFY_PIDDIR: path.join(dir, 'piddir'),
        ...env,
      },
    })

    // fs の動的パス参照を避け、判定はシェルに任せる。
    // 送信は非同期なので、現れるまで最大 3 秒待つ。
    const called =
      spawnSync(
        BASH_BIN,
        [
          '-c',
          `
      for _ in $(seq 1 60); do
        if grep -q curl "$1" 2>/dev/null; then exit 0; fi
        sleep 0.05
      done
      exit 1
    `,
          'sh',
          log,
        ],
        { timeout: 30_000 }
      ).status === 0
    spawnSync(BASH_BIN, ['-c', 'rm -rf "$1"', 'sh', dir], { timeout: 30_000 })
    return called
  }

  it('既定では Slack へ送信する', () => {
    expect(slackAttempted({})).toBe(true)
  })

  it('CLAUDE_NOTIFY_NO_SLACK=1 なら送信しない', () => {
    expect(slackAttempted({ CLAUDE_NOTIFY_NO_SLACK: '1' })).toBe(false)
  })
})
