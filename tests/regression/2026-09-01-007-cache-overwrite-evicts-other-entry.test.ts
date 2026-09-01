/**
 * Bug ID: 2026-09-01-007
 * Date: 2026-09-01
 * Issue: MemoryCache.set() が既存キーの上書き時にも容量チェックで追い出しを
 *        行っていた。既存キーの上書きは Map のサイズを増やさないため追い出しは
 *        不要で、その結果まったく無関係なエントリが黙って消えていた。
 *
 *          maxSize: 2 / strategy: 'lru' で a, b を格納
 *          → a をアクセスして b を最古にする
 *          → set('a', 99, { overwrite: true })
 *          → 無関係な b が追い出され size が 2 → 1 になる
 *
 *        誤った値が返るわけではないため例外もログも出ず、上書きを多用する
 *        使い方では「入れたはずの値が無い」形でキャッシュが機能しなくなる。
 * Feature: src/utils/cache/memory-cache.ts の set()
 * Fixed by: 容量チェックの条件に「そのキーがまだ存在しないこと」を加え、
 *           既存キーの上書きでは evictEntry() を呼ばないようにした。
 *
 * 追い出しの犠牲者を決定的にするため、時刻は vi.useFakeTimers() で明示的に進める
 * （同一ミリ秒だと findMinKey が挿入順で最初のキーを返し、たまたま上書き対象
 * 自身が選ばれて不具合が隠れてしまう）。
 *
 * @category 回帰
 * @priority 🟡 important
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { MemoryCache } from '@/utils/cache'

/** 生成したキャッシュを確実に破棄するための登録簿 */
const created: MemoryCache<number>[] = []

function makeCache(config: ConstructorParameters<typeof MemoryCache>[0]): MemoryCache<number> {
  const cache = new MemoryCache<number>({ cleanupInterval: 0, ...config })
  created.push(cache)
  return cache
}

afterEach(() => {
  while (created.length > 0) {
    created.pop()?.destroy()
  }
  vi.useRealTimers()
})

describe('Regression: 2026-09-01-007 - 既存キーの上書きが無関係なエントリを追い出す', () => {
  it('lru: 上書きしても、最も古くアクセスされた別エントリが残る', () => {
    vi.useFakeTimers()
    const cache = makeCache({ maxSize: 2, strategy: 'lru' })

    cache.set('a', 1)
    vi.advanceTimersByTime(10)
    cache.set('b', 2)
    vi.advanceTimersByTime(10)
    cache.get('a') // a を新しくして b を「最も古いアクセス」にする
    vi.advanceTimersByTime(10)

    cache.set('a', 99, { overwrite: true })

    expect(cache.size()).toBe(2)
    expect(cache.has('b')).toBe(true)
    expect(cache.get('a')).toBe(99)
    expect(cache.getStats().evictions).toBe(0)
  })

  it('fifo: 上書きしても、最も古く作成された別エントリが残る', () => {
    vi.useFakeTimers()
    const cache = makeCache({ maxSize: 2, strategy: 'fifo' })

    cache.set('a', 1)
    vi.advanceTimersByTime(10)
    cache.set('b', 2)
    vi.advanceTimersByTime(10)

    // 新しい方（b）を上書きする。fifo の犠牲者は最古の a になるため、
    // 追い出しが走ると上書き対象ではない a が消える
    cache.set('b', 99, { overwrite: true })

    expect(cache.size()).toBe(2)
    expect(cache.has('a')).toBe(true)
    expect(cache.get('b')).toBe(99)
    expect(cache.getStats().evictions).toBe(0)
  })

  it('lru: 新規キーの追加では従来どおり追い出しが起きる', () => {
    vi.useFakeTimers()
    const cache = makeCache({ maxSize: 2, strategy: 'lru' })

    cache.set('a', 1)
    vi.advanceTimersByTime(10)
    cache.set('b', 2)
    vi.advanceTimersByTime(10)
    cache.get('b') // b を新しくして a を「最も古いアクセス」にする
    vi.advanceTimersByTime(10)

    cache.set('c', 3)

    expect(cache.size()).toBe(2)
    expect(cache.has('a')).toBe(false)
    expect(cache.has('b')).toBe(true)
    expect(cache.has('c')).toBe(true)
    expect(cache.getStats().evictions).toBe(1)
  })

  it('fifo: 新規キーの追加では従来どおり追い出しが起きる', () => {
    vi.useFakeTimers()
    const cache = makeCache({ maxSize: 2, strategy: 'fifo' })

    cache.set('a', 1)
    vi.advanceTimersByTime(10)
    cache.set('b', 2)
    vi.advanceTimersByTime(10)

    cache.set('c', 3)

    expect(cache.size()).toBe(2)
    expect(cache.has('a')).toBe(false)
    expect(cache.has('b')).toBe(true)
    expect(cache.has('c')).toBe(true)
    expect(cache.getStats().evictions).toBe(1)
  })
})
