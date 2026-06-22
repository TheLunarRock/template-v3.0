#!/usr/bin/env node

/**
 * Git安全性チェック - mainブランチでの作業を防ぐ
 * SuperClaude v4.0.8 統合セキュリティ機能
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
}

function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim()
  } catch (error) {
    return null
  }
}

/**
 * CLAUDE.md の PR_MODE_FLAG（PR運用モード）を読み取る。
 * 既定は 'OFF'（テンプレート既定＝個人開発）。読み取り失敗時も 'OFF' にフォールバック。
 */
function getPrMode() {
  try {
    const md = fs.readFileSync(path.join(__dirname, '..', 'CLAUDE.md'), 'utf8')
    // <!-- PR_MODE_FLAG_START --> 〜 <!-- PR_MODE_FLAG_END --> のブロックを優先的に走査
    const block = md.match(/PR_MODE_FLAG_START[\s\S]*?PR_MODE_FLAG_END/)
    const scope = block ? block[0] : md
    const m = scope.match(/PR運用モード\*\*\s*[:：]\s*(ON|OFF)/)
    return m ? m[1] : 'OFF'
  } catch (error) {
    return 'OFF'
  }
}

/**
 * 保護ブランチ判定。
 * PR運用OFF（個人開発）では main 直push が正規フローのため保護しない（CLAUDE.md ブランチ運用ルール準拠）。
 * PR運用ON（チーム開発）でのみ main/master/develop/production を保護し feature ブランチを強制する。
 */
function isProtectedBranch(branch, prMode = 'ON') {
  if (prMode === 'OFF') return false
  const protectedBranches = ['main', 'master', 'develop', 'production']
  return protectedBranches.includes(branch)
}

function createFeatureBranch() {
  const timestamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const branchName = `feature/brainstorm-${timestamp}`

  try {
    execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' })
    log.success(`安全なブランチを作成しました: ${branchName}`)
    return branchName
  } catch (error) {
    log.error('ブランチの作成に失敗しました')
    return null
  }
}

function checkGitSafety(options = {}) {
  const { autoFix = false, command = 'unknown' } = options

  // Gitリポジトリかチェック
  if (!fs.existsSync('.git')) {
    log.warning('Gitリポジトリではありません')
    return { safe: true, reason: 'not-git-repo' }
  }

  const currentBranch = getCurrentBranch()

  if (!currentBranch) {
    log.error('現在のブランチを取得できませんでした')
    return { safe: false, reason: 'branch-unknown' }
  }

  const prMode = getPrMode()

  // 保護されたブランチかチェック（PR運用ONのみ。OFFでは main 直push が正規フロー）
  if (isProtectedBranch(currentBranch, prMode)) {
    log.error(`🚨 危険: ${currentBranch}ブランチで作業しています`)
    log.error(`コマンド: ${command}`)
    log.error('保護されたブランチでの直接作業は禁止されています')

    if (autoFix) {
      log.info('自動的にフィーチャーブランチを作成します...')
      const newBranch = createFeatureBranch()
      if (newBranch) {
        return { safe: true, reason: 'auto-fixed', newBranch }
      }
    } else {
      log.info('解決方法:')
      log.info('  1. フィーチャーブランチを作成: git checkout -b feature/your-feature')
      log.info('  2. または自動修正: --auto-fix フラグを使用')
    }

    return { safe: false, reason: 'protected-branch', branch: currentBranch }
  }

  if (prMode === 'OFF' && ['main', 'master'].includes(currentBranch)) {
    log.info(`PR運用OFF（個人開発）: ${currentBranch} での直接コミット・pushは許可されています`)
  }
  log.success(`安全なブランチです: ${currentBranch}`)
  return { safe: true, reason: 'safe-branch', branch: currentBranch }
}

// コマンドライン実行時
if (require.main === module) {
  const args = process.argv.slice(2)
  const autoFix = args.includes('--auto-fix')
  const command = args.find((arg) => arg.startsWith('--command='))?.split('=')[1] || 'manual'

  const result = checkGitSafety({ autoFix, command })

  if (!result.safe) {
    log.error('\n🔴 Git安全性チェック失敗')
    process.exit(1)
  } else {
    log.success('\n✅ Git安全性チェック合格')
    process.exit(0)
  }
}

module.exports = {
  checkGitSafety,
  getCurrentBranch,
  isProtectedBranch,
  createFeatureBranch,
  getPrMode,
}
