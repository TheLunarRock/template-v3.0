#!/usr/bin/env node

/**
 * PR運用モード切り替えスクリプト（sc-enable-pr.js / sc-disable-pr.js）の共通ユーティリティ
 *
 * 両スクリプトで完全に同一だった colors / log / updateClaudeMdFlag を集約し、
 * 単一の真実の源とする。出力文言・挙動は元の実装と同一。
 */

const fs = require('fs')
const path = require('path')

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.blue}━━ ${msg} ━━${colors.reset}\n`),
}

/**
 * CLAUDE.md の PR_MODE_FLAG マーカーブロックを指定モードに書き換える
 * @param {'ON' | 'OFF'} mode
 * @returns {boolean} 更新に成功（または既に目的の状態）なら true
 */
const updateClaudeMdFlag = (mode) => {
  const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md')
  if (!fs.existsSync(claudeMdPath)) {
    log.warning('CLAUDE.md が見つかりません。フラグ更新をスキップします')
    return false
  }

  const content = fs.readFileSync(claudeMdPath, 'utf8')
  const flagRegex = /(<!-- PR_MODE_FLAG_START -->[\s\S]*?<!-- PR_MODE_FLAG_END -->)/
  const match = content.match(flagRegex)

  if (!match) {
    log.warning('CLAUDE.md に PR_MODE_FLAG マーカーが見つかりません')
    return false
  }

  const newBlock = `<!-- PR_MODE_FLAG_START -->\n**PR運用モード**: ${mode}\n<!-- PR_MODE_FLAG_END -->`
  const updated = content.replace(flagRegex, newBlock)

  if (updated === content) {
    log.info(`CLAUDE.md のフラグは既に ${mode} です`)
    return true
  }

  fs.writeFileSync(claudeMdPath, updated)
  log.success(`CLAUDE.md の PR運用モードを ${mode} に更新しました`)
  return true
}

module.exports = { colors, log, updateClaudeMdFlag }
