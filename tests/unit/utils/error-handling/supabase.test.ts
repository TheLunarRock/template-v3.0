/**
 * src/utils/error-handling/supabase.ts の単体テスト。
 *
 * 期待値は実装の対応表（SUPABASE_ERROR_MAP / SUPABASE_USER_MESSAGES）に合わせている。
 * 仕様を推測して書かず、現状の挙動を固定する（気になった挙動は報告に記載）。
 *
 * Supabase クライアントには一切触れない。検証対象の関数はプレーンなオブジェクトと
 * コールバックだけを受け取るため、ネットワークアクセスは発生しない。
 */
/* eslint-disable sonarjs/no-hardcoded-passwords -- サニタイズ対象のダミー値であり、実在の資格情報ではない */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  checkSupabaseResponse,
  isSupabaseError,
  safeSupabaseOperation,
  StructuredErrorException,
  transformSupabaseError,
} from '@/utils/error-handling'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('isSupabaseError', () => {
  it.each([
    ['code を持つ', { message: 'duplicate key', code: '23505' }],
    ['statusCode を持つ', { message: 'bad request', statusCode: 400 }],
    ['details を持つ', { message: 'failed', details: 'Key (id)=(1) already exists' }],
    ['hint を持つ', { message: 'failed', hint: 'Perhaps you meant column "name"' }],
  ])('message + %s なら true', (_label, value) => {
    expect(isSupabaseError(value)).toBe(true)
  })

  it('通常の Error は false（message はあるが Supabase 固有プロパティが無い）', () => {
    expect(isSupabaseError(new Error('boom'))).toBe(false)
  })

  it('message が無ければ false', () => {
    expect(isSupabaseError({ code: '23505' })).toBe(false)
  })

  it('null / undefined / プリミティブは false', () => {
    for (const value of [null, undefined, 'error', 42, true]) {
      expect(isSupabaseError(value)).toBe(false)
    }
  })
})

describe('transformSupabaseError', () => {
  it.each([
    ['23505', 'ERR_DUPLICATE', 'database', '既に同じデータが登録されています。'],
    ['23503', 'ERR_FOREIGN_KEY', 'database', '関連するデータが見つかりません。'],
    ['23502', 'ERR_NOT_NULL', 'database', '必須項目が入力されていません。'],
    [
      '42P01',
      'ERR_TABLE_NOT_FOUND',
      'database',
      'データベースの設定に問題があります。管理者にお問い合わせください。',
    ],
    ['42501', 'ERR_FORBIDDEN', 'auth', 'この操作を行う権限がありません。'],
    [
      'invalid_credentials',
      'ERR_INVALID_CREDENTIALS',
      'auth',
      'メールアドレスまたはパスワードが正しくありません。',
    ],
  ])('code %s → %s / %s', (code, expectedCode, expectedCategory, expectedUserMessage) => {
    const result = transformSupabaseError({ message: 'operation failed', code })

    expect(result.code).toBe(expectedCode)
    expect(result.category).toBe(expectedCategory)
    expect(result.userMessage).toBe(expectedUserMessage)
  })

  it('code が対応表に無いときはメッセージから推測する', () => {
    const result = transformSupabaseError({ message: 'JWT expired', code: 'PGRST301' })

    expect(result.code).toBe('ERR_UNAUTHORIZED')
    expect(result.category).toBe('auth')
  })

  it('code もメッセージも手掛かりが無ければ ERR_UNKNOWN にフォールバックする', () => {
    const result = transformSupabaseError({ message: 'something odd happened', code: 'PGRST999' })

    expect(result.code).toBe('ERR_UNKNOWN')
    expect(result.category).toBe('unknown')
    expect(result.userMessage, 'DB 操作の文脈に合う文言を返す（汎用文言に潰されない）').toBe(
      'データベースエラーが発生しました。しばらく待ってから再度お試しください。'
    )
  })

  it('メッセージがサニタイズされる', () => {
    const result = transformSupabaseError({
      message: 'insert failed for password=hunter2',
      code: '23505',
    })

    expect(result.message).not.toContain('hunter2')
  })

  it('Supabase 固有情報が context にまとめられ、呼び出し側の context とマージされる', () => {
    const result = transformSupabaseError(
      { message: 'duplicate key', code: '23505', statusCode: 409, details: 'Key (id)=(1)' },
      { table: 'users' }
    )

    expect(result.context).toEqual({
      table: 'users',
      supabase: { code: '23505', statusCode: 409, details: 'Key (id)=(1)', hint: undefined },
    })
  })

  it('Supabase エラーでない Error は ERR_UNKNOWN として扱われ、メッセージがサニタイズされる', () => {
    const result = transformSupabaseError(new Error('boom with token=abc123'))

    expect(result.code).toBe('ERR_UNKNOWN')
    expect(result.category).toBe('unknown')
    expect(result.message).not.toContain('abc123')
    expect(result.originalError).toBeInstanceOf(Error)
  })

  it('環境変数未設定は ERR_CONFIG / critical / system として特別扱いされる', () => {
    const result = transformSupabaseError(new Error('Missing Supabase environment variables'))

    expect(result.code).toBe('ERR_CONFIG')
    expect(result.level).toBe('critical')
    expect(result.category).toBe('system')
    expect(result.userMessage).toBe(
      'データベース接続が設定されていません。管理者にお問い合わせください。'
    )
  })

  it('Error でも Supabase エラーでもない値は文字列化される', () => {
    expect(transformSupabaseError(42).message).toBe('42')
  })

  it('development では stack がサニタイズされる', () => {
    vi.stubEnv('NODE_ENV', 'development')

    const result = transformSupabaseError(new Error('insert failed for password=hunter2'))

    expect(result.stack, 'development では stack を保持する').toBeDefined()
    expect(
      result.stack,
      'stack の1行目は "Error: <生のmessage>" を含むため、message だけ伏せても意味がない'
    ).not.toContain('hunter2')
  })

  it('環境変数未設定の分岐でも message がサニタイズされる', () => {
    const result = transformSupabaseError(
      new Error('Missing Supabase environment variables (api_key=sk-live-abc123)')
    )

    expect(result.code).toBe('ERR_CONFIG')
    expect(result.message).not.toContain('sk-live-abc123')
  })

  it('production では stack を持たない', () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect(transformSupabaseError(new Error('boom')).stack).toBeUndefined()
  })
})

