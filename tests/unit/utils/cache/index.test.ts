/**
 * src/utils/cache/index.ts の単体テスト。
 *
 * index.ts は配布時の入口であり、ここが実体とズレると
 * 「import は通るが動かない」形の壊れ方をする。そのため
 * re-export が実装と同一であること（別物を掴んでいないこと）を実体比較で確認する。
 *
 * CachePresets は利用者がそのまま MemoryCache に渡す値なので、
 * 型の一致だけでなく「キャッシュとして成立する値か」まで見る。
 */

import { describe, it, expect, afterEach } from 'vitest'
import CacheDefault, {
  CachePresets,
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
import * as helpers from '@/utils/cache/helpers'
import { MemoryCache as MemoryCacheImpl } from '@/utils/cache/memory-cache'

/** MemoryCache が受け付けるストラテジーの全種別 */
const STRATEGIES = ['lru', 'lfu', 'fifo', 'ttl'] as const

afterEach(() => {
  destroyGlobalCache()
})

describe('re-export が実体と一致する', () => {
  it('MemoryCache は memory-cache.ts の実体そのもの', () => {
    expect(MemoryCache).toBe(MemoryCacheImpl)
  })

  it('デフォルトエクスポートは MemoryCache と同一', () => {
    expect(CacheDefault).toBe(MemoryCacheImpl)
  })

  it.each([
    ['cacheAsync', cacheAsync, helpers.cacheAsync],
    ['conditionalCache', conditionalCache, helpers.conditionalCache],
    ['createCacheKey', createCacheKey, helpers.createCacheKey],
    ['createTimeBasedKey', createTimeBasedKey, helpers.createTimeBasedKey],
    ['destroyGlobalCache', destroyGlobalCache, helpers.destroyGlobalCache],
    ['getBatch', getBatch, helpers.getBatch],
    ['getCachedOrGenerate', getCachedOrGenerate, helpers.getCachedOrGenerate],
    ['getCacheStatsString', getCacheStatsString, helpers.getCacheStatsString],
    ['getGlobalCache', getGlobalCache, helpers.getGlobalCache],
    ['memoize', memoize, helpers.memoize],
    ['warmupCache', warmupCache, helpers.warmupCache],
  ])('%s は helpers.ts の実体そのもの', (_name, exported, actual) => {
    expect(exported).toBe(actual)
  })

  it('helpers.ts の公開関数がすべて index から出ている', () => {
    const exportedNames = new Set([
      'cacheAsync',
      'conditionalCache',
      'createCacheKey',
      'createTimeBasedKey',
      'destroyGlobalCache',
      'getBatch',
      'getCachedOrGenerate',
      'getCacheStatsString',
      'getGlobalCache',
      'memoize',
      'warmupCache',
    ])
    const actualNames = Object.keys(helpers).filter(
      (name) => typeof (helpers as Record<string, unknown>)[name] === 'function'
    )

    expect(new Set(actualNames)).toEqual(exportedNames)
  })
})

describe('CachePresets', () => {
  const presetNames = ['api', 'session', 'computation', 'static', 'development'] as const

  it('想定しているプリセットが揃っている', () => {
    const byName = (a: string, b: string): number => a.localeCompare(b)

    expect(Object.keys(CachePresets).sort(byName)).toEqual([...presetNames].sort(byName))
  })

  it.each(presetNames)('%s: maxSize が 1 以上の整数である', (name) => {
    const { maxSize } = CachePresets[name]

    expect(Number.isInteger(maxSize)).toBe(true)
    expect(maxSize).toBeGreaterThan(0)
  })

  it.each(presetNames)('%s: strategy が MemoryCache の対応値である', (name) => {
    expect(STRATEGIES).toContain(CachePresets[name].strategy)
  })

  it.each(presetNames)('%s: cleanupInterval が正の数である', (name) => {
    const { cleanupInterval } = CachePresets[name]

    expect(cleanupInterval).toBeGreaterThan(0)
  })

  it.each(['api', 'session', 'static', 'development'] as const)(
    '%s: defaultTtl が cleanupInterval と矛盾しない正の数である',
    (name) => {
      const preset = CachePresets[name]

      expect(preset.defaultTtl).toBeGreaterThan(0)
    }
  )

  it('computation は TTL を持たない（無期限キャッシュ）', () => {
    expect('defaultTtl' in CachePresets.computation).toBe(false)
  })

  it('development だけ debug が有効', () => {
    expect(CachePresets.development.debug).toBe(true)
    expect('debug' in CachePresets.api).toBe(false)
  })

  it('用途に沿ったサイズ関係になっている（session < api < computation < static）', () => {
    expect(CachePresets.session.maxSize).toBeLessThan(CachePresets.api.maxSize)
    expect(CachePresets.api.maxSize).toBeLessThan(CachePresets.computation.maxSize)
    expect(CachePresets.computation.maxSize).toBeLessThan(CachePresets.static.maxSize)
  })

  it.each(presetNames)('%s: そのまま MemoryCache に渡して動作する', (name) => {
    const cache = new MemoryCache<string>({ ...CachePresets[name], debug: false })

    cache.set('key', 'value')

    expect(cache.get('key')).toBe('value')

    cache.destroy()
  })
})
