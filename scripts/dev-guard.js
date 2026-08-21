#!/usr/bin/env node
/**
 * dev サーバー起動ガード（AI エージェント対策）
 *
 * 背景:
 *   AI コーディングエージェント（Cursor / Claude Code / Codex / Aider 等）が
 *   `pnpm dev` を実行すると、`next dev` はフォアグラウンドに常駐するため
 *   エージェントのターミナルがブロックされ、開発フローがそこで停止する。
 *   Cursor 側の command denylist は 1.3 で公式に非推奨化されており
 *   （バイパス経路が複数報告されたため）、エディタ設定では確実に止められない。
 *   そこで「起動される側」でツール非依存に止める。
 *
 * 方針:
 *   1. ALLOW_DEV_SERVER=1 → 無条件で通す（人間の明示オプトイン用エスケープ）
 *   2. AI エージェント / CI の環境変数を検出 → 拒否（exit 1）
 *   3. 非対話実行（stdin が TTY でない）→ 拒否（exit 1）
 *   4. 人間の対話ターミナル → タイムアウト付き確認プロンプトを通過したら起動
 *
 *   拒否時は常に代替手段（pnpm build）を案内する。ハングさせず即座に終了するため、
 *   エージェントが誤って起動しても開発は止まらない。
 */

'use strict'

const CONFIRM_TIMEOUT_MS = 10_000

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

/**
 * 実行元が AI エージェント / 自動化環境かを環境変数から判定する。
 * 検出できた場合はその名称、人間の可能性がある場合は null を返す。
 *
 * 注: Cursor の統合ターミナルは人間が手打ちする場合も CURSOR_* を持つため、
 *     Cursor 固有の変数は判定に使わない（人間の誤検知を避ける）。
 *     Cursor Agent は非対話実行になるため TTY 判定側で捕捉する。
 */
function detectAutomation() {
  const markers = [
    ['CLAUDECODE', 'Claude Code'],
    ['CLAUDE_CODE', 'Claude Code'],
    ['CURSOR_AGENT', 'Cursor Agent'],
    ['AIDER_MODEL', 'Aider'],
    ['CODEX_SANDBOX', 'GitHub Codex'],
    ['GITHUB_ACTIONS', 'GitHub Actions'],
    ['CI', 'CI 環境'],
  ]

  for (const [key, name] of markers) {
    const value = process.env[key]
    if (value && value !== '0' && value !== 'false') return name
  }
  return null
}

/**
 * 拒否メッセージを表示する。代替手段（pnpm build）を必ず案内する。
 */
function printRejection(reason) {
  const msg = [
    '',
    `${colors.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
    `${colors.red}${colors.bold}⛔ dev サーバーの起動はブロックされました${colors.reset}`,
    `${colors.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
    '',
    `理由: ${reason}`,
    '',
    `${colors.bold}AI エージェントは dev サーバーを起動しないでください。${colors.reset}`,
    '`next dev` は常駐プロセスのためターミナルを占有し、',
    'エージェントの作業がそこで停止します。',
    '',
    `${colors.green}${colors.bold}✅ 動作確認は build で行ってください:${colors.reset}`,
    '',
    `    ${colors.cyan}pnpm build${colors.reset}       # 型・ビルドエラーを検出`,
    `    ${colors.cyan}pnpm validate${colors.reset}    # lint + typecheck + test + 境界チェック`,
    '',
    `${colors.yellow}人間が手動で dev サーバーを起動する場合:${colors.reset}`,
    '',
    `    ${colors.cyan}ALLOW_DEV_SERVER=1 pnpm dev${colors.reset}`,
    '',
    `${colors.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
    '',
  ].join('\n')

  console.error(msg)
}

/**
 * 対話ターミナル向けの確認プロンプト。
 * タイムアウトで必ず終了するため、応答できない実行元をハングさせない。
 */
function confirmInteractively() {
  return new Promise((resolve) => {
    process.stdout.write(
      [
        '',
        `${colors.yellow}⚠️  dev サーバー（next dev）を起動しようとしています。${colors.reset}`,
        '',
        `   AI エージェントは起動禁止です（動作確認は ${colors.cyan}pnpm build${colors.reset}）。`,
        `   人間の場合は ${colors.bold}${CONFIRM_TIMEOUT_MS / 1000} 秒以内に Enter${colors.reset} を押すと起動します。`,
        '',
        '   起動する [Enter] / 中止する [Ctrl-C] > ',
      ].join('\n')
    )

    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      process.stdin.pause()
      process.stdin.removeListener('data', onData)
      resolve(result)
    }

    const onData = (chunk) => {
      const answer = String(chunk).trim().toLowerCase()
      // 空入力（Enter のみ）または y/yes を許可。それ以外は中止。
      finish(answer === '' || answer === 'y' || answer === 'yes')
    }

    const timer = setTimeout(() => {
      process.stdout.write('\n')
      finish(false)
    }, CONFIRM_TIMEOUT_MS)

    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', onData)
  })
}

async function main() {
  // 1. 明示オプトイン（人間のエスケープハッチ）
  if (process.env.ALLOW_DEV_SERVER === '1') {
    process.exit(0)
  }

  // 2. AI エージェント / CI 検出
  const automation = detectAutomation()
  if (automation) {
    printRejection(`${automation} からの実行を検出しました`)
    process.exit(1)
  }

  // 3. 非対話実行（パイプ・スクリプト経由・エージェントのバックグラウンド実行）
  if (!process.stdin.isTTY) {
    printRejection('非対話実行（TTY なし）を検出しました')
    process.exit(1)
  }

  // 4. 人間の対話ターミナル → 確認プロンプト
  const approved = await confirmInteractively()
  if (!approved) {
    printRejection('確認プロンプトが承認されませんでした')
    process.exit(1)
  }

  console.log(`\n${colors.green}✅ dev サーバーを起動します...${colors.reset}\n`)
  process.exit(0)
}

main()
