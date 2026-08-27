/**
 * 通知フック（Stop / Notification）の判定検証。
 *
 * claude.ai は作業が止まると通知を出すが、エディタ内の Claude Code は既定では
 * 無音のため、作業完了・承認待ち・無応答を見逃す実害があった。テンプレート同梱の
 * .claude/hooks/notify.sh がその通知を担う。本テストは以下を保証する。
 *
 * - Stop / Notification それぞれで正しい文言・サウンドが選ばれる
 * - Stop の last_assistant_message がクリップボード本文として渡される
 *   （引用符・バックスラッシュ・改行を含んでも壊れない）
 * - 対象外イベント・壊れた入力では何もしない
 * - 通知専用フックとして、いかなる入力でも作業をブロックしない（常に exit 0）
 *
 * 判定のみを検証するため CLAUDE_NOTIFY_DRY_RUN=1 で実行する
 * （osascript / afplay / pbcopy / Slack 送信の副作用は起こさない）。
 *
 * 仕様: SPECIFICATION.md §11
 *
 * @category ユニット
 * @priority 🟡 important
 */

import { describe, it, expect } from 'vitest'
import { spawnSync } from 'child_process'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const HOOK = path.join(ROOT, '.claude/hooks/notify.sh')

// PATH 依存のコマンド解決を避けるため絶対パスで起動する
const BASH_BIN = '/bin/bash'

interface HookResult {
  status: number | null
  /** 1行目: OK | SKIP */
  kind: string
  title: string
  message: string
  sound: string
  /** 5行目以降: クリップボードへ渡される報告本文 */
  clipboard: string
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
  // 5行目以降が報告本文。末尾の空行は出力上の改行なので落とす
  const clipboardLines = lines.slice(4)
  while (clipboardLines.length > 0 && clipboardLines[clipboardLines.length - 1] === '') {
    clipboardLines.pop()
  }
  return {
    status: result.status,
    kind: lines[0] ?? '',
    title: lines[1] ?? '',
    message: lines[2] ?? '',
    sound: lines[3] ?? '',
    clipboard: clipboardLines.join('\n'),
  }
}

const CWD = '/Users/example/Documents/GitHub/my-app'

describe('Stop: 作業完了の通知', () => {
  it('最終回答をクリップボード本文として渡す', () => {
    const report = '実装しました。\n- 引用符 " を含む\n- バックスラッシュ \\ を含む'
    const r = runHook({
      hook_event_name: 'Stop',
      cwd: CWD,
      last_assistant_message: report,
    })

    expect(r.kind).toBe('OK')
    expect(r.title).toContain('my-app')
    expect(r.message).toBe('作業が終わりました。報告はクリップボードにあります')
    expect(r.sound).toBe('Glass')
    expect(r.clipboard).toBe(report)
  })

  it('最終回答が無い場合はクリップボードに言及しない', () => {
    const r = runHook({ hook_event_name: 'Stop', cwd: CWD })

    expect(r.kind).toBe('OK')
    expect(r.message).toBe('作業が終わりました')
    expect(r.clipboard).toBe('')
  })
})

describe('Notification: 止まっている状態の通知', () => {
  it.each([
    ['permission_prompt', '確認待ちで止まっています（ツール使用の承認）'],
    ['idle_prompt', '応答がないまま止まっています'],
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
    ['正常な Notification', { hook_event_name: 'Notification', notification_type: 'idle_prompt' }],
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
