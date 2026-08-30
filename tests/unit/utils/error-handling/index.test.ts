/**
 * src/utils/error-handling/index.ts の単体テスト。
 *
 * transformError → StructuredError → logError の経路はアプリ全体の
 * エラー処理の中核であり、ここが壊れるとログ出力・再スロー・集約の
 * すべてが静かに狂う。特に stack は message と並べてコンソールに出るため、
 * サニタイズ漏れがそのまま機密情報の漏洩になる。
 */
/* eslint-disable sonarjs/no-hardcoded-passwords -- サニタイズ対象のダミー値であり、実在の資格情報ではない */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  aggregateErrors,
  handleError,
  isStructuredError,
  transformError,
  tryCatch,
  type StructuredError,
} from '@/utils/error-handling'

const silenceConsole = () => ({
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  info: vi.spyOn(console, 'info').mockImplementation(() => {}),
})

const structured = (overrides: Partial<StructuredError> = {}): StructuredError => ({
  message: 'base failure',
  level: 'error',
  category: 'unknown',
  timestamp: new Date('2026-08-30T00:00:00.000Z'),
  ...overrides,
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('transformError', () => {
  describe('stack のサニタイズ', () => {
    it('development では stack に生の値が残らない', () => {
      vi.stubEnv('NODE_ENV', 'development')

      const result = transformError(new Error('login failed: password=hunter2'))

      expect(result.stack, 'development では stack が含まれる').toBeDefined()
      expect(
        result.stack,
        'stack の1行目は "Error: <生のmessage>" を含むため、message だけ伏せても意味がない'
      ).not.toContain('hunter2')
      expect(result.stack).toContain('***')
    })

    it('production では stack を持たない', () => {
      vi.stubEnv('NODE_ENV', 'production')

      const result = transformError(new Error('login failed: password=hunter2'))

      expect(result.stack).toBeUndefined()
    })
  })

  it('Error はメッセージがサニタイズされ、name が code になる', () => {
    const result = transformError(new TypeError('invalid input value'))

    expect(result.code).toBe('TypeError')
    expect(result.message).toBe('invalid input value')
    expect(result.category).toBe('validation')
    expect(result.level).toBe('warning')
    expect(result.originalError).toBeInstanceOf(TypeError)
  })

  it('name が Error のままなら code は付かない', () => {
    expect(transformError(new Error('boom')).code).toBeUndefined()
  })

  it('文字列はサニタイズされた message になる', () => {
    const result = transformError('network timeout at password=hunter2')

    expect(result.message).not.toContain('hunter2')
    expect(result.category).toBe('network')
    expect(result.originalError).toBe('network timeout at password=hunter2')
  })

  it('Error でも文字列でもない値は unknown 扱いになる', () => {
    for (const value of [null, undefined, 42, { any: 'object' }]) {
      const result = transformError(value)

      expect(result.message).toBe('Unknown error occurred')
      expect(result.category).toBe('unknown')
      expect(result.level).toBe('error')
      expect(result.originalError).toBe(value)
    }
  })

  it('既に StructuredError ならそのまま返す', () => {
    const input = structured({ code: 'ERR_X' })

    expect(transformError(input)).toBe(input)
  })

  it('既に StructuredError でも context はマージされる', () => {
    const input = structured({ context: { a: 1 } })

    const result = transformError(input, { context: { b: 2 } })

    expect(result.context).toEqual({ a: 1, b: 2 })
    expect(result, '新しいオブジェクトを返す（元を破壊しない）').not.toBe(input)
    expect(input.context).toEqual({ a: 1 })
  })

  it('defaultUserMessage が userMessage より優先される', () => {
    const result = transformError(new Error('boom'), { defaultUserMessage: '独自の文言' })

    expect(result.userMessage).toBe('独自の文言')
  })

  it('context がオプションから渡される', () => {
    expect(transformError('boom', { context: { requestId: 'r-1' } }).context).toEqual({
      requestId: 'r-1',
    })
  })
})

describe('isStructuredError', () => {
  it('必須フィールドが揃っていれば true', () => {
    expect(isStructuredError(structured())).toBe(true)
  })

  it('timestamp が Date でなければ false', () => {
    expect(isStructuredError({ ...structured(), timestamp: '2026-08-30' })).toBe(false)
  })

  it('必須フィールドが欠けていれば false', () => {
    expect(isStructuredError({ message: 'x', level: 'error' })).toBe(false)
  })

  it('null / undefined / プリミティブは false', () => {
    for (const value of [null, undefined, 'error', 42, true]) {
      expect(isStructuredError(value)).toBe(false)
    }
  })
})

describe('handleError', () => {
  it('既定では構造化エラーを返し、ログを出す', () => {
    const spies = silenceConsole()

    const result = handleError(new Error('boom'))

    expect(result.message).toBe('boom')
    expect(spies.error).toHaveBeenCalled()
  })

  it('log: false ならログを出さない', () => {
    const spies = silenceConsole()

    handleError(new Error('boom'), { log: false })

    expect(spies.error).not.toHaveBeenCalled()
    expect(spies.warn).not.toHaveBeenCalled()
    expect(spies.info).not.toHaveBeenCalled()
  })

  it('rethrow: true なら throw する', () => {
    silenceConsole()

    expect(() => handleError(new Error('boom'), { rethrow: true })).toThrow('boom')
  })

  it('throw されるメッセージもサニタイズ済み', () => {
    silenceConsole()

    expect(() => handleError(new Error('password=hunter2'), { rethrow: true })).not.toThrow(
      /hunter2/
    )
  })
})

describe('tryCatch', () => {
  it('成功時は data を返す', async () => {
    const result = await tryCatch(() => Promise.resolve('ok'))

    expect(result.data).toBe('ok')
    expect(result.error).toBeUndefined()
  })

  it('失敗時は error を返し throw しない', async () => {
    silenceConsole()

    const result = await tryCatch(() => Promise.reject(new Error('boom')))

    expect(result.data).toBeUndefined()
    expect(result.error?.message).toBe('boom')
  })

  it('rethrow: true を渡しても throw しない（内部で false を強制している）', async () => {
    silenceConsole()

    const result = await tryCatch(() => Promise.reject(new Error('boom')), { rethrow: true })

    expect(result.error?.message).toBe('boom')
  })
})

describe('aggregateErrors', () => {
  it('空配列なら throw する', () => {
    expect(() => aggregateErrors([])).toThrow('No errors to aggregate')
  })

  it('1件ならそのまま返す', () => {
    const only = structured({ code: 'ERR_ONE' })

    expect(aggregateErrors([only])).toBe(only)
  })

  it('最も重大なレベルが選ばれる', () => {
    const result = aggregateErrors([
      structured({ level: 'info' }),
      structured({ level: 'critical' }),
      structured({ level: 'warning' }),
    ])

    expect(result.level).toBe('critical')
    expect(result.code).toBe('ERR_MULTIPLE')
    expect(result.message).toBe('Multiple errors occurred (3)')
  })

  it('最多のカテゴリが選ばれる', () => {
    const result = aggregateErrors([
      structured({ category: 'network' }),
      structured({ category: 'database' }),
      structured({ category: 'database' }),
    ])

    expect(result.category).toBe('database')
  })

  it('カテゴリが同数なら最初に出現したものが勝つ', () => {
    const result = aggregateErrors([
      structured({ category: 'network' }),
      structured({ category: 'database' }),
    ])

    expect(result.category).toBe('network')
  })

  it('元のエラーの要約が context に入る', () => {
    const result = aggregateErrors([
      structured({ code: 'ERR_A', message: 'a' }),
      structured({ code: 'ERR_B', message: 'b' }),
    ])

    expect(result.context?.errors).toEqual([
      { code: 'ERR_A', message: 'a', category: 'unknown', level: 'error' },
      { code: 'ERR_B', message: 'b', category: 'unknown', level: 'error' },
    ])
  })
})
