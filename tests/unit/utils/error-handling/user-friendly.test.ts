/**
 * src/utils/error-handling/user-friendly.ts の単体テスト。
 *
 * 特に sanitizeErrorMessage は、transformError → StructuredError.message → logError
 * という経路でコンソールへ出るため、伏せ漏れがそのままログへの機密情報漏洩になる。
 * 「漏らさない」と「過剰に伏せない（調査できる形で残す）」の両方を検証する。
 */
/* eslint-disable sonarjs/no-hardcoded-passwords -- サニタイズ対象のダミー値であり、実在の資格情報ではない */

import { describe, it, expect } from 'vitest'
import {
  formatDeveloperMessage,
  getUserFriendlyMessage,
  inferErrorCategory,
  inferErrorLevel,
  sanitizeErrorMessage,
  transformError,
  type StructuredError,
} from '@/utils/error-handling'

describe('sanitizeErrorMessage', () => {
  describe('機密情報を伏せる（回帰防止）', () => {
    it('password=値 を伏せる', () => {
      const result = sanitizeErrorMessage('login failed: password=hunter2')
      expect(result).not.toContain('hunter2')
      expect(result).toContain('***')
    })

    it("password: '値' （コロン + クォート）も伏せる", () => {
      const result = sanitizeErrorMessage("auth error password: 'hunter2'")
      expect(result).not.toContain('hunter2')
    })

    it('token=値 を伏せる', () => {
      const result = sanitizeErrorMessage('request failed token=abc123')
      expect(result).not.toContain('abc123')
    })

    it('api_key / apikey を伏せる', () => {
      expect(sanitizeErrorMessage('api_key=xxxsecretvalue')).not.toContain('xxxsecretvalue')
      expect(sanitizeErrorMessage('apikey: xxxsecretvalue')).not.toContain('xxxsecretvalue')
    })

    it('メールアドレスはローカル部だけ伏せ、ドメインは残す', () => {
      const result = sanitizeErrorMessage('user not found: taro.yamada@example.com')
      expect(result).toContain('t***@example.com')
      expect(result).not.toContain('taro.yamada@')
    })
  })

  describe('漏れていたケース', () => {
    it('Authorization: Bearer <JWT> のトークンが残らない', () => {
      const result = sanitizeErrorMessage(
        'request denied. Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.def'
      )
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiJ9')
      expect(result).not.toContain('abc.def')
    })

    it('secret=値 / client_secret: 値 を伏せる', () => {
      expect(sanitizeErrorMessage('oauth failed secret=abc123')).not.toContain('abc123')
      expect(sanitizeErrorMessage('oauth failed client_secret: xyz789')).not.toContain('xyz789')
    })

    it('Bearer <APIキー> を伏せる', () => {
      const result = sanitizeErrorMessage('upstream rejected: Bearer sk-proj-abcdef')
      expect(result).not.toContain('sk-proj-abcdef')
    })
  })

  describe('壊してはいけない性質', () => {
    it('冪等（2回通しても結果が変わらない）', () => {
      const inputs = [
        'login failed: password=hunter2',
        'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.def',
        'user not found: taro.yamada@example.com',
        'oauth failed client_secret: xyz789',
      ]

      for (const input of inputs) {
        const once = sanitizeErrorMessage(input)
        expect(sanitizeErrorMessage(once), `冪等でない: ${input}`).toBe(once)
      }
    })

    it('値を伴わないキーワードは伏せず、文意が読める形で残す', () => {
      expect(sanitizeErrorMessage('Invalid password format')).toBe('Invalid password format')
      expect(sanitizeErrorMessage('The token has expired')).toBe('The token has expired')
      expect(sanitizeErrorMessage('This endpoint requires a secret')).toBe(
        'This endpoint requires a secret'
      )
      expect(sanitizeErrorMessage('bearer authentication failed')).toBe(
        'bearer authentication failed'
      )
    })

    it('機密情報を含まないメッセージは一切変更しない', () => {
      const message = 'Failed to fetch /api/users (status 500)'
      expect(sanitizeErrorMessage(message)).toBe(message)
    })
  })
})

