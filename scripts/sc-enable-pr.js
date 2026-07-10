#!/usr/bin/env node

/**
 * PR運用モード ON: 個人開発 → チーム開発への切り替え
 *
 * 実行内容:
 *   1. CLAUDE.md の PR_MODE_FLAG を ON に書き換え
 *   2. .github/workflows/claude-code-review.yml を生成
 *   3. GitHub のブランチ保護を適用（main直push禁止 + PR必須）
 *
 * 冪等: 既にONなら再適用のみ実施
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { log, updateClaudeMdFlag } = require('./pr-mode-utils')

const CLAUDE_REVIEW_WORKFLOW = `name: Claude コードレビュー

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  claude-review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write

    steps:
      - name: リポジトリをチェックアウト
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Claude コードレビューを実行
        id: claude-review
        uses: anthropics/claude-code-action@beta
        with:
          claude_code_oauth_token: \${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          model: "claude-opus-4-1-20250805"
          direct_prompt: |
            このプルリクエストをレビューして、以下の観点からフィードバックをお願いします：
            - コード品質とベストプラクティス
            - 潜在的なバグや問題
            - パフォーマンスの考慮事項
            - セキュリティ上の懸念
            - テストカバレッジ

            建設的で役立つフィードバックをお願いします。
`

const writeReviewWorkflow = () => {
  const workflowDir = path.join(process.cwd(), '.github', 'workflows')
  const workflowPath = path.join(workflowDir, 'claude-code-review.yml')

  if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, { recursive: true })
  }

  if (fs.existsSync(workflowPath)) {
    log.info('claude-code-review.yml は既に存在します（上書きしません）')
    return
  }

  fs.writeFileSync(workflowPath, CLAUDE_REVIEW_WORKFLOW)
  log.success('claude-code-review.yml を生成しました')
}

const applyBranchProtection = () => {
  try {
    execSync('gh auth status', { stdio: 'pipe' })
  } catch {
    log.warning('GitHub CLI 未認証のため、ブランチ保護はスキップします')
    log.info('  gh auth login → 再度 pnpm sc:enable-pr を実行してください')
    return false
  }

  let repoInfo
  try {
    repoInfo = execSync('gh repo view --json nameWithOwner --jq .nameWithOwner', {
      stdio: 'pipe',
      encoding: 'utf8',
    }).trim()
  } catch {
    log.warning('GitHubリモートが未設定のため、ブランチ保護はスキップします')
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

  let visibility
  try {
    visibility = execSync('gh repo view --json visibility --jq .visibility', {
      stdio: 'pipe',
      encoding: 'utf8',
    })
      .trim()
      .toUpperCase()
  } catch {
    visibility = 'UNKNOWN'
  }

  if (visibility === 'PRIVATE') {
    log.info('privateリポジトリではブランチ保護に GitHub Pro 以上が必要です')
    log.info('  権限不足の場合は無視されますが、可能なら適用を試みます')
  }

  try {
    execSync(
      `gh api repos/${repoInfo}/branches/${defaultBranch}/protection -X PUT --input - <<'EOF'
{
  "required_status_checks": null,
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF`,
      { stdio: 'pipe', shell: true }
    )
    log.success(`${defaultBranch} ブランチ保護を適用しました（PR必須・1承認・force push禁止）`)
    return true
  } catch (e) {
    log.warning('ブランチ保護の適用に失敗しました（権限不足またはプラン制限）')
    log.info(`  詳細: ${e.message.split('\n')[0]}`)
    return false
  }
}

const main = () => {
  log.section('PR運用モード ON への切替')

  updateClaudeMdFlag('ON')
  writeReviewWorkflow()
  applyBranchProtection()

  log.section('完了')
  log.info('次の手順:')
  log.info('  1. git add CLAUDE.md .github/workflows/claude-code-review.yml')
  log.info('  2. git commit -m "chore: PR運用モードをONに切替"')
  log.info('  3. git push')
  log.info('')
  log.info('Claude Code は CLAUDE.md のフラグを読み、以降は feature branch + PR で動作します')
  log.info('OFF に戻す場合: pnpm sc:disable-pr')
}

main()
