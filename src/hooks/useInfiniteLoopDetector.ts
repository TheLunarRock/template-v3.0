/**
 * 🔥 無限ループ検出フック - 開発環境専用
 *
 * 用途:
 * - useEffectの実行回数を監視
 * - 異常な実行頻度を検出して警告
 * - 開発者への教育メッセージ表示
 *
 * 注意:
 * - NODE_ENV=production では完全に無効化
 * - パフォーマンス影響を最小限に抑制
 */

import { useEffect, useRef } from 'react'

interface LoopDetectorOptions {
  /** 監視する名前（デバッグ用） */
  name: string
  /** 警告を出すまでの実行回数（デフォルト: 10） */
  threshold?: number
  /** 監視する時間窓（ミリ秒、デフォルト: 5000） */
  timeWindow?: number
  /** カスタム警告メッセージ */
  customMessage?: string
}

interface ExecutionInfo {
  count: number
  firstExecution: number
  lastExecution: number
}

// 実行情報をグローバルに保存（開発環境のみ）
const executionMap = new Map<string, ExecutionInfo>()

/**
 * 無限ループ検出フック
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   useInfiniteLoopDetector({ name: 'MyComponent-effect' })
 *
 *   useEffect(() => {
 *     // 監視対象の処理
 *   }, [dependency])
 * }
 * ```
 */
export const useInfiniteLoopDetector = (options: LoopDetectorOptions) => {
  const { name, threshold = 10, timeWindow = 5000, customMessage } = options

  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    // プロダクション環境では何もしない
    if (process.env.NODE_ENV === 'production') {
      return
    }

    const now = Date.now()
    const existing = executionMap.get(name)

    // 時間窓のあいだ実行が途切れたらカウントを捨てる（メモリリーク防止）。
    // 初回実行でも張る。ここを早期 return の後ろに置くと、1 回しか
    // レンダーされないコンポーネントのエントリが永久に残る。
    const scheduleReset = (): void => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        executionMap.delete(name)
      }, timeWindow)
    }

    if (!existing) {
      // 初回実行。警告判定には入らず、リセットの予約だけ行う
      executionMap.set(name, {
        count: 1,
        firstExecution: now,
        lastExecution: now,
      })
      scheduleReset()
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
        }
      }
    }

    // 実行情報を更新
    const updated: ExecutionInfo = {
      count: existing.count + 1,
      firstExecution: existing.firstExecution,
      lastExecution: now,
    }
    executionMap.set(name, updated)

    // 時間窓内での実行回数をチェック
    const timeElapsed = now - existing.firstExecution

    if (timeElapsed < timeWindow && updated.count >= threshold) {
      const frequency = updated.count / (timeElapsed / 1000)

      // eslint-disable-next-line no-console
      console.group('🔥 無限ループ警告')
      // eslint-disable-next-line no-console
      console.error(
        `%c無限ループの可能性を検出しました！`,
        'color: red; font-weight: bold; font-size: 16px'
      )
      // eslint-disable-next-line no-console
      console.warn(`コンポーネント: ${name}`)
      // eslint-disable-next-line no-console
      console.warn(`実行回数: ${updated.count}回`)
      // eslint-disable-next-line no-console
      console.warn(`経過時間: ${timeElapsed}ms`)
      // eslint-disable-next-line no-console
      console.warn(`実行頻度: ${frequency.toFixed(1)}回/秒`)

      if (customMessage && customMessage.length > 0) {
        // eslint-disable-next-line no-console
        console.info(`💡 ${customMessage}`)
      } else {
        // eslint-disable-next-line no-console
        console.info(`💡 対策:
1. useEffect の依存配列をチェック
2. オブジェクト・配列は useMemo で安定化
3. 関数は useCallback で安定化
4. setState内で同じstateを参照していないか確認`)
      }

      // eslint-disable-next-line no-console
      console.info(`📚 詳細: docs/INFINITE_LOOP_PREVENTION.md`)
      // eslint-disable-next-line no-console
      console.groupEnd()

      // デバッガーで一時停止（開発者が選択可能）
      if (confirm('無限ループを検出しました。デバッガーで一時停止しますか？')) {
        debugger // eslint-disable-line no-debugger
      }
    }

    scheduleReset()

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  })

  // アンマウント時にエントリを捨てる。
  // 上の effect は依存配列を持たない（毎レンダーの実行回数を数えるため）ので、
  // その cleanup に delete を足すと毎レンダーでカウントが消え、検出が機能しなくなる。
  // name をキーにした専用の effect にすることで、アンマウント時だけ削除できる。
  useEffect(() => {
    return () => {
      executionMap.delete(name)
    }
  }, [name])
}

/**
 * useEffect専用の無限ループ検出フック
 * useEffectと一緒に使用する便利関数
 *
 * @example
 * ```tsx
 * const MyComponent = ({ userId }) => {
 *   useEffectLoopDetector('user-data-fetch')
 *
 *   useEffect(() => {
 *     fetchUserData(userId)
 *   }, [userId]) // このuseEffectを監視
 * }
 * ```
 */
export const useEffectLoopDetector = (
  name: string,
  options?: Omit<LoopDetectorOptions, 'name'>
) => {
  useInfiniteLoopDetector({ name, ...options })
}

/**
 * 実行統計をコンソールに出力（デバッグ用）
 */
export const logExecutionStats = () => {
  if (process.env.NODE_ENV === 'production') {
    return
  }

  // eslint-disable-next-line no-console
  console.table(
    Array.from(executionMap.entries()).map(([name, info]) => ({
      name,
      count: info.count,
      duration: `${info.lastExecution - info.firstExecution}ms`,
      frequency: `${(info.count / ((info.lastExecution - info.firstExecution) / 1000)).toFixed(1)}/sec`,
    }))
  )
}

// 開発環境でのみグローバルに公開
if (process.env.NODE_ENV !== 'production') {
  ;(globalThis as unknown as { logExecutionStats: () => void }).logExecutionStats =
    logExecutionStats
  // eslint-disable-next-line no-console
  console.info(
    '🔍 無限ループ検出機能が有効です。統計を見るには logExecutionStats() を実行してください。'
  )
}
