/**
 * ErrorBoundary の単体テスト。
 *
 * このテンプレートは「中間保護層パターン（ErrorBoundary → PageContent → API）」を
 * `scripts/check-boundaries.js` で要求している。その要となるコンポーネントが
 * 実際にエラーを捕捉し、アプリ全体を落とさないことを保証する。
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary, FeatureErrorBoundary } from './ErrorBoundary'

/** レンダリング時に必ず例外を投げる子コンポーネント */
function Boom(): React.ReactElement {
  throw new Error('意図的なテスト用エラー')
}

/**
 * React はエラー境界が捕捉したエラーを console.error に出力する。
 * テスト出力を汚さないよう、エラーを起こすテストの中だけ抑制する。
 */
const silenceReactErrorLog = () => vi.spyOn(console, 'error').mockImplementation(() => {})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('子がエラーを投げないとき、子をそのまま描画する', () => {
    render(
      <ErrorBoundary>
        <p>正常なコンテンツ</p>
      </ErrorBoundary>
    )

    expect(screen.getByText('正常なコンテンツ')).toBeInTheDocument()
    expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument()
  })

  it('子がエラーを投げたとき、フォールバックUIを描画して子を描画しない', () => {
    silenceReactErrorLog()

    render(
      <ErrorBoundary>
        <Boom />
        <p>この行は描画されない</p>
      </ErrorBoundary>
    )

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
    expect(
      screen.getByText('申し訳ございません。一時的な問題が発生しています。')
    ).toBeInTheDocument()
    expect(screen.queryByText('この行は描画されない')).not.toBeInTheDocument()
  })

  it('featureName を渡すと、どの機能で落ちたかがフォールバックUIに出る', () => {
    silenceReactErrorLog()

    render(
      <ErrorBoundary featureName="user">
        <Boom />
      </ErrorBoundary>
    )

    expect(screen.getByText('user機能でエラーが発生しました')).toBeInTheDocument()
  })

  it('fallback を渡すと既定のUIではなくそれを描画する', () => {
    silenceReactErrorLog()

    render(
      <ErrorBoundary fallback={<p>代替コンテンツ</p>}>
        <Boom />
      </ErrorBoundary>
    )

    expect(screen.getByText('代替コンテンツ')).toBeInTheDocument()
    expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument()
  })

  it('エラーは境界の外へ伝播せず、兄弟の描画を巻き込まない', () => {
    silenceReactErrorLog()

    render(
      <div>
        <p>境界の外のコンテンツ</p>
        <ErrorBoundary featureName="sales">
          <Boom />
        </ErrorBoundary>
      </div>
    )

    expect(screen.getByText('境界の外のコンテンツ')).toBeInTheDocument()
    expect(screen.getByText('sales機能でエラーが発生しました')).toBeInTheDocument()
  })
})

describe('FeatureErrorBoundary', () => {
  it('featureName 付きでエラーを捕捉する', () => {
    silenceReactErrorLog()

    render(
      <FeatureErrorBoundary featureName="accounting">
        <Boom />
      </FeatureErrorBoundary>
    )

    expect(screen.getByText('accounting機能でエラーが発生しました')).toBeInTheDocument()
  })

  it('エラーが無ければ子をそのまま描画する', () => {
    render(
      <FeatureErrorBoundary featureName="accounting">
        <p>会計コンテンツ</p>
      </FeatureErrorBoundary>
    )

    expect(screen.getByText('会計コンテンツ')).toBeInTheDocument()
  })
})
