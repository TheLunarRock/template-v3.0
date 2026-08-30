#!/usr/bin/env node

/**
 * SuperClaude v4.0.8 統合セットアップスクリプト
 * - Sequential MCP: 複雑な依存関係分析
 * - Serena MCP: プロジェクトメモリ管理
 * - Morphllm MCP: パターンベース修正
 *
 * @version 4.0.8
 * @framework SuperClaude Production Edition
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const readline = require('readline')
const os = require('os')

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
}

// ユーザー入力を取得
const askQuestion = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

// Homebrewでツールをインストール（未インストール時のみ）
const brewInstallIfMissing = (tool, displayName) => {
  try {
    execSync(`command -v ${tool}`, { stdio: 'pipe' })
    log.success(`${displayName}は既にインストールされています`)
    return true
  } catch {
    // Homebrewが利用可能か確認
    try {
      execSync('command -v brew', { stdio: 'pipe' })
    } catch {
      log.warning(`Homebrewが見つかりません。${displayName}を手動でインストールしてください`)
      return false
    }

    log.info(`${displayName}をインストール中...`)
    try {
      execSync(`brew install ${tool}`, { stdio: 'inherit' })
      log.success(`${displayName}をインストールしました`)
      return true
    } catch {
      log.warning(`${displayName}のインストールに失敗しました`)
      log.info(`手動インストール: brew install ${tool}`)
      return false
    }
  }
}

// 前提ツールのチェック（必須＋任意）
// 鶏と卵問題のため、Node.js / pnpm がない場合は自動インストールせず、案内だけ行う
const checkPrerequisites = () => {
  log.section('Pre-check: 前提ツールの確認')

  // 必須ツール（不足すれば即終了）
  const required = [
    {
      name: 'Node.js',
      command: 'node --version',
      install: 'brew install node  # または https://nodejs.org/ から公式インストーラー',
    },
    {
      name: 'pnpm',
      command: 'pnpm --version',
      install: 'brew install pnpm  # または npm install -g pnpm',
    },
  ]

  // 任意ツール（不足しても続行・警告のみ）
  const optional = [
    {
      name: 'gh (GitHub CLI)',
      command: 'gh --version',
      note: '第5-6層セキュリティ自動化（Secret Scanning / Push Protection / ブランチ保護）に必要',
      install: 'brew install gh && gh auth login',
    },
    {
      name: 'gitleaks',
      command: 'gitleaks version',
      note: '第2層 pre-commit シークレット検出 + 第9層 二重防御に必要',
      install: 'brew install gitleaks',
    },
    {
      name: 'uv (Python package manager)',
      command: 'uv --version',
      note: 'Serena MCP（セマンティック検索・プロジェクト記憶）に必要',
      install: 'curl -LsSf https://astral.sh/uv/install.sh | sh',
    },
    {
      name: 'claude (Claude Code CLI)',
      command: 'claude --version',
      note: 'SuperClaude統合・MCPサーバー登録に必要',
      install: 'npm install -g @anthropic-ai/claude-code',
    },
  ]

  // 必須チェック
  let allRequiredOk = true
  const missingRequired = []
  for (const check of required) {
    try {
      execSync(check.command, { stdio: 'pipe' })
      log.success(`${check.name}: インストール済み`)
    } catch {
      log.error(`${check.name}: 未インストール（必須）`)
      missingRequired.push(check)
      allRequiredOk = false
    }
  }

  if (!allRequiredOk) {
    console.log('')
    log.error(
      '必須ツールが不足しています。以下を実行してから再度 pnpm setup:sc を実行してください:'
    )
    console.log('')
    missingRequired.forEach((m) => {
      console.log(`  ${colors.bold}${m.name}:${colors.reset}`)
      console.log(`    ${m.install}`)
      console.log('')
    })
    process.exit(1)
  }

  // 任意チェック
  const missingOptional = []
  for (const check of optional) {
    try {
      execSync(check.command, { stdio: 'pipe' })
      log.success(`${check.name}: インストール済み`)
    } catch {
      log.warning(`${check.name}: 未インストール`)
      missingOptional.push(check)
    }
  }

  // 任意ツールが不足している場合は案内表示
  if (missingOptional.length > 0) {
    console.log('')
    log.info('任意ツールが未インストールです。フル機能を有効にするには以下を実行してください:')
    console.log('')
    missingOptional.forEach((m) => {
      console.log(`  ${colors.bold}${m.name}${colors.reset} — ${m.note}`)
      console.log(`    ${m.install}`)
      console.log('')
    })
    log.info('（不足のままでも基本セットアップは続行します）')
  }

  // MCPサーバー登録チェック（claude CLIがある場合のみ）
  try {
    execSync('claude --version', { stdio: 'pipe' })
    const mcpList = execSync('claude mcp list', { stdio: 'pipe', encoding: 'utf8' })
    const requiredMcps = ['serena', 'context7', 'sequential-thinking', 'morphllm-fast-apply']
    const missingMcps = requiredMcps.filter((mcp) => !mcpList.includes(mcp))

    if (missingMcps.length === 0) {
      log.success(`MCPサーバー: 4種すべて登録済み`)
    } else {
      console.log('')
      log.warning(`MCPサーバー未登録: ${missingMcps.join(', ')}`)
      log.info('SuperClaudeのMCP-First原則を有効にするため、以下を実行してください:')
      console.log('')
      const mcpCommands = {
        serena:
          'claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server',
        context7: 'claude mcp add context7 -- npx -y @upstash/context7-mcp@latest',
        'sequential-thinking':
          'claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking',
        'morphllm-fast-apply':
          'claude mcp add morphllm-fast-apply -- npx @morph-llm/morph-fast-apply /home/',
      }
      missingMcps.forEach((mcp) => console.log(`  ${mcpCommands[mcp]}`))
      console.log('')
    }
  } catch {
    // claude CLI がない場合はスキップ（既に上で警告表示済み）
  }
}

// セキュリティ自動セットアップ
const setupSecurity = async () => {
  const homeDir = os.homedir()
  const securityResults = {
    gitleaks: false,
    ghCli: false,
    globalGitignore: false,
    githubSettings: false,
    isPrivateRepo: false,
  }

  // --- 1. gitleaksインストール ---
  log.info('🔐 シークレットスキャンツール (gitleaks)')
  securityResults.gitleaks = brewInstallIfMissing('gitleaks', 'gitleaks')

  // --- 2. GitHub CLI インストール ---
  console.log('')
  log.info('🔧 GitHub CLI (gh)')
  securityResults.ghCli = brewInstallIfMissing('gh', 'GitHub CLI')

  // --- 3. GitHub CLI認証確認 ---
  let ghAuthenticated = false
  if (securityResults.ghCli) {
    try {
      execSync('gh auth status', { stdio: 'pipe' })
      log.success('GitHub CLIは認証済みです')
      ghAuthenticated = true
    } catch {
      console.log('')
      log.warning('GitHub CLIが未認証です')
      console.log('')
      log.info('GitHub側のセキュリティ設定（Secret Scanning等）には認証が必要です')
      log.info('以下のコマンドを実行して認証してください:')
      console.log('')
      console.log(`  ${colors.green}gh auth login${colors.reset}`)
      console.log('')
      log.info('手順:')
      log.info('  1. 「GitHub.com」を選択')
      log.info('  2. 「HTTPS」を選択')
      log.info('  3. 「Login with a web browser」を選択')
      log.info('  4. 表示されるコードをブラウザで入力')
      console.log('')

      const doAuth = await askQuestion('今すぐ認証しますか？ (y/N): ')
      if (doAuth.toLowerCase() === 'y' || doAuth.toLowerCase() === 'yes') {
        try {
          execSync('gh auth login', { stdio: 'inherit' })
          ghAuthenticated = true
          log.success('GitHub認証が完了しました')
        } catch {
          log.warning('認証がキャンセルされました。後で gh auth login を実行してください')
        }
      } else {
        log.info('認証をスキップしました。後で gh auth login を実行してください')
      }
    }
  }

  // --- 4. グローバルgitignore設定 ---
  console.log('')
  log.info('🛡️ グローバルgitignore設定')
  const globalGitignorePath = path.join(homeDir, '.gitignore_global')

  if (!fs.existsSync(globalGitignorePath)) {
    const globalGitignoreContent = `# Global gitignore - applied to ALL repositories
# Set with: git config --global core.excludesfile ~/.gitignore_global

# OS generated files
.DS_Store
.DS_Store?
._*
Thumbs.db
ehthumbs.db
Desktop.ini
$RECYCLE.BIN/

# IDE / Editor
.vscode/
.idea/
*.swp
*.swo
*~
*.sublime-project
*.sublime-workspace

# SSH keys (safety net)
id_rsa
id_ed25519
id_dsa
id_ecdsa
*.pem
*.key
`
    fs.writeFileSync(globalGitignorePath, globalGitignoreContent)
    log.success(`${globalGitignorePath} を作成しました`)
  } else {
    log.success('グローバルgitignoreは既に存在します')
  }

  // git configに登録
  try {
    const currentConfig = execSync('git config --global core.excludesfile', {
      stdio: 'pipe',
      encoding: 'utf8',
    }).trim()
    if (currentConfig) {
      log.success('グローバルgitignoreは既に設定済みです')
    }
  } catch {
    execSync(`git config --global core.excludesfile ${globalGitignorePath}`, { stdio: 'pipe' })
    log.success('グローバルgitignoreを設定しました')
  }
  securityResults.globalGitignore = true

  // --- 5. GitHub側セキュリティ設定 ---
  if (ghAuthenticated) {
    console.log('')
    log.info('🔒 GitHub側セキュリティ設定')

    try {
      // リポジトリ情報を取得
      const repoInfo = execSync('gh repo view --json nameWithOwner --jq .nameWithOwner', {
        stdio: 'pipe',
        encoding: 'utf8',
      }).trim()

      if (repoInfo) {
        log.info(`リポジトリ: ${repoInfo}`)

        // リポジトリのvisibilityを取得
        const visibility = execSync('gh repo view --json visibility --jq .visibility', {
          stdio: 'pipe',
          encoding: 'utf8',
        })
          .trim()
          .toUpperCase()
        const isPrivate = visibility === 'PRIVATE'
        securityResults.isPrivateRepo = isPrivate

        if (isPrivate) {
          log.info('privateリポジトリを検出しました')
          log.info(
            'Secret Scanning / Push Protection: GitHub Advanced Security（Enterprise）が必要なためスキップ'
          )
        }

        // Secret Scanning + Push Protection 有効化（publicのみ）
        // Dependabot自動修正（dependabot_security_updates）は個人開発では過剰なため有効化しない
        // 過去事例: 2026-04-24 に Dependabot自動PR連鎖で Vercel build minutes が爆発した
        if (!isPrivate) {
          try {
            execSync(
              `gh api repos/${repoInfo} -X PATCH --input - <<'EOF'
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
EOF`,
              { stdio: 'pipe', shell: true }
            )
            log.success('Secret Scanning を有効化しました')
            log.success('Push Protection を有効化しました')
          } catch {
            log.warning('セキュリティ設定の有効化に失敗しました（権限不足の可能性）')
          }
        }

        // Dependabotアラート有効化（public/private共通で利用可能・通知のみ）
        // 自動PR作成は意図的に行わない（必要なら手動で対応）
        try {
          execSync(`gh api repos/${repoInfo}/vulnerability-alerts -X PUT`, { stdio: 'pipe' })
          log.success('Dependabotアラート を有効化しました（通知のみ）')
        } catch {
          log.warning('Dependabotアラートの有効化に失敗しました')
        }

        // 自動PR作成は明示的に無効化する（GitHub のデフォルトで有効になるため、
        // 「有効化しない」だけでは止まらない。2026-08-29 に11リポジトリで実害を確認）
        try {
          execSync(`gh api repos/${repoInfo}/automated-security-fixes -X DELETE`, { stdio: 'pipe' })
          log.success('Dependabot自動PR を無効化しました（アラートは維持）')
        } catch {
          log.warning('Dependabot自動PRの無効化に失敗しました（権限不足の可能性）')
        }

        // ブランチ保護はデフォルトでは適用しない（個人開発前提）
        // チーム開発に移行する際は `pnpm sc:enable-pr` を実行
        log.info('ブランチ保護: PR運用OFF（デフォルト）。チーム移行時は pnpm sc:enable-pr を実行')

        securityResults.githubSettings = true
      }
    } catch {
      log.warning('リポジトリ情報の取得に失敗しました')
      log.info('GitHubリポジトリにpushした後に再度 pnpm setup:sc を実行してください')
    }
  } else {
    log.info('GitHub認証が未完了のため、GitHub側設定をスキップしました')
    log.info('後で gh auth login → pnpm setup:sc で設定できます')
  }

  return securityResults
}

// Claude Code通知設定
//
// 通知の実体はテンプレート同梱の .claude/hooks/notify.sh（Stop / Notification フック）が担う。
// クローンした時点で macOS 通知・サウンド・クリップボード連携は動作するため、
// ここで行うのは以下 2 点のみ。~/.claude/settings.json は書き換えない。
//   1. Slack Webhook URL の保存（任意・git 管理外の ~/.claude/notify-webhook.txt）
//   2. グローバル hooks が残っている場合の重複案内
const setupClaudeNotifications = async () => {
  const homeDir = os.homedir()
  const claudeDir = path.join(homeDir, '.claude')
  const settingsPath = path.join(claudeDir, 'settings.json')
  const webhookPath = path.join(claudeDir, 'notify-webhook.txt')

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true })
  }

  // グローバル hooks が残っていると同じイベントで 2 回通知される。
  // フックはユーザー設定とプロジェクト設定でマージされ、コマンド文字列が
  // 異なるものは別ハンドラとして両方実行されるため。
  let globalSettings = {}
  if (fs.existsSync(settingsPath)) {
    try {
      globalSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    } catch {
      globalSettings = {}
    }
  }
  const globalHooks = globalSettings.hooks || {}
  const duplicated = ['Stop', 'Notification'].filter(
    (event) => Array.isArray(globalHooks[event]) && globalHooks[event].length > 0
  )
  if (duplicated.length > 0) {
    log.warning(`~/.claude/settings.json に ${duplicated.join(' / ')} フックが残っています`)
    log.info('テンプレート同梱の通知と重複し、同じイベントで 2 回通知されます')
    log.info('グローバル側スクリプトの冒頭に次の1行を入れると重複を防げます:')
    log.info('  [ -x "$PWD/.claude/hooks/notify.sh" ] && exit 0')
    log.info('詳細な移行手順は SPECIFICATION.md §11.8 を参照してください')
  }

  if (fs.existsSync(webhookPath)) {
    log.info('Slack Webhook は設定済みです')
    return { skipped: true, reason: 'already_configured' }
  }

  console.log('')
  log.info('macOS 通知はテンプレート同梱の .claude/hooks/notify.sh で既に有効です')
  log.info('Slack にも通知したい場合のみ Webhook URL を登録します')
  log.info('取得方法: https://api.slack.com/apps → Create New App → Incoming Webhooks')
  console.log('')

  const webhookUrl = (await askQuestion('Slack Webhook URL（不要なら空欄で Enter）: ')).trim()
  if (!webhookUrl) {
    log.info('Slack 通知はスキップしました（macOS 通知のみ有効）')
    return { skipped: true, reason: 'user_declined' }
  }

  // 秘密情報のため所有者のみ読み書き可にする
  fs.writeFileSync(webhookPath, webhookUrl + '\n', { mode: 0o600 })
  fs.chmodSync(webhookPath, 0o600)
  log.success(`Slack Webhook を保存しました: ${webhookPath}`)

  return { skipped: false, webhookPath }
}

// 結果追跡
const results = {
  created: [],
  installed: [],
  warnings: [],
}

// メイン処理
async function setup() {
  console.log(`
${colors.bold}🚀 SuperClaude v4 Production Edition - セットアップ${colors.reset}
${colors.dim}エンタープライズグレード・フィーチャーベース開発環境${colors.reset}
`)

  // ========== Pre-check: 前提ツールの確認 ==========
  checkPrerequisites()

  // ========== Step 0: 依存関係の自動インストール ==========
  if (!fs.existsSync('node_modules')) {
    log.section('Step 0/8: 依存関係のインストール')
    log.info('node_modules が見つかりません。依存関係をインストールします...')

    try {
      log.info('📦 pnpm install を実行中...')
      execSync('pnpm install', { stdio: 'inherit' })
      log.success('依存関係のインストールが完了しました')
      results.installed.push('全npm依存関係')
    } catch (error) {
      log.error('依存関係のインストールに失敗しました')
      log.info('手動で pnpm install を実行してください')
      process.exit(1)
    }
  }

  // ========== Step 1: 基本環境セットアップ ==========
  log.section('Step 1/8: 基本環境設定')

  // settings.local.json作成（settings.local.example.jsonから）
  const settingsLocalPath = '.claude/settings.local.json'
  const settingsExamplePath = '.claude/settings.local.example.json'
  if (!fs.existsSync(settingsLocalPath) && fs.existsSync(settingsExamplePath)) {
    fs.copyFileSync(settingsExamplePath, settingsLocalPath)
    log.success('Claude Code全自動開発設定を適用しました（settings.local.json）')
    results.created.push(settingsLocalPath)
  } else if (fs.existsSync(settingsLocalPath)) {
    log.info('settings.local.json は既に存在します')
  }

  // .env.local作成（.env.exampleから）
  if (!fs.existsSync('.env.local')) {
    if (fs.existsSync('.env.example')) {
      // .env.exampleが存在する場合はコピー
      fs.copyFileSync('.env.example', '.env.local')
      log.success('.env.example から .env.local を作成しました')
      log.info('📝 必要に応じて .env.local の値を編集してください')
      results.created.push('.env.local')
    } else {
      // .env.exampleが存在しない場合はデフォルト作成
      const envContent = `# 環境変数
NEXT_PUBLIC_APP_NAME=template-v3.0

# 開発環境
NODE_ENV=development

# APIエンドポイント（必要に応じて追加）
# NEXT_PUBLIC_API_URL=http://localhost:3000/api
`
      fs.writeFileSync('.env.local', envContent)
      log.success('デフォルトの .env.local を作成しました')
      results.created.push('.env.local')
    }
  } else {
    log.info('.env.local は既に存在します')
  }

  // ========== Step 2: テスト環境 ==========
  log.section('Step 2/8: テスト環境構築')

  // テストディレクトリ構造
  const testDirs = ['tests/unit', 'tests/unit/features']

  testDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      results.created.push(dir)
    }
  })
  log.success('テストディレクトリ構造を作成しました')

  // ========== Step 3: Vitest単体テスト環境 ==========
  log.section('Step 3/8: 単体テスト環境構築')

  // vitest.config.ts作成
  if (!fs.existsSync('vitest.config.ts')) {
    const vitestConfig = `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.*',
        '.next/',
        'scripts/'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/features': path.resolve(__dirname, './src/features')
    }
  }
});
`
    fs.writeFileSync('vitest.config.ts', vitestConfig)
    log.success('vitest.config.ts を作成しました')
    results.created.push('vitest.config.ts')
  }

  // テストセットアップファイル
  if (!fs.existsSync('tests/setup.ts')) {
    const setupContent = `import '@testing-library/jest-dom';

// グローバルモック設定
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// localStorageモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;
`
    fs.writeFileSync('tests/setup.ts', setupContent)
    log.success('tests/setup.ts を作成しました')
    results.created.push('tests/setup.ts')
  }

  // ========== Step 4: GitHub Actions CI/CD ==========
  log.section('Step 4/8: CI/CD環境構築')

  // .github/workflows ディレクトリ作成
  const workflowDir = '.github/workflows'
  if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, { recursive: true })
  }

  // CI/CDワークフロー
  const ciPath = path.join(workflowDir, 'ci.yml')
  if (!fs.existsSync(ciPath)) {
    const ciWorkflow = `name: CI/CD Pipeline

# 個人開発前提のため main のみを対象にする（v3.7.8〜）
# develop branch は使わないため除外。pull_request は PR運用ON（sc:enable-pr）時のために残してある
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# 同一ブランチへの連続 push で古い run を走らせ続けない（Actions 分数の節約）。
# 後から来た push が正なので、キューイングではなく打ち切る
concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: コード品質チェック
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'

      - name: 依存関係インストール
        run: pnpm install --frozen-lockfile

      - name: 型チェック
        run: pnpm typecheck

      - name: フィーチャー境界チェック
        run: pnpm check:boundaries

      - name: 全体チェック
        run: |
          cp .env.ci .env.local 2>/dev/null || true
          pnpm check

  test:
    name: テスト実行
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'

      - name: 依存関係インストール
        run: pnpm install --frozen-lockfile

      - name: 単体テスト + カバレッジ計測
        run: pnpm test:coverage

      - name: カバレッジレポートをアーティファクト化
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: coverage-report
          path: coverage/
          retention-days: 14

  build:
    name: ビルドチェック
    runs-on: ubuntu-latest
    needs: [quality, test]
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'

      - name: 依存関係インストール
        run: pnpm install --frozen-lockfile

      - name: プロダクションビルド
        run: pnpm build

      - name: Preflightチェック
        run: |
          cp .env.ci .env.local 2>/dev/null || true
          pnpm preflight
`
    fs.writeFileSync(ciPath, ciWorkflow)
    log.success('GitHub Actions CI/CDワークフローを作成しました')
    results.created.push(ciPath)
  }

  // セキュリティワークフロー（第9層防御）
  const securityPath = path.join(workflowDir, 'security.yml')
  if (!fs.existsSync(securityPath)) {
    const securityWorkflow = `name: Security

# 個人開発前提のため main push 時のみ実行（v3.7.8〜）
# 週次cron は不要（Dependabot alerts で重大脆弱性は通知される）
on:
  push:
    branches: [main]

permissions:
  contents: read
  security-events: write

# 同一ブランチへの連続 push で古い run を走らせ続けない（Actions 分数の節約）。
# 監査対象は常に最新コミットなので、途中の run を完走させる意味がない
concurrency:
  group: security-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  dependency-audit:
    name: 依存パッケージ脆弱性監査（pnpm audit）
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: pnpm/action-setup@v6

      - uses: actions/setup-node@v7
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'

      - name: 依存関係インストール
        run: pnpm install --frozen-lockfile

      - name: 本番依存の脆弱性監査（high以上でブロック）
        run: pnpm audit --prod --audit-level=high

      - name: 全依存の脆弱性監査（moderate以上・警告のみ）
        run: pnpm audit --audit-level=moderate
        continue-on-error: true

  gitleaks:
    name: シークレットスキャン（gitleaks・二重防御）
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - name: gitleaks実行
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}

  codeql:
    name: 静的解析（CodeQL SAST）
    # public リポジトリのみ実行する。
    # private の Code scanning は GitHub Advanced Security（有料）が必須で、無料プランでは
    # "Code scanning is not enabled for this repository." で必ず失敗する。
    # 解析自体は完走するため 1 回あたり約 228 秒（private 実測）を無為に消費し、
    # 2026-08 は private の実走 86 回 ≒ 326 分（無料枠 2,000 分の 16%）を削っていた。
    if: github.event.repository.visibility == 'public'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: CodeQL初期化
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: security-and-quality

      - name: CodeQL解析
        uses: github/codeql-action/analyze@v3
        with:
          category: '/language:javascript-typescript'
`
    fs.writeFileSync(securityPath, securityWorkflow)
    log.success('GitHub Actions セキュリティワークフロー（第9層防御）を作成しました')
    results.created.push(securityPath)
  }

  // ========== Step 5: SuperClaude統合強化 ==========
  log.section('Step 5/8: SuperClaude v4統合確認')

  // claudedocs ディレクトリ作成
  if (!fs.existsSync('claudedocs')) {
    fs.mkdirSync('claudedocs')

    // README作成
    const claudeDocsReadme = `# Claude Code専用ドキュメント

このディレクトリはClaude Codeが生成する分析レポートや設計ドキュメント専用です。

## ディレクトリ構造
- /analysis - コード分析レポート
- /design - 設計ドキュメント
- /reviews - コードレビュー結果
- /proposals - 実装提案

## 注意事項
- このディレクトリの内容はClaude Code専用
- 人間の開発者は参照のみ
- プロダクションコードには含めない
`
    fs.writeFileSync('claudedocs/README.md', claudeDocsReadme)
    log.success('claudedocs ディレクトリを作成しました')
    results.created.push('claudedocs')
  }

  // CLAUDE.mdの確認
  if (!fs.existsSync('CLAUDE.md')) {
    log.warning('CLAUDE.mdが見つかりません - Claude Codeの開発ガイドが必要です')
    results.warnings.push('CLAUDE.md未作成')
  } else {
    log.success('CLAUDE.mdが存在します')
  }

  // PROJECT_INFO.mdの確認
  if (!fs.existsSync('PROJECT_INFO.md')) {
    log.warning('PROJECT_INFO.mdが見つかりません（プロジェクト固有設定用）')
    results.warnings.push('PROJECT_INFO.md未作成')
  } else {
    log.success('PROJECT_INFO.mdが存在します')
  }

  // ========== Step 5.5: Claude Code通知設定 ==========
  log.section('Step 5.5/8: Claude Code通知設定')

  try {
    const notifyResult = await setupClaudeNotifications()
    if (notifyResult.skipped) {
      if (notifyResult.reason === 'already_configured') {
        log.success('Slack 通知は設定済みです（macOS 通知は同梱フックで常時有効）')
      } else {
        log.info('Slack 通知は未設定です（macOS 通知は同梱フックで有効）')
      }
    } else {
      results.created.push('~/.claude/notify-webhook.txt')
      results.installed.push('Claude Code通知（Slack連携）')
    }
  } catch (error) {
    log.warning('通知設定中にエラーが発生しました: ' + error.message)
    results.warnings.push('Claude Code通知設定に失敗')
  }

  // ========== Step 5.7: セキュリティ自動セットアップ ==========
  log.section('Step 5.7/8: セキュリティ自動セットアップ')

  try {
    const securityResult = await setupSecurity()

    if (securityResult.gitleaks) results.installed.push('gitleaks (シークレットスキャン)')
    if (securityResult.ghCli) results.installed.push('GitHub CLI (gh)')
    if (securityResult.globalGitignore) results.installed.push('グローバルgitignore')
    if (securityResult.githubSettings) {
      if (securityResult.isPrivateRepo) {
        results.installed.push('Dependabotアラート（通知のみ）')
        results.installed.push(
          'Secret Scanning / Push Protection: スキップ（privateリポジトリ - Enterprise必要）'
        )
      } else {
        results.installed.push('GitHub Secret Scanning / Push Protection')
        results.installed.push('Dependabotアラート（通知のみ・自動PR作成なし）')
      }
      results.installed.push('ブランチ保護: PR運用OFF（チーム移行時は pnpm sc:enable-pr）')
    } else {
      results.warnings.push('GitHub側セキュリティ設定が未完了（gh auth login後に再実行）')
    }
  } catch (error) {
    log.warning('セキュリティセットアップ中にエラーが発生しました: ' + error.message)
    results.warnings.push('セキュリティセットアップに失敗')
  }

  // ========== Step 6: VS Code設定 ==========
  log.section('Step 6/8: 開発環境設定')

  // VS Code設定
  const vscodeDir = '.vscode'
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir)

    // settings.json
    const vscodeSettings = {
      'editor.formatOnSave': true,
      'editor.defaultFormatter': 'esbenp.prettier-vscode',
      'editor.codeActionsOnSave': {
        'source.fixAll.eslint': true,
      },
      'typescript.tsdk': 'node_modules/typescript/lib',
      'typescript.enablePromptUseWorkspaceTsdk': true,
      'tailwindCSS.includeLanguages': {
        typescript: 'javascript',
        typescriptreact: 'javascript',
      },
      'files.associations': {
        '*.css': 'tailwindcss',
      },
    }
    fs.writeFileSync(path.join(vscodeDir, 'settings.json'), JSON.stringify(vscodeSettings, null, 2))

    // extensions.json
    const vscodeExtensions = {
      recommendations: [
        'dbaeumer.vscode-eslint',
        'esbenp.prettier-vscode',
        'bradlc.vscode-tailwindcss',
        'formulahendry.auto-rename-tag',
        'christian-kohler.path-intellisense',
      ],
    }
    fs.writeFileSync(
      path.join(vscodeDir, 'extensions.json'),
      JSON.stringify(vscodeExtensions, null, 2)
    )

    log.success('VS Code設定を作成しました')
    results.created.push('.vscode')
  }

  // ========== Step 7: 完了レポート ==========
  log.section('Step 7/8: セットアップ完了')

  console.log(`
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
✨ ${colors.bold}SuperClaude Template v4.0.8 セットアップ完了！${colors.reset}

${colors.blue}📦 インストール済み機能:${colors.reset}
  ✓ フィーチャーベース開発環境
  ✓ SuperClaude統合
  ✓ Vitest 単体テスト
  ✓ GitHub Actions CI/CD
  ✓ 境界違反自動検出
  ✓ Claude Code専用ドキュメント領域
  ✓ Claude Code通知（macOS標準搭載 / Slack任意）
  ✓ セキュリティ6層防御（gitleaks/GitHub保護）

📋 作成されたファイル・ディレクトリ:
  ${results.created.map((item) => `• ${item}`).join('\n  ')}

🔧 インストールされた設定:
  ${results.installed.map((item) => `• ${item}`).join('\n  ') || '• なし'}

⚠️  検出された問題:
  ${results.warnings.map((item) => `• ${item}`).join('\n  ') || '• なし'}

${colors.yellow}🚀 次のステップ:${colors.reset}

1. 環境変数の設定:
   ${colors.dim}編集: .env.local${colors.reset}

2. 開発開始:
   ${colors.green}pnpm dev${colors.reset}              # 開発サーバー起動
   ${colors.green}pnpm create:feature [名前]${colors.reset}  # 新機能作成

3. テスト実行:
   ${colors.green}pnpm test:unit${colors.reset}         # 単体テスト

4. 品質チェック:
   ${colors.green}pnpm check:boundaries${colors.reset}  # 境界違反チェック
   ${colors.green}pnpm validate:all${colors.reset}      # 全検証実行
   ${colors.green}pnpm preflight${colors.reset}         # デプロイ前チェック

5. ${colors.bold}MCPサーバー設定（初回のみ）:${colors.reset}
   Serena（プロジェクト記憶・セマンティック検索）の設定:
   ${colors.dim}# 前提: uv をインストール（Serenaに必要）${colors.reset}
   ${colors.green}curl -LsSf https://astral.sh/uv/install.sh | sh${colors.reset}
   ${colors.dim}# Serena MCPサーバーを追加${colors.reset}
   ${colors.green}claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server${colors.reset}

   その他の推奨MCPサーバー:
   ${colors.green}claude mcp add context7 -- npx -y @upstash/context7-mcp@latest${colors.reset}
   ${colors.green}claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking${colors.reset}
   ${colors.green}claude mcp add morphllm-fast-apply -- npx @morph-llm/morph-fast-apply /home/${colors.reset}

   ${colors.dim}設定確認: claude mcp list${colors.reset}

${colors.blue}📚 ドキュメント:${colors.reset}
  • CLAUDE.md         - Claude Code開発ガイド
  • PROJECT_INFO.md   - プロジェクト固有設定
  • README.md         - プロジェクト概要

${colors.bold}${colors.green}🎉 準備完了！最高の開発体験をお楽しみください！${colors.reset}
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`)
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log.error('セットアップ中にエラーが発生しました')
  console.error(error)
  process.exit(1)
})

// 実行
setup().catch((error) => {
  log.error('セットアップに失敗しました')
  console.error(error)
  process.exit(1)
})
