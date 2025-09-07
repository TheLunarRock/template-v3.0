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
  bold: '\x1b[1m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
  mcp: (msg) => console.log(`${colors.dim}[MCP]${colors.reset} ${msg}`),
  progress: (msg) => process.stdout.write(`\r${colors.cyan}⏳${colors.reset} ${msg}`),
  clearLine: () => process.stdout.write('\r\x1b[K')
};

// スピナーアニメーション
const spinnerFrames = ['⏳', '⏰', '⏱', '⏲'];
let spinnerIndex = 0;
let spinnerInterval = null;

// スピナー開始
const startSpinner = (message) => {
  spinnerIndex = 0;
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\r${colors.cyan}${spinnerFrames[spinnerIndex]}${colors.reset} ${message}`);
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
  }, 200);
};

// スピナー停止
const stopSpinner = () => {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
    log.clearLine();
  }
};

// コマンド実行
const runCommand = (command, silent = false, showProgress = false) => {
  try {
    if (!silent) log.info(`実行中: ${command}`);
    
    const startTime = Date.now();
    let progressTimer = null;
    
    if (showProgress) {
      startSpinner(`${command.split(' ').pop()} 実行中...`);
      
      // 経過時間表示
      progressTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        process.stdout.write(`\r${colors.cyan}⏰${colors.reset} ${command.split(' ').pop()} 実行中... (${elapsed}秒経過)`);
      }, 1000);
    }
    
    const output = execSync(command, { 
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8'
    });
    
    if (showProgress) {
      clearInterval(progressTimer);
      stopSpinner();
    }
    
    return { success: true, output };
  } catch (error) {
    if (showProgress) {
      stopSpinner();
    }
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
  const isFull = args.includes('--full') || (!isQuick && !isDeployment);
  const pm = detectPackageManager();
  const pmRun = getPackageManagerCommand(pm);
  
  console.log(`\n${colors.bold}🚀 SuperClaude v4.0.8 統合検証${colors.reset}`);
  console.log(`${colors.dim}Package Manager: ${pm}${colors.reset}`);
  
  // フラグベースの実行モード
  if (isDeployment) {
    console.log(`${colors.yellow}📦 デプロイメントモード（境界・型・リント・ビルド）${colors.reset}`);
  } else if (isFull) {
    console.log(`${colors.green}🔍 フル検証モード（境界・型・リント・テスト・ビルド）${colors.reset}`);
  } else if (isQuick) {
    console.log(`${colors.blue}⚡ クイックモード（境界・型のみ）${colors.reset}`);
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
  
  // 4. テスト実行（フルモードのみ - ユニットテストのみ）
  if (isFull) {
    log.section('ユニットテスト実行');
    const testResult = runCommand(`${pmRun} test:unit`, true, true);
    results.tests = testResult;
    
    if (testResult.success) {
      log.success('ユニットテスト: 全て合格');
    } else {
      log.error('ユニットテスト: 失敗あり');
      results.totalErrors++;
      suggestMCP('tests', testResult);
    }
    
    // E2Eテストはスキップ
    log.info('E2Eテストはスキップ（必要時に手動実行）');
  }
  
  // 5. ビルドチェック（フルモードまたはデプロイメントモード）
  if (isFull || isDeployment) {
    log.section('プロダクションビルド');
    log.info('Next.jsビルドを実行中です...');
    
    const buildResult = runCommand(`${pmRun} build`, true, true);
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
  
  if (isFull) {
    checkItems.push({ name: 'テスト', result: results.tests });
  }
  
  if (isFull || isDeployment) {
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