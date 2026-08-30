/**
 * ユーザーフレンドリーなエラーメッセージ処理
 *
 * 技術的なエラーメッセージをユーザーが理解しやすい形式に変換します。
 * このモジュールは純粋関数で構成され、副作用を持ちません。
 */

import type { ErrorCategory, ErrorLevel, StructuredError } from './types'

/**
 * デフォルトのエラーメッセージマップ
 * よくあるエラーパターンとそのユーザー向けメッセージ
 */
const DEFAULT_ERROR_MESSAGES: Record<string, string> = {
  // ネットワークエラー
  ERR_NETWORK: 'ネットワーク接続に問題が発生しました。接続を確認してください。',
  ERR_TIMEOUT: '処理がタイムアウトしました。しばらく待ってから再度お試しください。',
  ERR_OFFLINE: 'インターネット接続がありません。接続を確認してください。',

  // 認証エラー
  ERR_UNAUTHORIZED: 'ログインが必要です。再度ログインしてください。',
  ERR_FORBIDDEN: 'この操作を行う権限がありません。',
  ERR_SESSION_EXPIRED: 'セッションの有効期限が切れました。再度ログインしてください。',

  // バリデーションエラー
  ERR_INVALID_INPUT: '入力内容に誤りがあります。確認して再度入力してください。',
  ERR_REQUIRED_FIELD: '必須項目が入力されていません。',
  ERR_FORMAT_ERROR: '入力形式が正しくありません。',

  // データベースエラー
  ERR_DATABASE: 'データベースエラーが発生しました。しばらく待ってから再度お試しください。',
  ERR_NOT_FOUND: '指定されたデータが見つかりませんでした。',
  ERR_DUPLICATE: '既に同じデータが存在します。',

  // システムエラー
  ERR_SYSTEM: 'システムエラーが発生しました。管理者にお問い合わせください。',
  ERR_UNKNOWN: '予期しないエラーが発生しました。しばらく待ってから再度お試しください。',
}

/**
 * エラーカテゴリに基づくデフォルトメッセージ
 */
const CATEGORY_DEFAULT_MESSAGES: Record<ErrorCategory, string> = {
  network: 'ネットワーク接続に問題が発生しました。',
  database: 'データの処理中にエラーが発生しました。',
  auth: '認証に問題が発生しました。',
  validation: '入力内容に誤りがあります。',
  business: '処理を完了できませんでした。',
  system: 'システムエラーが発生しました。',
  unknown: '予期しないエラーが発生しました。',
}

/**
 * エラーメッセージからエラーカテゴリを推測
 * @param message - エラーメッセージ
 * @returns 推測されたカテゴリ
 */
export function inferErrorCategory(message: string): ErrorCategory {
  const lowerMessage = message.toLowerCase()

  // ネットワーク関連
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('offline')
  ) {
    return 'network'
  }

  // 認証関連
  if (
    lowerMessage.includes('auth') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('jwt') ||
    lowerMessage.includes('token')
  ) {
    return 'auth'
  }

  // データベース関連
  if (
    lowerMessage.includes('database') ||
    lowerMessage.includes('query') ||
    lowerMessage.includes('sql') ||
    lowerMessage.includes('supabase')
  ) {
    return 'database'
  }

  // バリデーション関連
  if (
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('validation') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('format')
  ) {
    return 'validation'
  }

  return 'unknown'
}

/**
 * エラーメッセージからエラーレベルを推測
 * @param message - エラーメッセージ
 * @param category - エラーカテゴリ
 * @returns 推測されたレベル
 */
export function inferErrorLevel(message: string, category: ErrorCategory): ErrorLevel {
  const lowerMessage = message.toLowerCase()

  // Critical: システム停止レベル
  if (
    lowerMessage.includes('fatal') ||
    lowerMessage.includes('crash') ||
    lowerMessage.includes('critical')
  ) {
    return 'critical'
  }

  // Warning: 注意レベル
  if (
    lowerMessage.includes('warning') ||
    lowerMessage.includes('deprecated') ||
    category === 'validation'
  ) {
    return 'warning'
  }

  // Info: 情報レベル
  if (lowerMessage.includes('info') || lowerMessage.includes('notice')) {
    return 'info'
  }

  // デフォルトはerror
  return 'error'
}

/**
 * エラーコードからユーザーフレンドリーなメッセージを取得
 * @param code - エラーコード
 * @param fallback - フォールバックメッセージ
 * @returns ユーザー向けメッセージ
 */
export function getUserFriendlyMessage(code?: string, fallback?: string): string {
  if (code !== undefined && code in DEFAULT_ERROR_MESSAGES) {
    return DEFAULT_ERROR_MESSAGES[code as keyof typeof DEFAULT_ERROR_MESSAGES]
  }

  return fallback ?? (DEFAULT_ERROR_MESSAGES.ERR_UNKNOWN as string)
}

/**
 * エラーオブジェクトからユーザーフレンドリーなメッセージを生成
 * @param error - 構造化されたエラーオブジェクト
 * @returns ユーザー向けメッセージ
 */
