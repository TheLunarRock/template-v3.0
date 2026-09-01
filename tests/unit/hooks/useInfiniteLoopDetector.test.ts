/**
 * src/hooks/useInfiniteLoopDetector.ts の単体テスト。
 *
 * このフックは「無限ループに気付けるようにする」ための開発支援機能で、
 * 壊れても本番の挙動は変わらず、警告が出なくなるだけなので退行に気付けない。
 * 実際に scripts/create-feature.js が生成するフックへ組み込まれており、
 * テンプレート利用者全員に配られる。
 *
 * 実装はモジュールレベルの Map（executionMap）に実行回数を保持し、
 * リセット手段を公開していない。そのためテストごとに一意な name を使って
 * 相互汚染を避ける（そのために実装へ export を足すことはしない）。
 *
 * 時間の経過は vi.useFakeTimers() で作り、実 sleep は使わない。
 * 検出時に window.confirm が呼ばれるため、jsdom の未実装エラーを避けて
 * 必ずモックする。console 出力も spy で抑える。
 *
 * @category ユニット
 * @priority 🟡 important
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useInfiniteLoopDetector,
  useEffectLoopDetector,
  logExecutionStats,
} from '@/hooks/useInfiniteLoopDetector'

/** モジュールレベルの Map を汚さないための一意な監視名 */
let nameCounter = 0
function uniqueName(label: string): string {
  nameCounter += 1
  return `${label}-${nameCounter}`
}

interface ConsoleSpies {
  group: ReturnType<typeof vi.spyOn>
  groupEnd: ReturnType<typeof vi.spyOn>
  error: ReturnType<typeof vi.spyOn>
  warn: ReturnType<typeof vi.spyOn>
  info: ReturnType<typeof vi.spyOn>
  table: ReturnType<typeof vi.spyOn>
}

/** 検出時の出力を握りつぶしつつ、呼ばれ方を観察できるようにする */
function spyConsole(): ConsoleSpies {
  return {
    group: vi.spyOn(console, 'group').mockImplementation(() => {}),
    groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    table: vi.spyOn(console, 'table').mockImplementation(() => {}),
  }
}

/** 検出時に呼ばれる confirm。デバッガー停止は選ばない */
function spyConfirm(): MockInstance<(message?: string) => boolean> {
  return vi.spyOn(window, 'confirm').mockReturnValue(false)
}

