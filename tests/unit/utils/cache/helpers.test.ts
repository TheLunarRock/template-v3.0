/**
 * src/utils/cache/helpers.ts の単体テスト。
 *
 * memoize / cacheAsync / getCachedOrGenerate は「2回目に元の関数を呼ばない」ことが
 * 存在意義であり、そこが壊れても結果は正しいまま返るため、呼び出し回数を数えないと
 * 退行に気付けない。あわせて、生成側が reject したときにキャッシュを汚さないこと
 * （次回に壊れた値を返さないこと）も確認する。
 *
 * getGlobalCache はモジュールレベルのシングルトンなので、各テスト後に
 * destroyGlobalCache() で必ず解放し、状態がテスト間に持ち越されないようにする。
 * 時間依存の検証は vi.useFakeTimers() で行い、実 sleep は使わない。
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  MemoryCache,
  cacheAsync,
  conditionalCache,
  createCacheKey,
  createTimeBasedKey,
  destroyGlobalCache,
  getBatch,
  getCachedOrGenerate,
  getCacheStatsString,
  getGlobalCache,
  memoize,
  warmupCache,
} from '@/utils/cache'

/** 生成したキャッシュを確実に破棄するための登録簿 */
const created: MemoryCache<unknown>[] = []

function makeCache<T>(config: ConstructorParameters<typeof MemoryCache>[0] = {}): MemoryCache<T> {
  const cache = new MemoryCache<T>({ cleanupInterval: 0, ...config })
  created.push(cache as MemoryCache<unknown>)
  return cache
}

