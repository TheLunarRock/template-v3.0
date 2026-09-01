/**
 * src/utils/cache/memory-cache.ts の単体テスト。
 *
 * MemoryCache は docs/TEMPLATE_UTILITIES.md と SPECIFICATION.md §6.6 で
 * 「テンプレート同梱のユーティリティ」として配布される。TTL の失効判定と
 * 容量到達時の追い出しはどちらも「黙って値が消える」経路であり、壊れても
 * 例外が出ないため、テストが無いと利用側で原因不明のキャッシュミスになる。
 *
 * 時間依存の検証はすべて vi.useFakeTimers() で行い、実 sleep は使わない
 * （CI が遅い環境で不安定になるため）。自動クリーンアップの setInterval が
 * テスト間に漏れないよう、生成したインスタンスは必ず destroy() する。
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { MemoryCache } from '@/utils/cache'
import type { CacheEvent } from '@/utils/cache'

/** 生成したキャッシュを確実に破棄するための登録簿 */
const created: MemoryCache<unknown>[] = []

/**
 * テスト用のキャッシュを作る。
 * 既定で自動クリーンアップを止める（タイマーを検証したいテストだけ明示的に有効化する）。
 */
function makeCache<T>(config: ConstructorParameters<typeof MemoryCache>[0] = {}): MemoryCache<T> {
  const cache = new MemoryCache<T>({ cleanupInterval: 0, ...config })
  created.push(cache as MemoryCache<unknown>)
  return cache
}

