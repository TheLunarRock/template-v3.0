#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

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

// コマンドライン引数の処理
const args = process.argv.slice(2)
const verbose = args.includes('--verbose') || args.includes('-v')
const fix = args.includes('--fix')

// 結果の集計
const results = {
  passed: 0,
  warnings: 0,
  errors: 0,
  violations: [],
}

// 境界違反パターンのチェック
const checkPatterns = [
  // 相対パス参照は削除（後で高度なチェックに置き換え）
  {
    // @/features/<名前> より深いパスは全て違反とする。
    // ディレクトリ名を列挙すると新しい階層（store / constants 等）を追加するたびに
    // ルールが漏れるため、列挙をやめて「深さ」で判定する（AGENTS.md のディープパス禁止と一致）。
    // 旧実装は grep の BRE 記法（\( \| \)）をそのまま new RegExp() に渡しており、
    // JS では括弧とパイプがリテラル文字になって一件も検出できなかった（2026-08-29-005）。
    name: '内部ディレクトリ参照',
    pattern: 'from\\s+[\'"]@/features/[^\'"/]+/[^\'"]+[\'"]',
    message: 'フィーチャー内部ディレクトリへの直接参照',
    severity: 'error',
  },
  {
    name: 'フック公開',
    pattern: 'export\\s*{[^}]*\\buse[A-Z]',
    file: 'index.ts',
    message: 'フックのindex.tsからの公開',
    severity: 'critical',
  },
  {
    name: 'UIコンポーネント公開',
    pattern: 'export\\s*{[^}]*}\\s*from\\s*[\'"]\\./components',
    file: 'index.ts',
    message: 'UIコンポーネントのindex.tsからの公開',
    severity: 'warning',
  },
  // 新パターン: 無限ループリスク検出
  {
    name: '無限ループリスク（オブジェクト依存）',
    pattern: 'useEffect\\([^,]+,\\s*\\[[^\\]]*\\{[^\\}]*\\}[^\\]]*\\]',
    message: 'useEffectの依存配列にオブジェクトリテラルが含まれています（無限ループのリスク）',
    severity: 'critical',
  },
  {
    name: '無限ループリスク（配列依存）',
    pattern: 'useEffect\\([^,]+,\\s*\\[[^\\]]*\\[[^\\]]*\\][^\\]]*\\]',
    message: 'useEffectの依存配列に配列リテラルが含まれています（無限ループのリスク）',
    severity: 'critical',
  },
  {
    name: '無限ループリスク（関数依存）',
    pattern: 'useEffect\\([^,]+,\\s*\\[[^\\]]*\\(\\)\\s*=>',
    message: 'useEffectの依存配列にインライン関数が含まれています（無限ループのリスク）',
    severity: 'critical',
  },
]

// フィーチャー名の一覧を取得（src/features 直下のディレクトリ名）
function listFeatureNames(cwd = process.cwd()) {
  const featuresDir = path.join(cwd, 'src/features')
  if (!fs.existsSync(featuresDir)) return []
  return fs
    .readdirSync(featuresDir)
    .filter((f) => fs.statSync(path.join(featuresDir, f)).isDirectory())
}

// より高度な相対パス参照チェック
// knownFeatures はテスト容易性のため注入可能（未指定時はディスクから取得）
function checkRelativeImports(filePath, content, featureName, knownFeatures) {
  const violations = []
  const features = knownFeatures || listFeatureNames()
  const relativeImportRegex = /from\s+['"](\.\.\/[^'"]+)['"]/g
  let match

  while ((match = relativeImportRegex.exec(content)) !== null) {
    const importPath = match[1]

    // ../で始まるパスを解析
    // 例: ../utils/helper       → 同一フィーチャー内
    // 例: ../user/api           → 他フィーチャー
    // 例: ../../user/api/x      → 他フィーチャー（多階層。先頭の .. を読み飛ばす必要がある）
    const pathSegments = importPath.split('/')

    // 先頭の連続する .. を読み飛ばしてから最初の実セグメントを取る
    let index = 0
    while (index < pathSegments.length && pathSegments[index] === '..') index++

    if (index < pathSegments.length) {
      const firstSegment = pathSegments[index]

      // 他のフィーチャーへの参照かチェック
      if (features.includes(firstSegment) && firstSegment !== featureName) {
        violations.push({
          file: filePath,
          check: '他フィーチャーへの相対パス参照',
          message: `相対パスで他フィーチャー「${firstSegment}」を参照しています: ${match[0]}`,
          severity: 'error',
          matches: [match[0]],
        })
      }
    }
  }

  return violations
}

