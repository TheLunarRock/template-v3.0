#!/usr/bin/env node

/**
 * SuperClaude v4.0.8 統合プリフライトスクリプト
 * - Sequential MCP: 包括的なデプロイ前分析
 * - Serena MCP: セッション情報の永続化
 *
 * @version 4.0.8
 * @framework SuperClaude Production Edition
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { getPackageManagerCommand, MCP_CONFIG } = require('./utils')

/**
 * 機密情報とみなす変数名（部分一致・大小文字無視）
 * client_secret / API_KEY / accessToken / CLAUDE_CODE_OAUTH_TOKEN 等を拾う。
 */
const SECRET_NAME_PATTERN =
  /password|passwd|secret|token|credential|api[_-]?key|apikey|private[_-]?key|access[_-]?key/i

/**
 * 実害が無く、検出すると開発の邪魔になる値
 * （空文字・プレースホルダ・テンプレート変数）
 */
const PLACEHOLDER_VALUE_PATTERN =
  /^(?:|x+|\.{3}|<[^>]*>|\$\{[^}]*\}|(?:your|dummy|sample|example|placeholder|changeme|todo|fake|test)[\w\s-]*)$/i

/** `name = '値'`（型注釈があってもよい） */
const ASSIGNMENT_PATTERN = /([A-Za-z_$][\w$]*)\s*(?::[^=\n]*)?=\s*(['"`])([^'"`\n]*)\2/g

/** `name: '値'`（オブジェクトリテラルのプロパティ） */
const PROPERTY_PATTERN = /([A-Za-z_$][\w$]*)\s*:\s*(['"`])([^'"`\n]*)\2/g

/** 行コメントらしき行（例示のコードを誤検知しないため） */
const COMMENT_LINE_PATTERN = /^\s*(?:\/\/|\/\*|\*|#)/

/**
 * 値が資格情報らしいか
 *
 * 実在の API キー・トークンは空白を含まない印字可能 ASCII で、ある程度の長さがある。
 * 「ERR_INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません。'」のような
 * 日本語のユーザー向け文言を資格情報と誤認しないための門番。
 *
 * 本命の検出は gitleaks なので、ここは取りこぼしより誤検知ゼロを優先する。
 */
function looksLikeSecretValue(value) {
  return value.length >= 8 && !/\s/.test(value) && /^[\x20-\x7e]+$/.test(value)
}

/**
 * ソース内のハードコードされたシークレットを検出する
 *
 * キーワードの「出現」ではなく「機密っぽい名前への文字列リテラル代入」を見る。
 * 出現だけで判定すると、シークレットを伏せるためのコード
 * （SECRET_ASSIGNMENT_PATTERN 等の定数名）まで誤検知する（2026-08-31-001）。
 *
 * process.env からの読み出しは値が文字列リテラルではないため自然に対象外になる。
 *
 * @param {string} content - ファイル内容
 * @returns {{ lineNumber: number, name: string, masked: string }[]}
 */
function findHardcodedSecrets(content) {
  const found = []

  content.split('\n').forEach((line, index) => {
    if (COMMENT_LINE_PATTERN.test(line)) return

    const seen = new Set()

    for (const pattern of [ASSIGNMENT_PATTERN, PROPERTY_PATTERN]) {
      pattern.lastIndex = 0
      let match

      while ((match = pattern.exec(line)) !== null) {
        const [, name, quote, value] = match

        if (!SECRET_NAME_PATTERN.test(name)) continue
        if (PLACEHOLDER_VALUE_PATTERN.test(value)) continue
        if (!looksLikeSecretValue(value)) continue
        if (seen.has(name)) continue
        seen.add(name)

        // 値そのものは CI ログに出さない
        const literal = quote + value + quote
        found.push({
          lineNumber: index + 1,
          name,
          masked: line.trim().split(literal).join(`${quote}***${quote}`),
        })
      }
    }
  })

  return found
}

/** src 配下のソースファイルを再帰的に集める */
function collectSourceFiles(dir) {
  const extensions = ['.ts', '.tsx', '.js', '.jsx']
  const files = []

  if (!fs.existsSync(dir)) return files

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(full))
    } else if (extensions.includes(path.extname(entry.name))) {
      files.push(full)
    }
  }

  return files
}

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
}

// コマンド実行
const runCommand = (command, silent = false) => {
  try {
    if (!silent) log.info(`実行中: ${command}`)
    const output = execSync(command, {
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
    })
    return { success: true, output }
  } catch (error) {
    return { success: false, error, output: error.stdout }
  }
}

// ファイルサイズの取得
const getDirectorySize = (dir) => {
  const result = runCommand(`du -sh ${dir} 2>/dev/null || echo "0"`, true)
  return result.output ? result.output.trim().split('\t')[0] : 'N/A'
}

// フラグ処理（SuperClaude統合）
const args = process.argv.slice(2)
const isSuperClaudeMode = args.some((arg) => arg.startsWith('--sc-'))

// チェック結果
const results = {
  passed: 0,
  warnings: 0,
  errors: 0,
  critical: 0,
}

// メイン処理
async function preflight() {
  console.log(
    `\n${colors.bold}🚀 SuperClaude v4.0.8 デプロイ前チェック (Preflight Check)${colors.reset}\n`
  )

  if (isSuperClaudeMode) {
    console.log(`${colors.blue}🤖 SuperClaudeモード有効${colors.reset}`)
    console.log(`推奨MCP: ${MCP_CONFIG.priority.analysis} (分析用)\n`)
  }

  // 1. プロダクションビルド
  log.section('プロダクションビルド')
  log.info('クリーンビルドを実行中...')

  // 既存のビルドを削除
  if (fs.existsSync('.next')) {
    runCommand('rm -rf .next', true)
  }

  const buildResult = runCommand(`${getPackageManagerCommand('run')} build`)
  if (buildResult.success) {
    log.success('プロダクションビルドが成功しました')
    results.passed++

    // ビルドサイズの確認
    const buildSize = getDirectorySize('.next')
    log.info(`ビルドサイズ: ${buildSize}`)

    // Static HTML exportの確認
    if (fs.existsSync('.next/server/app')) {
      const staticPages = fs
        .readdirSync('.next/server/app')
        .filter((f) => f.endsWith('.html')).length
      log.info(`静的ページ数: ${staticPages}`)
    }

    // ビルド後の境界チェック
    log.info('ビルド後の境界チェック...')
    const boundaryCheck = runCommand('pnpm check:boundaries', true)
    // ANSIカラーコードを除去してから判定
    const cleanOutput = (boundaryCheck.output || '').replace(/\x1b\[[0-9;]*m/g, '')
    // 実際のエラー数を確認（"エラー: 0"は成功を意味する）
    const hasActualErrors =
      cleanOutput.includes('✗ エラー:') && !cleanOutput.includes('✗ エラー: 0')

    if (!boundaryCheck.success || hasActualErrors) {
      log.error('本番ビルドに境界違反が含まれています')
      results.critical = true
      results.errors++
    } else {
      log.success('境界チェック合格')
      results.passed++
    }
  } else {
    log.error('ビルドに失敗しました - デプロイ不可')
    results.critical = true
    results.errors++
  }

  // 2. 環境変数の確認
  log.section('環境変数チェック')

  // 本番環境で必要な環境変数の確認
  const requiredEnvVars = [
    'NEXT_PUBLIC_APP_NAME',
    // 必要に応じて追加: 'NEXT_PUBLIC_API_URL', etc.
  ]

  let envValid = true
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log.success(`${envVar} ✓`)
      results.passed++
    } else {
      // .env.localから読み込み
      if (fs.existsSync('.env.local')) {
        const envContent = fs.readFileSync('.env.local', 'utf8')
        if (envContent.includes(`${envVar}=`)) {
          log.success(`${envVar} ✓ (.env.local)`)
          results.passed++
        } else {
          log.warning(`${envVar} が設定されていません`)
          envValid = false
          results.warnings++
        }
      } else {
        log.warning(`${envVar} が設定されていません`)
        envValid = false
        results.warnings++
      }
    }
  }

  // 3. セキュリティチェック
  log.section('セキュリティチェック')

  // 本番用の脆弱性チェック
  const auditResult = runCommand(
    `${getPackageManagerCommand('auditProd')} --audit-level=critical`,
    true
  )
  const auditOutput = auditResult.output || auditResult.error?.stdout || ''

  // より厳密な脆弱性チェック
  if (
    auditOutput.includes('found 0 vulnerabilities') ||
    auditOutput.includes('no vulnerabilities') ||
    (auditOutput.includes('found') && auditOutput.includes('0 critical'))
  ) {
    log.success('重大な脆弱性は見つかりませんでした')
    results.passed++
  } else if (auditOutput.includes('critical')) {
    log.error('重大な脆弱性が検出されました - デプロイを中止してください')
    results.critical++
    results.errors++
  } else if (auditOutput.includes('high')) {
    log.warning('高リスクの脆弱性が検出されました - 修正を推奨')
    results.warnings++
  } else {
    log.success('重大な脆弱性は見つかりませんでした')
    results.passed++
  }

  // シークレットの漏洩チェック
  // 本命の検出は gitleaks（pre-commit と security.yml の2箇所）が担う。
  // ここは補助なので、誤検知を出さないことを優先する。
  log.info('シークレット漏洩チェック...')

  let secretsFound = false

  for (const file of collectSourceFiles('src')) {
    const findings = findHardcodedSecrets(fs.readFileSync(file, 'utf8'))

    for (const finding of findings) {
      log.error(`ハードコードされたシークレット: ${file}:${finding.lineNumber}`)
      console.log(`${colors.dim}    ${finding.masked}${colors.reset}`)
      secretsFound = true
    }
  }

  if (!secretsFound) {
    log.success('ハードコードされたシークレットは検出されませんでした')
    results.passed++
  } else {
    results.errors++
  }

  // 4. パフォーマンスチェック
  log.section('パフォーマンスチェック')

  // bundle-analyzerがあれば実行
  if (fs.existsSync('.next/analyze')) {
    log.info('バンドルサイズ分析...')
    const analyzeResult = runCommand('npx next-bundle-analyzer', true)
    if (analyzeResult.success) {
      log.success('バンドル分析が完了しました')
    }
  }

  // Lighthouseスコアの推定（簡易チェック）
  log.info('パフォーマンス指標の確認...')

  // 大きすぎるアセットの確認
  if (fs.existsSync('.next/static')) {
    const largeFiles = runCommand('find .next/static -size +500k -type f 2>/dev/null', true)
    if (largeFiles.output && largeFiles.output.trim()) {
      log.warning('500KB以上の大きなファイルが検出されました')
      console.log(colors.dim + largeFiles.output + colors.reset)
      results.warnings++
    } else {
      log.success('大きなアセットファイルは検出されませんでした')
      results.passed++
    }
  }

  // 4.5. フィーチャー別検証
  log.section('フィーチャー別検証')
  const featuresDir = 'src/features'
  if (fs.existsSync(featuresDir)) {
    const features = fs
      .readdirSync(featuresDir)
      .filter((f) => !f.startsWith('_') && fs.statSync(path.join(featuresDir, f)).isDirectory())

    log.info(`${features.length}個のフィーチャーを検証中...`)

    let criticalError = false
    for (const feature of features) {
      const indexPath = path.join(featuresDir, feature, 'index.ts')
      const indexJsPath = path.join(featuresDir, feature, 'index.js')

      if (!fs.existsSync(indexPath) && !fs.existsSync(indexJsPath)) {
        log.error(`${feature}: index.tsが存在しません`)
        results.errors++
        continue
      }

      // フック公開の最終確認
      const actualPath = fs.existsSync(indexPath) ? indexPath : indexJsPath
      const content = fs.readFileSync(actualPath, 'utf8')
      if (content.match(/export\s*{[^}]*\buse[A-Z]/)) {
        log.error(`🔴 ${feature}: フックが公開されています（本番環境では致命的）`)
        results.critical = true
        criticalError = true
        break // 致命的エラーなので即座に中断
      }
    }

    if (!criticalError && results.errors === 0) {
      log.success('全フィーチャーが本番デプロイ可能です')
      results.passed++
    }
  }

  // 5. デプロイ設定の確認
  log.section('デプロイ設定チェック')

  // Vercel設定
  if (fs.existsSync('vercel.json')) {
    log.success('Vercel設定ファイルが存在します')
    results.passed++
  } else {
    log.info('Vercel設定ファイルはありません（デフォルト設定を使用）')
  }

  // package.jsonのengines設定
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  if (packageJson.engines && packageJson.engines.node) {
    log.success(`Node.jsバージョン要件: ${packageJson.engines.node}`)
    results.passed++
  } else {
    log.warning('Node.jsバージョン要件が指定されていません')
    results.warnings++
  }

  // 6. 最終確認
  log.section('最終確認')

  // TypeScriptエラーの確認
  const tsResult = runCommand('npx tsc --noEmit', true)
  if (tsResult.success) {
    log.success('TypeScriptエラーはありません')
    results.passed++
  } else {
    log.error('TypeScriptエラーが存在します')
    results.errors++
  }

  // ESLintチェック（存在する場合）
  if (packageJson.scripts && packageJson.scripts.lint) {
    const lintResult = runCommand(`${getPackageManagerCommand('run')} lint`, true)
    if (lintResult.success) {
      log.success('Lintエラーはありません')
      results.passed++
    } else {
      log.warning('Lintエラーが存在します')
      results.warnings++
    }
  }

  // 結果サマリー
  const readyToDeploy = !results.critical && results.errors === 0

  console.log(`
${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
📊 ${colors.bold}SuperClaude v4.0.8 Preflight チェック結果${colors.reset}

  ${colors.green}✓ 成功:${colors.reset} ${results.passed}
  ${colors.yellow}⚠ 警告:${colors.reset} ${results.warnings}
  ${colors.red}✗ エラー:${colors.reset} ${results.errors}

${
  readyToDeploy
    ? `${colors.green}${colors.bold}✅ デプロイ可能です！${colors.reset}`
    : `${colors.red}${colors.bold}❌ デプロイ前に修正が必要です${colors.reset}`
}

${
  readyToDeploy
    ? `
${colors.dim}推奨デプロイコマンド:

標準デプロイ:
  Vercel:  vercel --prod
  Netlify: netlify deploy --prod
  
フィーチャーベース安全デプロイ（推奨）:
  pnpm check:boundaries && vercel --prod
  
デプロイ前の最終確認:
  pnpm validate:all${colors.reset}`
    : ''
}
${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`)

  // エラーがある場合は終了コード1
  process.exit(readyToDeploy ? 0 : 1)
}

module.exports = { SECRET_NAME_PATTERN, findHardcodedSecrets, collectSourceFiles }

// 直接実行されたときだけ走らせる（テストから require できるようにするため）
if (require.main === module) {
  // エラーハンドリング
  process.on('unhandledRejection', (error) => {
    log.error('Preflightチェック中にエラーが発生しました')
    console.error(error)
    process.exit(1)
  })

  preflight().catch((error) => {
    log.error('Preflightチェックに失敗しました')
    console.error(error)
    process.exit(1)
  })
}