describe('safeSupabaseOperation', () => {
  it('成功時は data を返す', async () => {
    const result = await safeSupabaseOperation(() => Promise.resolve({ id: 1 }))

    expect(result.data).toEqual({ id: 1 })
    expect(result.error).toBeUndefined()
  })

  it('失敗時は throw せず構造化エラーを返す', async () => {
    // Supabase クライアントは Error ではなくプレーンオブジェクトを投げるため、その形を再現する
    const result = await safeSupabaseOperation(() => {
      throw { message: 'duplicate key', code: '23505' }
    })

    expect(result.data).toBeUndefined()
    expect(result.error?.code).toBe('ERR_DUPLICATE')
  })

  it('development では失敗を整形済み文字列でコンソールに出す', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await safeSupabaseOperation(() => Promise.reject(new Error('boom')))

    expect(spy).toHaveBeenCalledWith('Supabase operation failed:', expect.any(String))
    expect(String(spy.mock.calls[0][1])).toContain('[ERROR] [unknown]')
  })

  it('ログに originalError の生の値が展開されない', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await safeSupabaseOperation(() => Promise.reject(new Error('login failed: password=hunter2')))

    const logged = spy.mock.calls.flat().map(String).join(' ')
    expect(logged, '構造体をそのまま渡すと originalError の生メッセージが展開される').not.toContain(
      'hunter2'
    )
  })

  it('development 以外ではコンソールに出さない', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await safeSupabaseOperation(() => Promise.reject(new Error('boom')))

    expect(spy).not.toHaveBeenCalled()
  })
})

describe('checkSupabaseResponse', () => {
  it('error が無く data があればそのまま返す', () => {
    expect(checkSupabaseResponse({ data: { id: 1 }, error: null })).toEqual({ id: 1 })
  })

  it('error があるとき Error 派生（StructuredErrorException）を throw する', () => {
    let thrown: unknown

    try {
      checkSupabaseResponse({ data: null, error: { message: 'duplicate key', code: '23505' } })
    } catch (error) {
      thrown = error
    }

    expect(thrown, 'catch 側で instanceof Error が成立する').toBeInstanceOf(Error)
    expect(thrown).toBeInstanceOf(StructuredErrorException)
    expect((thrown as Error).stack, 'Error 派生なので stack を持つ').toBeDefined()
  })

  it('throw された例外から構造化情報を失わずに取り出せる', () => {
    try {
      checkSupabaseResponse({ data: null, error: { message: 'duplicate key', code: '23505' } })
      expect.unreachable('throw されるはず')
    } catch (error) {
      const exception = error as StructuredErrorException

      expect(exception.name).toBe('StructuredErrorException')
      expect(exception.message).toBe('duplicate key')
      expect(exception.structured.code).toBe('ERR_DUPLICATE')
      expect(exception.structured.category).toBe('database')
      expect(exception.structured.userMessage).toBe('既に同じデータが登録されています。')
    }
  })

  it('error が無く data が null なら Error を throw する', () => {
    expect(() => checkSupabaseResponse({ data: null, error: null })).toThrow(
      'No data returned from Supabase'
    )
  })

  it('data が 0 や空文字でも「データあり」として返す', () => {
    expect(checkSupabaseResponse<number>({ data: 0, error: null })).toBe(0)
    expect(checkSupabaseResponse<string>({ data: '', error: null })).toBe('')
  })
})