describe('inferErrorCategory', () => {
  it.each([
    ['Network request failed', 'network'],
    ['fetch timeout', 'network'],
    ['unauthorized access', 'auth'],
    ['jwt malformed', 'auth'],
    ['database query failed', 'database'],
    ['supabase connection lost', 'database'],
    ['invalid input value', 'validation'],
    ['required field is missing', 'validation'],
  ])('"%s" → %s', (message, expected) => {
    expect(inferErrorCategory(message)).toBe(expected)
  })

  it('既知のキーワードを含まないメッセージは unknown', () => {
    expect(inferErrorCategory('something went wrong')).toBe('unknown')
  })
})

describe('inferErrorLevel', () => {
  it('fatal / crash / critical は critical', () => {
    expect(inferErrorLevel('fatal error occurred', 'system')).toBe('critical')
    expect(inferErrorLevel('app crash detected', 'system')).toBe('critical')
  })

  it('warning / deprecated は warning', () => {
    expect(inferErrorLevel('deprecated API used', 'system')).toBe('warning')
  })

  it('カテゴリが validation なら warning', () => {
    expect(inferErrorLevel('入力エラー', 'validation')).toBe('warning')
  })

  it('info / notice は info', () => {
    expect(inferErrorLevel('info: retrying', 'network')).toBe('info')
  })

  it('どれにも当てはまらなければ error', () => {
    expect(inferErrorLevel('something went wrong', 'unknown')).toBe('error')
  })

  it('critical 判定は warning 判定より優先される', () => {
    expect(inferErrorLevel('critical validation failure', 'validation')).toBe('critical')
  })
})

describe('getUserFriendlyMessage', () => {
  it('既知のコードは対応する日本語メッセージを返す', () => {
    expect(getUserFriendlyMessage('ERR_NETWORK')).toBe(
      'ネットワーク接続に問題が発生しました。接続を確認してください。'
    )
  })

  it('未知のコードは fallback を返す', () => {
    expect(getUserFriendlyMessage('ERR_NOT_DEFINED', '独自メッセージ')).toBe('独自メッセージ')
  })

  it('コードも fallback も無ければ既定文言を返す', () => {
    expect(getUserFriendlyMessage()).toBe(
      '予期しないエラーが発生しました。しばらく待ってから再度お試しください。'
    )
  })
})

describe('formatDeveloperMessage', () => {
  const error: StructuredError = {
    code: 'ERR_NETWORK',
    message: 'fetch failed',
    level: 'error',
    category: 'network',
    context: { url: '/api/users' },
    timestamp: new Date('2026-08-30T12:34:56.000Z'),
  }

  it('レベル・カテゴリ・コード・メッセージ・コンテキスト・時刻がすべて含まれる', () => {
    const result = formatDeveloperMessage(error)

    expect(result).toContain('[ERROR]')
    expect(result).toContain('[network]')
    expect(result).toContain('Code: ERR_NETWORK')
    expect(result).toContain('fetch failed')
    expect(result).toContain('"url":"/api/users"')
    expect(result).toContain('Time: 2026-08-30T12:34:56.000Z')
  })

  it('code とコンテキストが無い場合はその項目を出さない', () => {
    const minimal: StructuredError = {
      message: 'plain failure',
      level: 'warning',
      category: 'unknown',
      timestamp: new Date('2026-08-30T00:00:00.000Z'),
    }
    const result = formatDeveloperMessage(minimal)

    expect(result).toContain('[WARNING] [unknown]')
    expect(result).not.toContain('Code:')
    expect(result).not.toContain('Context:')
  })
})

describe('transformError のサニタイズ適用', () => {
  it('Error 経由でも message に生の値が残らない', () => {
    const structured = transformError(new Error('login failed: password=hunter2'))

    expect(structured.message).not.toContain('hunter2')
    expect(structured.message).toContain('***')
  })

  it('文字列経由でも message に生の値が残らない', () => {
    const structured = transformError('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.def')

    expect(structured.message).not.toContain('eyJhbGciOiJIUzI1NiJ9')
  })
})