afterEach(() => {
  while (created.length > 0) {
    created.pop()?.destroy()
  }
  destroyGlobalCache()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('getGlobalCache / destroyGlobalCache', () => {
  it('同じインスタンスを返す（シングルトン）', () => {
    expect(getGlobalCache()).toBe(getGlobalCache())
  })

  it('destroyGlobalCache 後は新しいインスタンスになる', () => {
    const first = getGlobalCache()
    first.set('key', 'value')

    destroyGlobalCache()
    const second = getGlobalCache()

    expect(second).not.toBe(first)
    expect(second.get('key')).toBeUndefined()
  })

  it('未初期化でも destroyGlobalCache は失敗しない', () => {
    destroyGlobalCache()

    expect(() => destroyGlobalCache()).not.toThrow()
  })
})

describe('createCacheKey', () => {
  it('プレフィックスと引数をコロンで連結する', () => {
    expect(createCacheKey('user', 123, 'active')).toBe('user:123:active')
  })

  it('引数が無ければプレフィックスとコロンだけになる', () => {
    expect(createCacheKey('user')).toBe('user:')
  })

  it('null と undefined を区別する', () => {
    expect(createCacheKey('k', null)).toBe('k:null')
    expect(createCacheKey('k', undefined)).toBe('k:undefined')
  })

  it('真偽値と数値を文字列化する', () => {
    expect(createCacheKey('k', true, 0)).toBe('k:true:0')
  })

  it('オブジェクトと配列は JSON 表現になる', () => {
    expect(createCacheKey('k', { a: 1 })).toBe('k:{"a":1}')
    expect(createCacheKey('k', [1, 2])).toBe('k:[1,2]')
  })

  it('循環参照を持つオブジェクトでも例外を投げずキーを返す', () => {
    const circular: Record<string, unknown> = { name: 'self' }
    circular.self = circular

    expect(createCacheKey('k', circular)).toBe('k:[object]')
  })

  it('関数やシンボルは [unknown] に畳む', () => {
    expect(createCacheKey('k', () => undefined)).toBe('k:[unknown]')
    expect(createCacheKey('k', Symbol('s'))).toBe('k:[unknown]')
  })
})

describe('memoize', () => {
  it('同じ引数の2回目は元の関数を呼ばない', () => {
    const fn = vi.fn((n: unknown) => (n as number) * 2)
    const memoized = memoize(fn, { cache: makeCache<number>() })

    expect(memoized(5)).toBe(10)
    expect(memoized(5)).toBe(10)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('引数が違えば別々に計算する', () => {
    const fn = vi.fn((n: unknown) => (n as number) * 2)
    const memoized = memoize(fn, { cache: makeCache<number>() })

    memoized(1)
    memoized(2)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('TTL を過ぎると再計算する', () => {
    vi.useFakeTimers()
    const fn = vi.fn((n: unknown) => (n as number) * 2)
    const memoized = memoize(fn, { ttl: 1000, cache: makeCache<number>() })

    memoized(5)
    vi.advanceTimersByTime(1001)
    memoized(5)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('keyPrefix が違えば同じ引数でも衝突しない', () => {
    const shared = makeCache<number>()
    const first = vi.fn(() => 1)
    const second = vi.fn(() => 2)

    const a = memoize(first, { cache: shared, keyPrefix: 'a' })
    const b = memoize(second, { cache: shared, keyPrefix: 'b' })

    expect(a()).toBe(1)
    expect(b()).toBe(2)
  })
})

describe('cacheAsync', () => {
  it('同じ引数の2回目は元の関数を呼ばない', async () => {
    const fn = vi.fn((n: unknown) => Promise.resolve((n as number) * 2))
    const cached = cacheAsync(fn, { cache: makeCache<Promise<number>>() })

    await expect(cached(5)).resolves.toBe(10)
    await expect(cached(5)).resolves.toBe(10)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('同時に呼ばれた場合は実行中の Promise を共有する（重複実行しない）', async () => {
    const fn = vi.fn((n: unknown) => Promise.resolve((n as number) * 2))
    const cached = cacheAsync(fn, { cache: makeCache<Promise<number>>() })

    const [a, b] = await Promise.all([cached(5), cached(5)])

    expect(a).toBe(10)
    expect(b).toBe(10)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('reject した場合はキャッシュを汚さず、次回に再実行する', async () => {
    const fn = vi
      .fn<(n: unknown) => Promise<number>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(42)
    const cached = cacheAsync(fn, { cache: makeCache<Promise<number>>() })

    await expect(cached(1)).rejects.toThrow('boom')
    await expect(cached(1)).resolves.toBe(42)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('reject 時に onError が呼ばれる', async () => {
    const onError = vi.fn()
    const fn = vi.fn(() => Promise.reject(new Error('boom')))
    const cached = cacheAsync(fn, { cache: makeCache<Promise<never>>(), onError })

    await expect(cached()).rejects.toThrow('boom')

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error)
  })

  it('TTL を過ぎると再実行する', async () => {
    vi.useFakeTimers()
    const fn = vi.fn((n: unknown) => Promise.resolve((n as number) * 2))
    const cached = cacheAsync(fn, { ttl: 1000, cache: makeCache<Promise<number>>() })

    await cached(5)
    vi.advanceTimersByTime(1001)
    await cached(5)

    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('getCachedOrGenerate', () => {
  it('キャッシュが無ければ生成し、次回は生成しない', async () => {
    const cache = makeCache<string>()
    const generator = vi.fn(() => Promise.resolve('generated'))

    await expect(getCachedOrGenerate(cache, 'key', generator)).resolves.toBe('generated')
    await expect(getCachedOrGenerate(cache, 'key', generator)).resolves.toBe('generated')

    expect(generator).toHaveBeenCalledTimes(1)
  })

  it('生成が reject した場合はキャッシュを汚さない', async () => {
    const cache = makeCache<string>()
    const failing = vi.fn(() => Promise.reject(new Error('generate failed')))

    await expect(getCachedOrGenerate(cache, 'key', failing)).rejects.toThrow('generate failed')

    expect(cache.has('key')).toBe(false)
    await expect(
      getCachedOrGenerate(cache, 'key', () => Promise.resolve('recovered'))
    ).resolves.toBe('recovered')
  })

  it('渡した options が set に反映される（TTL で失効する）', async () => {
    vi.useFakeTimers()
    const cache = makeCache<string>()
    const generator = vi.fn(() => Promise.resolve('value'))

    await getCachedOrGenerate(cache, 'key', generator, { ttl: 100 })
    vi.advanceTimersByTime(101)
    await getCachedOrGenerate(cache, 'key', generator, { ttl: 100 })

    expect(generator).toHaveBeenCalledTimes(2)
  })
})

describe('createTimeBasedKey', () => {
  it('同じ時間帯では同じキーを返す', () => {
    vi.useFakeTimers()

    const first = createTimeBasedKey('stats', 60000)
    vi.advanceTimersByTime(100)

    expect(createTimeBasedKey('stats', 60000)).toBe(first)
  })

  it('間隔をまたぐとキーが変わる', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    const first = createTimeBasedKey('stats', 60000)
    vi.setSystemTime(60000)

    expect(createTimeBasedKey('stats', 60000)).not.toBe(first)
  })

  it('プレフィックスとバケット番号を連結した形になる', () => {
    vi.useFakeTimers()
    vi.setSystemTime(120000)

    expect(createTimeBasedKey('stats', 60000)).toBe('stats:t2')
  })
})

describe('warmupCache', () => {
  it('渡したアイテムをすべてキャッシュへ格納する', async () => {
    const cache = makeCache<string>()

    await warmupCache(cache, [
      { key: 'a', generator: () => Promise.resolve('A') },
      { key: 'b', generator: () => Promise.resolve('B') },
    ])

    expect(cache.get('a')).toBe('A')
    expect(cache.get('b')).toBe('B')
  })

  it('一部が失敗しても例外を投げず、成功分だけ格納する', async () => {
    const cache = makeCache<string>()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(
      warmupCache(cache, [
        { key: 'ng', generator: () => Promise.reject(new Error('failed')) },
        { key: 'ok', generator: () => Promise.resolve('OK') },
      ])
    ).resolves.toBeUndefined()

    expect(cache.has('ng')).toBe(false)
    expect(cache.get('ok')).toBe('OK')
    expect(warn).toHaveBeenCalled()
  })
})

describe('conditionalCache', () => {
  it('条件を満たす値だけキャッシュする', () => {
    const cache = makeCache<number>()

    conditionalCache((value) => value > 10, cache, 'big', 42)
    conditionalCache((value) => value > 10, cache, 'small', 1)

    expect(cache.get('big')).toBe(42)
    expect(cache.has('small')).toBe(false)
  })

  it('options をそのまま set へ渡す', () => {
    const cache = makeCache<number>()

    conditionalCache(() => true, cache, 'key', 1, { tags: ['tagged'] })

    expect(cache.deleteByTag('tagged')).toBe(1)
  })
})

describe('getBatch', () => {
  it('キャッシュ済みのキーでは生成関数を呼ばない', async () => {
    const cache = makeCache<string>()
    cache.set('a', 'cached')
    const generator = vi.fn((key: string) => `generated:${key}`)

    const result = await getBatch(cache, ['a', 'b'], generator)

    expect(result.get('a')).toBe('cached')
    expect(result.get('b')).toBe('generated:b')
    expect(generator).toHaveBeenCalledTimes(1)
    expect(generator).toHaveBeenCalledWith('b')
  })

  it('生成した値はキャッシュへ格納される', async () => {
    const cache = makeCache<string>()

    await getBatch(cache, ['a'], (key) => `v:${key}`)

    expect(cache.get('a')).toBe('v:a')
  })

  it('すべてキャッシュ済みなら生成関数を一度も呼ばない', async () => {
    const cache = makeCache<string>()
    cache.set('a', 'A')
    cache.set('b', 'B')
    const generator = vi.fn((key: string) => key)

    const result = await getBatch(cache, ['a', 'b'], generator)

    expect(generator).not.toHaveBeenCalled()
    expect(result.size).toBe(2)
  })
})

describe('getCacheStatsString', () => {
  it('ヒット・ミスを起こした後の統計値を整形して返す', () => {
    const cache = makeCache<string>()
    cache.set('a', 'A')
    cache.get('a')
    cache.get('missing')

    const text = getCacheStatsString(cache as MemoryCache<unknown>)

    expect(text).toContain('Cache Statistics:')
    expect(text).toContain('Size: 1')
    expect(text).toContain('Hit Rate: 50.00%')
    expect(text).toContain('Hits: 1')
    expect(text).toContain('Misses: 1')
    expect(text).toContain('Evictions: 0')
    expect(text).toMatch(/Estimated Memory: [\d.]+ KB/)
  })
})