// ErrorBoundary使用チェック
function checkErrorBoundaryUsage(filePath, content) {
  const violations = []
  const fileName = path.basename(filePath)

  // page.tsxファイルでErrorBoundaryを使用しているかチェック
  if (fileName === 'page.tsx' || fileName === 'page.jsx') {
    const hasErrorBoundary =
      content.includes('ErrorBoundary') || content.includes('FeatureErrorBoundary')
    const hasPageContent = content.includes('PageContent')

    if (!hasErrorBoundary) {
      violations.push({
        file: filePath,
        check: 'ErrorBoundary未使用',
        message: 'page.tsxでErrorBoundaryを使用していません（エラー分離パターン違反）',
        severity: 'warning',
      })
    }

    if (!hasPageContent) {
      violations.push({
        file: filePath,
        check: 'PageContent未分離',
        message: 'page.tsxでPageContentコンポーネントを分離していません（推奨パターン違反）',
        severity: 'info',
      })
    }
  }

  return violations
}

// src/app 配下にも適用する checkPatterns の名前（パターン系チェックのスコープ）
// index.ts 前提のチェック（フック公開 / UIコンポーネント公開）はフィーチャー固有のため
// src/app には適用しない。
//
// 一方 ErrorBoundary未使用 / PageContent未分離 は 2026-08-30 から src/app にも適用する。
// 以前はテンプレート同梱の src/app/page.tsx が即座に警告を出すため除外していたが、
// その page.tsx が要求パターン（ErrorBoundary → PageContent）を満たしたため除外の根拠が消えた。
// index.ts不在 は App Router のディレクトリに当てはまらないので引き続き適用しない。
const IMPORT_SCOPE_CHECKS = new Set(['内部ディレクトリ参照'])

// ファイル内容の検査
// options.structural  = false で checkPatterns を IMPORT_SCOPE_CHECKS のみに絞る（src/app 向け）
// options.errorBoundary = ErrorBoundary未使用 / PageContent未分離 を適用するか
//   （既定は structural と同じ。src/app は structural=false でも true を渡す）
function checkFile(filePath, content, featureName, options = {}) {
  const { structural = true, errorBoundary = structural, knownFeatures } = options
  const violations = []
  const fileName = path.basename(filePath)

  // 相対パスの高度なチェック
  const relativeViolations = checkRelativeImports(filePath, content, featureName, knownFeatures)
  violations.push(...relativeViolations)

  // ErrorBoundary使用チェック（フィーチャー配下 + src/app）
  if (errorBoundary) {
    const errorBoundaryViolations = checkErrorBoundaryUsage(filePath, content)
    violations.push(...errorBoundaryViolations)
  }

  for (const check of checkPatterns) {
    // src/app では import 系チェックのみ適用
    if (!structural && !IMPORT_SCOPE_CHECKS.has(check.name)) continue

    // ファイル名が指定されている場合、該当ファイルのみチェック
    if (check.file && fileName !== check.file) continue

    const regex = new RegExp(check.pattern, 'gm')
    const matches = content.match(regex)

    if (matches) {
      violations.push({
        file: filePath,
        check: check.name,
        message: check.message,
        severity: check.severity,
        matches: matches,
      })
    }
  }

  return violations
}

// 走査対象ディレクトリの検査
// target: { dir, featureName, structural, label }
function checkTarget(target) {
  const { dir, featureName, structural, errorBoundary = structural } = target
  const violations = []
  const knownFeatures = listFeatureNames()

  // 対象内のすべてのTypeScript/JavaScriptファイルを検査
  const files = getAllFiles(dir, ['.ts', '.tsx', '.js', '.jsx'])

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    const fileViolations = checkFile(file, content, featureName, {
      structural,
      errorBoundary,
      knownFeatures,
    })
    violations.push(...fileViolations)
  }

  // index.ts の存在確認はフィーチャーのみ（src/app には適用しない）
  if (!structural) return violations

  const featurePath = dir
  const indexPath = path.join(featurePath, 'index.ts')
  if (!fs.existsSync(indexPath) && !fs.existsSync(path.join(featurePath, 'index.js'))) {
    violations.push({
      file: featurePath,
      check: 'index.ts不在',
      message: 'index.tsファイルが存在しません',
      severity: 'warning',
    })
  }

  return violations
}