export function formatUserMessage(error: StructuredError): string {
  // 既にユーザーメッセージが設定されている場合はそれを使用
  if (error.userMessage !== undefined) {
    return error.userMessage
  }

  // エラーコードから取得
  if (error.code !== undefined) {
    const message = getUserFriendlyMessage(error.code)
    if (message !== DEFAULT_ERROR_MESSAGES.ERR_UNKNOWN) {
      return message
    }
  }

  // カテゴリから取得
  return CATEGORY_DEFAULT_MESSAGES[error.category]
}

/**
 * 開発環境用の詳細エラーメッセージを生成
 * @param error - 構造化されたエラーオブジェクト
 * @returns 開発者向けの詳細メッセージ
 */
export function formatDeveloperMessage(error: StructuredError): string {
  const parts: string[] = []

  // エラーレベルとカテゴリ
  parts.push(`[${error.level.toUpperCase()}] [${error.category}]`)

  // エラーコード
  if (error.code !== undefined) {
    parts.push(`Code: ${error.code}`)
  }

  // メッセージ
  parts.push(error.message)

  // コンテキスト情報
  if (error.context && Object.keys(error.context).length > 0) {
    parts.push(`Context: ${JSON.stringify(error.context)}`)
  }

  // タイムスタンプ
  parts.push(`Time: ${error.timestamp.toISOString()}`)

  return parts.join(' | ')
}

/**
 * 機密情報のキーと値（`key=値` / `key: 値`）を拾うパターン
 *
 * `client_secret` / `access_token` / `X-Api-Key` のようにキーワードの前後に語が付く形も
 * 拾うため、キーワードを `[\w-]*` で挟む。
 * `=` または `:` の後に値がある場合のみ一致するので、
 * 「Invalid password format」「The token has expired」のような文中の単語は伏せない。
 *
 * 走査対象はエラーメッセージ1件（人間が読める長さ）で、外部入力が
 * 無制限に長くなる経路では使わないため、後戻りの実害はない。
 */
const SECRET_ASSIGNMENT_PATTERN =
  // eslint-disable-next-line sonarjs/slow-regex -- 入力はエラーメッセージ1件のみで長さが実用上限られる
  /([\w-]*(?:password|token|secret|api[_-]?key)[\w-]*)\s*[=:]\s*['"]?[^'"\s]+['"]?/gi

/**
 * `Bearer <値>` のパターン
 * `=` `:` を伴わないため専用に扱う。
 */
const BEARER_PATTERN = /\b(bearer)\s+([\w.~+/=-]{8,})/gi

/**
 * 接続文字列に埋め込まれた資格情報（`<scheme>://<user>:<password>@<host>`）
 *
 * ホストとポートは障害調査に必要なので残し、ユーザー名とパスワードだけ伏せる。
 * `:` `@` が揃った形だけに一致するため、`https://example.com/docs` のような
 * 資格情報を持たない URL は変化しない。
 */
// eslint-disable-next-line sonarjs/slow-regex -- 入力はエラーメッセージ1件のみで長さが実用上限られる
const CONNECTION_CREDENTIALS_PATTERN = /([a-z][\w+.-]*:\/\/)[^\s:@/]+:[^\s@/]+@/gi

/**
 * メールアドレス（ローカル部のみ伏せ、ドメインは調査のため残す）
 */
// eslint-disable-next-line sonarjs/slow-regex -- Email regex is bounded and safe
const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g

/**
 * `Bearer` の後ろの語が資格情報らしいか判定する
 *
 * 「bearer authentication failed」のような通常の文まで伏せると調査できなくなるため、
 * 小文字英字だけの短い語（＝英単語）は資格情報とみなさない。
 * 実際のトークンは大文字・数字・記号を含むか、十分に長い。
 */
function looksLikeCredential(value: string): boolean {
  return value.length >= 20 || /[^a-z]/.test(value)
}

/**
 * エラーメッセージのサニタイズ
 * セキュリティ上重要な情報を除去
 *
 * この結果は transformError → StructuredError.message → logError の経路で
 * コンソールへ出るため、伏せ漏れはそのままログへの漏洩になる。
 * 一方で伏せすぎると調査できなくなるので、**値を伴う場合だけ**伏せる。
 *
 * @param message - 元のメッセージ
 * @returns サニタイズされたメッセージ
 */
export function sanitizeErrorMessage(message: string): string {
  let sanitized = message

  // Bearer トークン（キーワード置換より先に処理する。
  // 「access_token: Bearer eyJ...」のとき、先にキー側を伏せると値が "Bearer" で止まり
  // 後続の実トークンが残ってしまうため）
  sanitized = sanitized.replace(BEARER_PATTERN, (match, keyword: string, value: string) =>
    looksLikeCredential(value) ? `${keyword} ***` : match
  )

  // password / token / secret / api_key などのキーと値
  sanitized = sanitized.replace(SECRET_ASSIGNMENT_PATTERN, '$1=***')

  // 接続文字列の資格情報（メール置換より先に処理する。
  // 後に回すとメール用パターンが user:pass@host を拾って1文字目が残る）
  sanitized = sanitized.replace(CONNECTION_CREDENTIALS_PATTERN, '$1***:***@')

  // メールアドレス（部分的に隠す）
  sanitized = sanitized.replace(EMAIL_PATTERN, (_match, local, domain) => {
    const hiddenLocal = String(local).charAt(0) + '***'
    return `${hiddenLocal}@${domain}`
  })

  return sanitized
}
