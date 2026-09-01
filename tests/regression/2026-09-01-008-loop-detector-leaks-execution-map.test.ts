/**
 * Bug ID: 2026-09-01-008
 * Date: 2026-09-01
 * Issue: useInfiniteLoopDetector がモジュールレベルの executionMap から
 *        エントリを消し残す経路が 2 つあった。実装コメントは
 *        「5秒後にリセット（メモリリーク防止）」と述べているのに、
 *        次の 2 ケースでリセットが働かなかった。
 *
 *          A. 1 回しかレンダーされない場合
 *             初回実行は entry を作った直後に early return するため、
 *             リセット用の setTimeout がそもそも張られない。
 *          B. 2 回以上レンダーしてからアンマウントした場合
 *             cleanup が clearTimeout するだけで delete しないため、
 *             予約されていた削除が永久に来ない。
 *
 *        scripts/create-feature.js が生成するフックは name に id を含むため、
 *        id が増えるほどエントリが積み上がる。開発環境限定だが無制限に増える。
 * Feature: src/hooks/useInfiniteLoopDetector.ts
 * Fixed by: 初回実行でもリセットタイマーを張るようにし、あわせて
 *           アンマウント専用の effect で entry を削除するようにした。
 *
 * 実装は executionMap を export していないため、残存確認は
 * logExecutionStats() が console.table へ渡す配列で行う
 * （検証のために実装へ export を足すことはしない）。
 *
 * 時間の経過は vi.useFakeTimers() で作り、実 sleep は書かない。
 * モジュールレベルの Map を共有するため、テストごとに一意な name を使う。
 *
 * @category 回帰
 * @priority 🟡 important
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useInfiniteLoopDetector, logExecutionStats } from '@/hooks/useInfiniteLoopDetector'

/** モジュールレベルの Map を汚さないための一意な監視名 */
let nameCounter = 0
function uniqueName(label: string): string {
  nameCounter += 1
  return `regression-008-${label}-${nameCounter}`
}

/**
 * executionMap に name のエントリが残っているかを調べる。
 * 実装が Map を公開していないため、logExecutionStats() の出力から判定する。
 */
function remainsInExecutionMap(name: string): boolean {
  const table = vi.spyOn(console, 'table').mockImplementation(() => {})
  logExecutionStats()
  const rows = (table.mock.calls[0]?.[0] ?? []) as { name: string }[]
  table.mockRestore()
  return rows.some((row) => row.name === name)
}

const TIME_WINDOW = 1000

/** 警告経路に入らない十分大きな閾値（本テストの関心は残存のみ） */
const NEVER_WARN = 1000

beforeEach(() => {
  vi.useFakeTimers()
  // 実装はモジュール読み込み時と検出時に console へ出すため、まとめて抑える
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'group').mockImplementation(() => {})
  vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Regression: 2026-09-01-008 - executionMap のエントリが消し残る', () => {
  it('A: 1 回だけレンダーしても、時間窓の経過後にエントリが消える', () => {
    const name = uniqueName('single-render')

    renderHook(() =>
      useInfiniteLoopDetector({ name, threshold: NEVER_WARN, timeWindow: TIME_WINDOW })
    )
    // 初回実行でもリセットタイマーが張られていれば、ここで削除される
    vi.advanceTimersByTime(TIME_WINDOW)

    expect(remainsInExecutionMap(name)).toBe(false)
  })

  it('B: 2 回以上レンダーしてアンマウントすると、エントリが消える', () => {
    const name = uniqueName('unmount')

    const { rerender, unmount } = renderHook(() =>
      useInfiniteLoopDetector({ name, threshold: NEVER_WARN, timeWindow: TIME_WINDOW })
    )
    rerender()
    unmount()

    // アンマウント時点で削除される（タイマーを待たずに消えること）
    expect(remainsInExecutionMap(name)).toBe(false)
  })

  it('B: アンマウント後に時間窓が過ぎても、エントリは残らない', () => {
    const name = uniqueName('unmount-then-wait')

    const { rerender, unmount } = renderHook(() =>
      useInfiniteLoopDetector({ name, threshold: NEVER_WARN, timeWindow: TIME_WINDOW })
    )
    rerender()
    unmount()
    vi.advanceTimersByTime(TIME_WINDOW * 5)

    expect(remainsInExecutionMap(name)).toBe(false)
  })

  it('従来から正しい経路: 2 回以上レンダーして残したままでも、時間窓の経過後に消える', () => {
    const name = uniqueName('no-unmount')

    const { rerender } = renderHook(() =>
      useInfiniteLoopDetector({ name, threshold: NEVER_WARN, timeWindow: TIME_WINDOW })
    )
    rerender()

    // 時間窓の経過前はまだ残っている（削除が早まっていないことの確認）
    expect(remainsInExecutionMap(name)).toBe(true)

    vi.advanceTimersByTime(TIME_WINDOW)

    expect(remainsInExecutionMap(name)).toBe(false)
  })
})
