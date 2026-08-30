/**
 * 構造化エラーを投げるための例外クラス
 *
 * `StructuredError` はプレーンオブジェクトのため、そのまま `throw` すると
 * 呼び出し側の `catch (e)` で `e instanceof Error` が false になり、stack も付かない。
 * JavaScript の慣習（throw されるのは Error 派生）に合わせつつ、
 * 構造化情報を `structured` プロパティで失わずに伝える。
 */

import type { StructuredError } from './types'

export class StructuredErrorException extends Error {
  /** 元の構造化エラー（code / level / category / userMessage / context 等を保持） */
  readonly structured: StructuredError

  constructor(structured: StructuredError) {
    super(structured.message)
    this.name = 'StructuredErrorException'
    this.structured = structured
  }
}
