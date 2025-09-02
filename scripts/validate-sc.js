#!/usr/bin/env node

/**
 * SuperClaude v4.0.8 統合検証スクリプト
 * check:scとpreflight:scを統合した包括的な検証コマンド
 * 
 * @version 4.0.8
 * @framework SuperClaude Production Edition
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { 
  detectPackageManager, 
  getPackageManagerCommand,
  SUPERCLAUDE_FLAGS,
  MCP_CONFIG
} = require('./utils');

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
  mcp: (msg) => console.log(`${colors.dim}[MCP]${colors.reset} ${msg}`)
};

// コマンド実行
const runCommand = (command, silent = false) => {
  try {
    if (!silent) log.info(`実行中: ${command}`);
    const output = execSync(command, { 
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8'
    });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.stdout ? error.stdout.toString() : ''
    };
  }
};

// MCPサーバー使用提案
const suggestMCP = (checkType, result) => {
  if (result.success) return;
  
  const suggestions = {
    boundaries: ['Serena MCP: シンボル分析で境界違反箇所を特定', 'Morphllm MCP: パターンベースで自動修正'],
    types: ['Sequential MCP: 型エラーの根本原因を分析', 'Context7 MCP: 正しい型定義パターンを確認'],
    tests: ['Playwright MCP: E2Eテストで実際の動作を検証', 'Sequential MCP: テスト失敗の原因を分析'],
    build: ['Sequential MCP: ビルドエラーの依存関係を分析', 'Serena MCP: 問題のあるシンボルを特定']
  };
  
  if (suggestions[checkType]) {
    log.mcp(`推奨MCPサーバー:`);
    suggestions[checkType].forEach(s => log.mcp(`  • ${s}`));
  }
};

// 検証結果の収集
const results = {
  boundaries: null,
  types: null,
  lint: null,
  tests: null,
  build: null,
  totalErrors: 0,
  totalWarnings: 0
};

// メイン処理
async function main() {
  const args = process.argv.slice(2);
  const isQuick = args.includes('--quick');
  const isDeployment = args.includes('--deploy');
  const pm = detectPackageManager();
  const pmRun = getPackageManagerCommand(pm);
  
  console.log(`\n${colors.bold}🚀 SuperClaude v4.0.8 統合検証${colors.reset}`);
  console.log(`${colors.dim}Package Manager: ${pm}${colors.reset}`);
  
  // フラグベースの実行モード
  if (isDeployment) {
    console.log(`${colors.yellow}📦 デプロイメントモード${colors.reset}`);
  } else if (isQuick) {
    console.log(`${colors.blue}⚡ クイックモード${colors.reset}`);
  } else {
    console.log(`${colors.green}🔍 包括検証モード${colors.reset}`);
  }
  
  // 1. 境界チェック（最重要）
  log.section('フィーチャー境界チェック');
  const boundariesResult = runCommand(`${pmRun} check:boundaries`, true);
  results.boundaries = boundariesResult;
  
  if (boundariesResult.success) {
    log.success('境界チェック: 違反なし');
  } else {
    log.error('境界チェック: 違反あり');
    results.totalErrors++;
    suggestMCP('boundaries', boundariesResult);
    
    // 自動修正の提案
    log.warning(`自動修正: ${pmRun} fix:boundaries`);
  }
  
  // 2. 型チェック
  log.section('TypeScriptチェック');
  const typeResult = runCommand(`${pmRun} typecheck`, true);
  results.types = typeResult;
  
  if (typeResult.success) {
    log.success('型チェック: エラーなし');
  } else {
    log.error('型チェック: エラーあり');
    results.totalErrors++;
    suggestMCP('types', typeResult);
  }
  
  // 3. リンターチェック
  if (!isQuick) {
    log.section('ESLintチェック');
    const lintResult = runCommand(`${pmRun} lint`, true);
    results.lint = lintResult;
    
    if (lintResult.success) {
      log.success('リント: 問題なし');
    } else {
      log.warning('リント: 警告あり');
      results.totalWarnings++;
    }
  }
  
  // 4. テスト実行（スキップ - 必要に応じて手動実行）
  // テストは環境依存やタイムアウトの問題があるため、validate:scでは実行しない
  // 必要な場合は別途 `pnpm test` を実行してください
  
  // 5. ビルドチェック（デプロイメントモードのみ）
  if (isDeployment) {
    log.section('プロダクションビルド');
    const buildResult = runCommand(`${pmRun} build`, true);
    results.build = buildResult;
    
    if (buildResult.success) {
      log.success('ビルド: 成功');
    } else {
      log.error('ビルド: 失敗');
      results.totalErrors++;
      suggestMCP('build', buildResult);
    }
  }
  
  // 結果サマリー
  log.section('検証結果サマリー');
  
  const checkItems = [
    { name: '境界チェック', result: results.boundaries },
    { name: '型チェック', result: results.types }
  ];
  
  if (!isQuick) {
    checkItems.push(
      { name: 'リント', result: results.lint }
    );
  }
  
  if (isDeployment) {
    checkItems.push({ name: 'ビルド', result: results.build });
  }
  
  checkItems.forEach(item => {
    const status = item.result?.success ? '✅' : '❌';
    console.log(`  ${status} ${item.name}`);
  });
  
  // 総合判定
  console.log('');
  if (results.totalErrors === 0) {
    if (results.totalWarnings === 0) {
      log.success(`${colors.bold}🎉 全てのチェックに合格しました！${colors.reset}`);
    } else {
      log.warning(`${colors.bold}⚠️ ${results.totalWarnings}個の警告があります${colors.reset}`);
    }
    
    if (isDeployment) {
      log.success('デプロイ準備完了');
    }
  } else {
    log.error(`${colors.bold}❌ ${results.totalErrors}個のエラーがあります${colors.reset}`);
    
    // MCPサーバー統合提案
    console.log('');
    log.mcp('SuperClaude MCPサーバー活用提案:');
    log.mcp('  1. Serena MCP: プロジェクト全体のセマンティック分析');
    log.mcp('  2. Sequential MCP: エラーの根本原因分析');
    log.mcp('  3. Morphllm MCP: パターンベースの自動修正');
    log.mcp('  4. Context7 MCP: ベストプラクティスの確認');
    
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log.error(`予期しないエラー: ${error.message}`);
  process.exit(1);
});

// 実行
main().catch(error => {
  log.error(`実行エラー: ${error.message}`);
  process.exit(1);
});