/** 指定回数だけ再レンダーする（初回レンダー込みで total 回） */
function renderTimes(hook: () => void, total: number): void {
  const { rerender } = renderHook(hook)
  for (let i = 1; i < total; i += 1) {
    rerender()
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('本番環境では無効', () => {
  it('NODE_ENV=production では検出も警告も行わない', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const spies = spyConsole()
    spyConfirm()
    const name = uniqueName('production')

    renderTimes(() => useInfiniteLoopDetector({ name, threshold: 2 }), 10)

    expect(spies.group).not.toHaveBeenCalled()
    expect(spies.warn).not.toHaveBeenCalled()
  })
})

describe('閾値による警告', () => {
  it('閾値未満の実行回数では警告しない', () => {
    const spies = spyConsole()
    spyConfirm()
    const name = uniqueName('under-threshold')

    renderTimes(() => useInfiniteLoopDetector({ name, threshold: 5 }), 3)

    expect(spies.group).not.toHaveBeenCalled()
  })

  it('時間窓の中で閾値に達すると警告する', () => {
    const spies = spyConsole()
    spyConfirm()
    const name = uniqueName('over-threshold')

    renderTimes(() => useInfiniteLoopDetector({ name, threshold: 3 }), 3)

    expect(spies.group).toHaveBeenCalledWith('🔥 無限ループ警告')
    expect(spies.warn).toHaveBeenCalledWith(`コンポーネント: ${name}`)
    expect(spies.warn).toHaveBeenCalledWith('実行回数: 3回')
  })

  it('検出時に confirm でデバッガー停止を確認する', () => {
    spyConsole()
    const confirmSpy = spyConfirm()
    const name = uniqueName('confirm')

    renderTimes(() => useInfiniteLoopDetector({ name, threshold: 2 }), 2)

    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })

  it('時間窓を超えて分散した実行では警告しない', () => {
    const spies = spyConsole()
    spyConfirm()
    const name = uniqueName('spread-out')

    const { rerender } = renderHook(() =>
      useInfiniteLoopDetector({ name, threshold: 3, timeWindow: 1000 })
    )
    // 各レンダーが前回のリセットタイマーを解除するため、
    // 削除は起こらないまま経過時間だけが時間窓を超える
    vi.advanceTimersByTime(600)
    rerender()
    vi.advanceTimersByTime(600)
    rerender()

    expect(spies.group).not.toHaveBeenCalled()
  })
})

describe('時間窓によるリセット', () => {
  it('時間窓を過ぎるとカウントがリセットされ、以降は数え直しになる', () => {
    const spies = spyConsole()
    spyConfirm()
    const name = uniqueName('reset')
    const options = { name, threshold: 3, timeWindow: 1000 }

    const { rerender } = renderHook(() => useInfiniteLoopDetector(options))
    rerender()
    // ここまで 2 回。あと 1 回で閾値に達する
    expect(spies.group).not.toHaveBeenCalled()

    // 何も起きない時間を挟むとリセットタイマーが発火する
    vi.advanceTimersByTime(1000)

    rerender()
    rerender()

    // リセットが効いていれば 2 回目までしか数えていないので警告は出ない
    expect(spies.group).not.toHaveBeenCalled()
  })
})

describe('カスタムメッセージ', () => {
  it('customMessage を指定するとその文言を出す', () => {
    const spies = spyConsole()
    spyConfirm()
    const name = uniqueName('custom-message')

    renderTimes(
      () =>
        useInfiniteLoopDetector({
          name,
          threshold: 2,
          customMessage: '依存配列を確認してください',
        }),
      2
    )

    expect(spies.info).toHaveBeenCalledWith('💡 依存配列を確認してください')
  })

  it('customMessage が空文字なら既定の対策メッセージを出す', () => {
    const spies = spyConsole()
    spyConfirm()
    const name = uniqueName('empty-message')

    renderTimes(() => useInfiniteLoopDetector({ name, threshold: 2, customMessage: '' }), 2)

    const infoMessages = spies.info.mock.calls.map((call) => String(call[0]))
    expect(infoMessages.some((message) => message.includes('useEffect の依存配列をチェック'))).toBe(
      true
    )
  })

  it('customMessage 未指定なら既定の対策メッセージを出す', () => {
    const spies = spyConsole()
    spyConfirm()
    const name = uniqueName('default-message')

    renderTimes(() => useInfiniteLoopDetector({ name, threshold: 2 }), 2)

    const infoMessages = spies.info.mock.calls.map((call) => String(call[0]))
    expect(infoMessages.some((message) => message.includes('useEffect の依存配列をチェック'))).toBe(
      true
    )
  })
})

describe('useEffectLoopDetector', () => {
  it('名前だけで useInfiniteLoopDetector と同じ検出を行う', () => {
    const spies = spyConsole()
    spyConfirm()
    const name = uniqueName('effect-detector')

    renderTimes(() => useEffectLoopDetector(name, { threshold: 2 }), 2)

    expect(spies.group).toHaveBeenCalledWith('🔥 無限ループ警告')
    expect(spies.warn).toHaveBeenCalledWith(`コンポーネント: ${name}`)
  })

  it('オプション未指定なら既定の閾値（10）が使われ、少ない実行では警告しない', () => {
    const spies = spyConsole()
    spyConfirm()
    const name = uniqueName('effect-default')

    renderTimes(() => useEffectLoopDetector(name), 5)

    expect(spies.group).not.toHaveBeenCalled()
  })
})

describe('logExecutionStats', () => {
  it('記録された実行統計を console.table に出す', () => {
    const spies = spyConsole()
    spyConfirm()
    const name = uniqueName('stats')

    renderTimes(() => useInfiniteLoopDetector({ name, threshold: 100 }), 2)
    logExecutionStats()

    expect(spies.table).toHaveBeenCalledTimes(1)
    const rows = spies.table.mock.calls[0]?.[0] as { name: string; count: number }[]
    const target = rows.find((row) => row.name === name)
    expect(target?.count).toBe(2)
  })

  it('NODE_ENV=production では何も出力しない', () => {
    const spies = spyConsole()
    vi.stubEnv('NODE_ENV', 'production')

    logExecutionStats()

    expect(spies.table).not.toHaveBeenCalled()
  })
})
