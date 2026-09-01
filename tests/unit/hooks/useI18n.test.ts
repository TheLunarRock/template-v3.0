/**
 * src/hooks/useI18n.ts の単体テスト。
 *
 * このフックはテンプレート同梱のユーティリティとして配られる。初期ロケールの
 * 決定順（localStorage → navigator.language → defaultLocale）が崩れても例外は
 * 出ず、ただ「言語が勝手に変わる」形で表面化するため、テストが無いと気付けない。
 *
 * 返却オブジェクトの参照安定性も検証する。ここが壊れると消費側の useEffect が
 * 毎レンダー再実行され、無限ループの温床になる（実装が useMemo を使っている意図）。
 *
 * navigator.language と localStorage はテストごとにモックし、状態を持ち越さない。
 * localStorage は tests/setup.ts が vi.fn() ベースのモックへ差し替えているため、
 * spy ではなく mockReturnValue / mockClear で制御する。
 *
 * @category ユニット
 * @priority 🟡 important
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useI18n, getLocaleDisplayName, type Locale } from '@/hooks/useI18n'

// メソッドを値として取り回すと unbound-method に触れるため、
// spyOn の戻り値（束縛済みのモック）だけを保持して操作する
let getItemSpy: MockInstance<(key: string) => string | null>
let setItemSpy: MockInstance<(key: string, value: string) => void>

/** navigator.language を差し替える */
function mockBrowserLanguage(language: string): void {
  vi.spyOn(window.navigator, 'language', 'get').mockReturnValue(language)
}

/** localStorage.getItem('locale') の戻り値を差し替える */
function mockSavedLocale(value: string | null): void {
  getItemSpy.mockReturnValue(value)
}

beforeEach(() => {
  getItemSpy = vi.spyOn(localStorage, 'getItem')
  setItemSpy = vi.spyOn(localStorage, 'setItem')
  // 既定は「保存値なし」。jsdom の既定言語に引きずられないよう明示する
  mockSavedLocale(null)
  mockBrowserLanguage('ja-JP')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('初期ロケールの決定順', () => {
  it('localStorage の保存値が navigator.language より優先される', () => {
    mockSavedLocale('en')
    mockBrowserLanguage('ja-JP')

    const { result } = renderHook(() => useI18n())

    expect(result.current.locale).toBe('en')
  })

  it('保存値が無ければ navigator.language の言語部分を使う', () => {
    mockSavedLocale(null)
    mockBrowserLanguage('en-US')

    const { result } = renderHook(() => useI18n())

    expect(result.current.locale).toBe('en')
  })

  it('navigator.language が対応外なら defaultLocale になる', () => {
    mockSavedLocale(null)
    mockBrowserLanguage('fr-FR')

    const { result } = renderHook(() => useI18n())

    expect(result.current.locale).toBe('ja')
  })

  it('保存値が対応外なら navigator.language へフォールバックする', () => {
    mockSavedLocale('fr')
    mockBrowserLanguage('en-US')

    const { result } = renderHook(() => useI18n())

    expect(result.current.locale).toBe('en')
  })

  it('保存値も navigator.language も対応外なら defaultLocale になる', () => {
    mockSavedLocale('de')
    mockBrowserLanguage('de-DE')

    const { result } = renderHook(() => useI18n())

    expect(result.current.locale).toBe('ja')
  })

  it('地域コードが無い navigator.language でも判定できる', () => {
    mockSavedLocale(null)
    mockBrowserLanguage('en')

    const { result } = renderHook(() => useI18n())

    expect(result.current.locale).toBe('en')
  })
})

describe('setLocale', () => {
  it('対応ロケールを受け付けて状態を更新し、localStorage に保存する', () => {
    const { result } = renderHook(() => useI18n())

    act(() => {
      result.current.setLocale('en')
    })

    expect(result.current.locale).toBe('en')
    expect(setItemSpy).toHaveBeenCalledWith('locale', 'en')
  })

  it('対応外の値では状態も localStorage も変わらない', () => {
    const { result } = renderHook(() => useI18n())
    const before = result.current.locale

    act(() => {
      result.current.setLocale('fr' as Locale)
    })

    expect(result.current.locale).toBe(before)
    expect(setItemSpy).not.toHaveBeenCalled()
  })
})

describe('t（翻訳関数）', () => {
  it('現状はキーをそのまま返す（翻訳ファイル導入時の拡張点）', () => {
    const { result } = renderHook(() => useI18n())

    expect(result.current.t('greeting.hello')).toBe('greeting.hello')
  })

  it('namespace を渡しても現状はキーをそのまま返す（namespace は将来の拡張用）', () => {
    const { result } = renderHook(() => useI18n())

    expect(result.current.t('title', 'settings')).toBe('title')
  })
})

describe('返却オブジェクトの参照安定性', () => {
  it('locale が変わらない再レンダーでは同一参照を返す', () => {
    const { result, rerender } = renderHook(() => useI18n())
    const first = result.current

    rerender()
    rerender()

    expect(result.current).toBe(first)
  })

  it('locale が変わったときは新しい参照を返す', () => {
    const { result } = renderHook(() => useI18n())
    const first = result.current

    act(() => {
      result.current.setLocale('en')
    })

    expect(result.current).not.toBe(first)
    expect(result.current.locale).toBe('en')
  })

  it('setLocale と t は再レンダーをまたいで同一参照を保つ', () => {
    const { result, rerender } = renderHook(() => useI18n())
    const { setLocale, t } = result.current

    rerender()

    expect(result.current.setLocale).toBe(setLocale)
    expect(result.current.t).toBe(t)
  })
})

describe('locales', () => {
  it('対応ロケールの一覧を返す', () => {
    const { result } = renderHook(() => useI18n())

    expect(result.current.locales).toEqual(['ja', 'en'])
  })
})

describe('getLocaleDisplayName', () => {
  it.each([
    ['ja', '日本語'],
    ['en', 'English'],
  ])('%s の表示名を返す', (locale, expected) => {
    expect(getLocaleDisplayName(locale as Locale)).toBe(expected)
  })

  it('未知のロケールは値をそのまま返す', () => {
    expect(getLocaleDisplayName('fr' as Locale)).toBe('fr')
  })
})
