#!/usr/bin/env node

/**
 * PR運用モード OFF: チーム開発 → 個人開発への切り替え
 *
 * 実行内容:
 *   1. CLAUDE.md の PR_MODE_FLAG を OFF に書き換え
 *   2. .github/workflows/claude-code-review.yml を削除
 *   3. GitHub のブランチ保護を解除
 *
 * 冪等: 既にOFFなら no-op
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { log, updateClaudeMdFlag } = require('./pr-mode-utils')

const removeReviewWorkflow = () => {
  const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'claude-code-review.yml')

  if (!fs.existsSync(workflowPath)) {
    log.info('claude-code-review.yml は既に存在しません')
    return
  }

  fs.unlinkSync(workflowPath)
  log.success('claude-code-review.yml を削除しました')
}

const removeBranchProtection = () => {
  try {
    execSync('gh auth status', { stdio: 'pipe' })
  } catch {
    log.warning('GitHub CLI 未認証のため、ブランチ保護解除はスキップします')
    return false
  }

  let repoInfo
  try {
    repoInfo = execSync('gh repo view --json nameWithOwner --jq .nameWithOwner', {
      stdio: 'pipe',
      encoding: 'utf8',
    }).trim()
  } catch {
    log.warning('GitHubリモートが未設定のため、ブランチ保護解除はスキップします')
    return false
  }

  let defaultBranch
  try {
    defaultBranch = execSync('gh repo view --json defaultBranchRef --jq .defaultBranchRef.name', {
      stdio: 'pipe',
      encoding: 'utf8',
    }).trim()
  } catch {
    log.warning('デフォルトブランチを取得できませんでした')
    return false
  }

  try {
    execSync(`gh api repos/${repoInfo}/branches/${defaultBranch}/protection -X DELETE`, {
      stdio: 'pipe',
    })
    log.success(`${defaultBranch} ブランチ保護を解除しました`)
    return true
  } catch (e) {
    const msg = e.message.split('\n')[0] || ''
    if (msg.includes('404') || msg.includes('Not Found')) {
      log.info('ブランチ保護は既に未設定です')
      return true
    }
    log.warning('ブランチ保護の解除に失敗しました')
    log.info(`  詳細: ${msg}`)
    return false
  }
}

const main = () => {
  log.section('PR運用モード OFF への切替')

  updateClaudeMdFlag('OFF')
  removeReviewWorkflow()
  removeBranchProtection()

  log.section('完了')
  log.info('次の手順:')
  log.info('  1. git add CLAUDE.md .github/workflows/')
  log.info('  2. git commit -m "chore: PR運用モードをOFFに切替"')
  log.info('  3. git push')
  log.info('')
  log.info('Claude Code は CLAUDE.md のフラグを読み、以降は main 直push で動作します')
  log.info('ON に戻す場合: pnpm sc:enable-pr')
}

main()