// 再帰的にファイルを取得
function getAllFiles(dirPath, extensions) {
  const files = []

  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath)

    for (const item of items) {
      const itemPath = path.join(currentPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(itemPath)
      } else if (stat.isFile()) {
        const ext = path.extname(item)
        if (extensions.includes(ext)) {
          files.push(itemPath)
        }
      }
    }
  }

  traverse(dirPath)
  return files
}

// 違反の自動修正（実験的機能）
function fixViolation(violation) {
  if (!fix) return false

  const { file, check } = violation
  let content = fs.readFileSync(file, 'utf8')
  let fixed = false

  switch (check) {
    case '他フィーチャーへの相対パス参照':
      // ../user/api/userApi → @/features/user
      content = content.replace(/from ['"]\.\.\/([^\/]+)\/.+['"]/g, "from '@/features/$1'")
      fixed = true
      break

    case '内部ディレクトリ参照':
      // @/features/user/components/UserCard → @/features/user
      content = content.replace(
        /from ['"]@\/features\/([^\/]+)\/[^'"]+['"]/g,
        "from '@/features/$1'"
      )
      fixed = true
      break
  }

  if (fixed) {
    fs.writeFileSync(file, content)
    return true
  }

  return false
}

// 走査対象の決定
// src/features/* に加えて src/app も対象にする。
// src/app からフィーチャー内部を直接 import しても検出されない穴があったため（2026-08-29-005）。
function getScanTargets(cwd = process.cwd()) {
  const targets = []

  const featuresDir = path.join(cwd, 'src/features')
  if (fs.existsSync(featuresDir)) {
    const features = fs.readdirSync(featuresDir).filter((f) => {
      const stat = fs.statSync(path.join(featuresDir, f))
      return stat.isDirectory() && !f.startsWith('_') && !f.startsWith('.')
    })

    for (const feature of features) {
      targets.push({
        dir: path.join(featuresDir, feature),
        featureName: feature,
        label: feature,
        structural: true,
      })
    }
  }

  // src/app は import 系チェック + page.tsx の構造チェック（ErrorBoundary / PageContent）。
  // index.ts不在 はフィーチャー固有の要件なので適用しない（structural: false）。
  const appDir = path.join(cwd, 'src/app')
  if (fs.existsSync(appDir)) {
    targets.push({
      dir: appDir,
      featureName: null,
      label: 'src/app',
      structural: false,
      errorBoundary: true,
    })
  }

  return targets
}

// メイン処理
async function checkBoundaries() {
  console.log(`\n${colors.bold}🔍 フィーチャー境界チェック${colors.reset}\n`)

  const featuresDir = path.join(process.cwd(), 'src/features')

  if (!fs.existsSync(featuresDir)) {
    log.error('src/featuresディレクトリが存在しません')
    process.exit(1)
  }

  const targets = getScanTargets()
  const features = targets.filter((t) => t.structural).map((t) => t.label)

  log.info(`検出されたフィーチャー: ${features.length}個`)

  if (verbose) {
    console.log(colors.dim + features.map((f) => `  - ${f}`).join('\n') + colors.reset)
  }

  // 各対象の検査
  log.section('境界違反チェック')

  for (const target of targets) {
    const feature = target.label
    const violations = checkTarget(target)

    if (violations.length > 0) {
      log.error(`${feature}: ${violations.length}個の違反`)

      for (const violation of violations) {
        const relativePath = path.relative(process.cwd(), violation.file)

        if (violation.severity === 'critical') {
          log.error(`  🔴 ${violation.check}: ${relativePath}`)
          if (violation.message) {
            console.log(`     ${colors.red}${violation.message}${colors.reset}`)
          }
          results.errors++
        } else if (violation.severity === 'error') {
          log.error(`  ❌ ${violation.check}: ${relativePath}`)
          if (violation.message) {
            console.log(`     ${colors.yellow}${violation.message}${colors.reset}`)
          }
          results.errors++
        } else if (violation.severity === 'warning') {
          log.warning(`  ⚠️  ${violation.check}: ${relativePath}`)
          if (verbose && violation.message) {
            console.log(`     ${colors.dim}${violation.message}${colors.reset}`)
          }
          results.warnings++
        } else if (violation.severity === 'info') {
          if (verbose) {
            log.info(`  ℹ️  ${violation.check}: ${relativePath}`)
            if (violation.message) {
              console.log(`     ${colors.dim}${violation.message}${colors.reset}`)
            }
          }
        }

        if (verbose && violation.matches) {
          console.log(colors.dim + '    コード: ' + violation.matches.join('\n    ') + colors.reset)
        }

        // 自動修正
        if (fix && fixViolation(violation)) {
          log.success(`    ✨ 自動修正完了`)
        }
      }

      results.violations.push(...violations)
    } else {
      log.success(`${feature}: 違反なし`)
      results.passed++
    }
  }

  // グローバルチェック（フィーチャー間の循環参照）
  log.section('循環参照チェック')

  const circularDeps = checkCircularDependencies(featuresDir)
  if (circularDeps.length > 0) {
    log.error('循環参照が検出されました:')
    for (const cycle of circularDeps) {
      log.error(`  ${cycle.join(' → ')}`)
      results.errors++
    }
  } else {
    log.success('循環参照は検出されませんでした')
    results.passed++
  }

  // 結果サマリー
  console.log(`
${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
📊 チェック結果サマリー

  ${colors.green}✓ 成功:${colors.reset} ${results.passed}
  ${colors.yellow}⚠ 警告:${colors.reset} ${results.warnings}
  ${colors.red}✗ エラー:${colors.reset} ${results.errors}

${
  results.errors === 0
    ? `${colors.green}✨ 境界違反は検出されませんでした！${colors.reset}`
    : `${colors.red}⚠️  境界違反が検出されました。修正が必要です。${colors.reset}`
}

${fix ? `${colors.yellow}📝 --fixモードで自動修正を試みました${colors.reset}` : ''}
${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`)

  // エラーがある場合は終了コード1
  process.exit(results.errors > 0 ? 1 : 0)
}

// 循環参照の検出
function checkCircularDependencies(featuresDir) {
  const dependencies = {}
  const features = fs
    .readdirSync(featuresDir)
    .filter((f) => fs.statSync(path.join(featuresDir, f)).isDirectory())

  // 各フィーチャーの依存関係を収集
  for (const feature of features) {
    dependencies[feature] = []
    const featurePath = path.join(featuresDir, feature)
    const files = getAllFiles(featurePath, ['.ts', '.tsx', '.js', '.jsx'])

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8')
      const importMatches = content.match(/from ['"]@\/features\/([^\/'"]+)/g) || []

      for (const match of importMatches) {
        const dep = match.match(/@\/features\/([^\/'"]+)/)[1]
        if (dep !== feature && !dependencies[feature].includes(dep)) {
          dependencies[feature].push(dep)
        }
      }
    }
  }

  // 循環参照の検出
  const cycles = []

  function findCycle(feature, path = []) {
    if (path.includes(feature)) {
      const cycleStart = path.indexOf(feature)
      const cycle = [...path.slice(cycleStart), feature]
      cycles.push(cycle)
      return
    }

    const deps = dependencies[feature] || []
    for (const dep of deps) {
      findCycle(dep, [...path, feature])
    }
  }

  for (const feature of features) {
    findCycle(feature)
  }

  // 重複する循環を除去
  const uniqueCycles = []
  for (const cycle of cycles) {
    const sorted = [...cycle].sort().join(',')
    if (!uniqueCycles.some((c) => [...c].sort().join(',') === sorted)) {
      uniqueCycles.push(cycle)
    }
  }

  return uniqueCycles
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log.error('チェック中にエラーが発生しました')
  console.error(error)
  process.exit(1)
})

// テスト用のエクスポート（CLI 挙動には影響しない）
module.exports = {
  checkPatterns,
  IMPORT_SCOPE_CHECKS,
  listFeatureNames,
  checkRelativeImports,
  checkErrorBoundaryUsage,
  checkFile,
  checkTarget,
  getScanTargets,
  getAllFiles,
  checkCircularDependencies,
}

// 実行（CLI として直接起動されたときのみ）
if (require.main === module) {
  checkBoundaries().catch((error) => {
    log.error('境界チェックに失敗しました')
    console.error(error)
    process.exit(1)
  })
}