afterEach(() => {
  while (created.length > 0) {
    created.pop()?.destroy()
  }
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('get / set の基本動作', () => {
  it('設定した値を取得できる', () => {
    const cache = makeCache<string>()

    cache.set('key', 'value')

    expect(cache.get('key')).toBe('value')
    expect(cache.size()).toBe(1)
  })

  it('未設定のキーは undefined を返す', () => {
    const cache = makeCache<string>()

    expect(cache.get('missing')).toBeUndefined()
  })

  it('既存キーへの set は既定では上書きしない', () => {
    const cache = makeCache<string>()

    // 同じキーへ順に set する（2 回目が無視されることの確認）
    for (const value of ['first', 'second']) {
      cache.set('key', value)
    }

    expect(cache.get('key')).toBe('first')
  })

  it('overwrite: true を指定したときだけ上書きする', () => {
    const cache = makeCache<string>()

    cache.set('key', 'first')
    cache.set('key', 'second', { overwrite: true })

    expect(cache.get('key')).toBe('second')
  })

  it('keyTransformer を通したキーで正規化される', () => {
    const cache = makeCache<string>({ keyTransformer: (key) => key.toLowerCase() })

    cache.set('KEY', 'value')

    expect(cache.get('key')).toBe('value')
    expect(cache.get('KeY')).toBe('value')
  })
})

describe('has / delete / clear', () => {
  it('has は存在するキーで true、しないキーで false を返す', () => {
    const cache = makeCache<number>()
    cache.set('a', 1)

    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
  })

  it('delete は削除できたときだけ true を返す', () => {
    const cache = makeCache<number>()
    cache.set('a', 1)

    expect(cache.delete('a')).toBe(true)
    expect(cache.delete('a')).toBe(false)
    expect(cache.has('a')).toBe(false)
  })

  it('clear はエントリーと統計値の両方を初期化する', () => {
    const cache = makeCache<number>({ maxSize: 1 })
    cache.set('a', 1)
    cache.get('a')
    cache.get('missing')
    cache.set('b', 2) // 追い出しを発生させる

    cache.clear()
    const stats = cache.getStats()

    expect(cache.size()).toBe(0)
    expect(stats.hits).toBe(0)
    expect(stats.misses).toBe(0)
    expect(stats.evictions).toBe(0)
  })
})

describe('TTL による失効', () => {
  it('TTL ちょうどでは失効せず、超えると失効する', () => {
    vi.useFakeTimers()
    const cache = makeCache<string>()
    cache.set('key', 'value', { ttl: 1000 })

    vi.advanceTimersByTime(1000)
    expect(cache.get('key')).toBe('value')

    vi.advanceTimersByTime(1)
    expect(cache.get('key')).toBeUndefined()
  })

  it('失効したエントリーは get の時点で取り除かれる', () => {
    vi.useFakeTimers()
    const cache = makeCache<string>()
    cache.set('key', 'value', { ttl: 100 })

    vi.advanceTimersByTime(101)
    cache.get('key')

    expect(cache.size()).toBe(0)
  })

  it('has も失効を検知して false を返す', () => {
    vi.useFakeTimers()
    const cache = makeCache<string>()
    cache.set('key', 'value', { ttl: 100 })

    vi.advanceTimersByTime(101)

    expect(cache.has('key')).toBe(false)
    expect(cache.size()).toBe(0)
  })

  it('defaultTtl は set 時に TTL を指定しなかったエントリーへ適用される', () => {
    vi.useFakeTimers()
    const cache = makeCache<string>({ defaultTtl: 500 })
    cache.set('key', 'value')

    vi.advanceTimersByTime(501)

    expect(cache.get('key')).toBeUndefined()
  })

  it('set の ttl は defaultTtl より優先される', () => {
    vi.useFakeTimers()
    const cache = makeCache<string>({ defaultTtl: 100 })
    cache.set('key', 'value', { ttl: 5000 })

    vi.advanceTimersByTime(1000)

    expect(cache.get('key')).toBe('value')
  })

  it('TTL 未指定のエントリーは時間が経っても失効しない', () => {
    vi.useFakeTimers()
    const cache = makeCache<string>()
    cache.set('key', 'value')

    vi.advanceTimersByTime(10 * 60 * 1000)

    expect(cache.get('key')).toBe('value')
  })
})

describe('容量到達時の追い出し', () => {
  it('追い出しは挿入前に行われ、サイズは maxSize を超えない', () => {
    const cache = makeCache<number>({ maxSize: 2, strategy: 'fifo' })

    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)

    expect(cache.size()).toBe(2)
    expect(cache.getStats().evictions).toBe(1)
  })

  it('lru: 最後にアクセスされた時刻が最も古いものを追い出す', () => {
    vi.useFakeTimers()
    const cache = makeCache<number>({ maxSize: 2, strategy: 'lru' })

    cache.set('a', 1)
    vi.advanceTimersByTime(10)
    cache.set('b', 2)
    vi.advanceTimersByTime(10)
    cache.get('a') // a を新しくして b を最古にする
    vi.advanceTimersByTime(10)
    cache.set('c', 3)

    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
    expect(cache.has('c')).toBe(true)
  })

  it('lfu: アクセス回数が最も少ないものを追い出す', () => {
    const cache = makeCache<number>({ maxSize: 2, strategy: 'lfu' })

    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a')
    cache.get('a') // a: 2回 / b: 0回
    cache.set('c', 3)

    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
    expect(cache.has('c')).toBe(true)
  })

  it('fifo: 作成が最も古いものを追い出す（アクセスしても延命しない）', () => {
    vi.useFakeTimers()
    const cache = makeCache<number>({ maxSize: 2, strategy: 'fifo' })

    cache.set('a', 1)
    vi.advanceTimersByTime(10)
    cache.set('b', 2)
    vi.advanceTimersByTime(10)
    cache.get('a') // fifo では延命しない
    cache.set('c', 3)

    expect(cache.has('a')).toBe(false)
    expect(cache.has('b')).toBe(true)
    expect(cache.has('c')).toBe(true)
  })

  it('ttl: 期限切れがあればそれを片付けるだけで、有効なエントリーは残す', () => {
    vi.useFakeTimers()
    const cache = makeCache<number>({ maxSize: 2, strategy: 'ttl' })

    cache.set('expired', 1, { ttl: 100 })
    cache.set('alive', 2)
    vi.advanceTimersByTime(101)
    cache.set('new', 3)

    expect(cache.has('expired')).toBe(false)
    expect(cache.has('alive')).toBe(true)
    expect(cache.has('new')).toBe(true)
    // 期限切れの回収で空きができたため、追い出しは発生していない
    expect(cache.getStats().evictions).toBe(0)
  })

  it('ttl: 期限切れが無ければ作成が最も古いものを追い出す', () => {
    vi.useFakeTimers()
    const cache = makeCache<number>({ maxSize: 2, strategy: 'ttl' })

    cache.set('a', 1)
    vi.advanceTimersByTime(10)
    cache.set('b', 2)
    vi.advanceTimersByTime(10)
    cache.set('c', 3)

    expect(cache.has('a')).toBe(false)
    expect(cache.has('b')).toBe(true)
    expect(cache.has('c')).toBe(true)
    expect(cache.getStats().evictions).toBe(1)
  })
})

describe('タグによる削除', () => {
  it('指定タグを持つエントリーだけをまとめて削除する', () => {
    const cache = makeCache<number>()
    cache.set('a', 1, { tags: ['user', 'profile'] })
    cache.set('b', 2, { tags: ['user', 'settings'] })
    cache.set('c', 3, { tags: ['post'] })

    const deleted = cache.deleteByTag('user')

    expect(deleted).toBe(2)
    expect(cache.has('a')).toBe(false)
    expect(cache.has('b')).toBe(false)
    expect(cache.has('c')).toBe(true)
  })

  it('該当が無ければ 0 を返し、何も削除しない', () => {
    const cache = makeCache<number>()
    cache.set('a', 1, { tags: ['user'] })

    expect(cache.deleteByTag('unknown')).toBe(0)
    expect(cache.size()).toBe(1)
  })
})

describe('cleanup と自動クリーンアップ', () => {
  it('cleanup は期限切れのエントリー数を返し、有効なものは残す', () => {
    vi.useFakeTimers()
    const cache = makeCache<number>()
    cache.set('expired', 1, { ttl: 100 })
    cache.set('alive', 2, { ttl: 10000 })

    vi.advanceTimersByTime(101)

    expect(cache.cleanup()).toBe(1)
    expect(cache.has('alive')).toBe(true)
  })

  it('cleanupInterval を過ぎると自動で期限切れが回収される', () => {
    vi.useFakeTimers()
    const cache = makeCache<number>({ cleanupInterval: 1000 })
    cache.set('expired', 1, { ttl: 100 })

    // TTL は過ぎたが、まだ自動クリーンアップは走っていない
    vi.advanceTimersByTime(500)
    expect(cache.size()).toBe(1)

    vi.advanceTimersByTime(600)
    expect(cache.size()).toBe(0)
  })

  it('cleanupInterval が 0 なら自動クリーンアップは動かない', () => {
    vi.useFakeTimers()
    const cache = makeCache<number>({ cleanupInterval: 0 })
    cache.set('expired', 1, { ttl: 100 })

    vi.advanceTimersByTime(60 * 60 * 1000)

    // 自動回収されないため、明示的に触るまでエントリーは残る
    expect(cache.size()).toBe(1)
    expect(cache.get('expired')).toBeUndefined()
  })
})

describe('統計情報', () => {
  it('ヒットとミスの回数、およびヒット率を百分率で返す', () => {
    const cache = makeCache<number>()
    cache.set('a', 1)

    cache.get('a')
    cache.get('a')
    cache.get('a')
    cache.get('missing')

    const stats = cache.getStats()

    expect(stats.hits).toBe(3)
    expect(stats.misses).toBe(1)
    expect(stats.hitRate).toBe(75)
  })

  it('アクセスが無いときのヒット率は 0 になる', () => {
    const cache = makeCache<number>()

    expect(cache.getStats().hitRate).toBe(0)
  })

  it('最古と最新の作成時刻を返す', () => {
    vi.useFakeTimers()
    const cache = makeCache<number>()

    cache.set('a', 1)
    const oldest = Date.now()
    vi.advanceTimersByTime(1000)
    cache.set('b', 2)
    const newest = Date.now()

    const stats = cache.getStats()

    expect(stats.oldestEntry).toBe(oldest)
    expect(stats.newestEntry).toBe(newest)
  })

  it('空のときは最古・最新が undefined になる', () => {
    const cache = makeCache<number>()
    const stats = cache.getStats()

    expect(stats.oldestEntry).toBeUndefined()
    expect(stats.newestEntry).toBeUndefined()
  })

  it('推定メモリ量はエントリーが増えるほど大きくなる', () => {
    const cache = makeCache<string>()
    cache.set('a', 'x')
    const small = cache.getStats().estimatedSize ?? 0

    cache.set('b', 'y'.repeat(100))
    const large = cache.getStats().estimatedSize ?? 0

    expect(small).toBeGreaterThan(0)
    expect(large).toBeGreaterThan(small)
  })
})

describe('イベントリスナー', () => {
  /** 受け取ったイベント種別を集める */
  function collect(cache: MemoryCache<number>): CacheEvent[] {
    const events: CacheEvent[] = []
    cache.addListener((event) => events.push(event))
    return events
  }

  it('set / hit / miss / delete / clear を通知する', () => {
    const cache = makeCache<number>()
    const events = collect(cache)

    cache.set('a', 1)
    cache.get('a')
    cache.get('missing')
    cache.delete('a')
    cache.clear()

    expect(events.map((e) => e.type)).toEqual(['set', 'hit', 'miss', 'delete', 'clear'])
  })

  it('追い出し時に evict を通知する', () => {
    const cache = makeCache<number>({ maxSize: 1, strategy: 'fifo' })
    const events = collect(cache)

    cache.set('a', 1)
    cache.set('b', 2)

    expect(events.map((e) => e.type)).toContain('evict')
  })

  it('removeListener 後は通知されない', () => {
    const cache = makeCache<number>()
    const events: CacheEvent[] = []
    const listener = (event: CacheEvent): void => {
      events.push(event)
    }

    cache.addListener(listener)
    cache.set('a', 1)
    cache.removeListener(listener)
    cache.set('b', 2)

    expect(events).toHaveLength(1)
  })

  it('リスナーが例外を投げても他の処理を巻き込まない', () => {
    const cache = makeCache<number>()
    const received: CacheEvent[] = []
    cache.addListener(() => {
      throw new Error('listener failure')
    })
    cache.addListener((event) => received.push(event))

    expect(() => cache.set('a', 1)).not.toThrow()
    expect(cache.get('a')).toBe(1)
    expect(received.length).toBeGreaterThan(0)
  })
})

describe('destroy', () => {
  it('エントリー・リスナー・自動クリーンアップをまとめて解放する', () => {
    vi.useFakeTimers()
    const cache = new MemoryCache<number>({ cleanupInterval: 1000 })
    const events: CacheEvent[] = []
    cache.addListener((event) => events.push(event))
    cache.set('a', 1)

    cache.destroy()
    const countAfterDestroy = events.length

    // destroy 後はタイマーが動かず、リスナーにも通知されない
    vi.advanceTimersByTime(10 * 1000)
    cache.set('b', 2)

    expect(cache.size()).toBe(1) // set 自体は通るがリスナーは解除済み
    expect(events).toHaveLength(countAfterDestroy)
    expect(vi.getTimerCount()).toBe(0)

    cache.destroy()
  })
})
