#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

/**
 * パッケージマネージャーを検出
 * @returns {'npm' | 'pnpm' | 'yarn'} 検出されたパッケージマネージャー
 */
function detectPackageManager() {
  // 1. ロックファイルから判断
  if (fs.existsSync('pnpm-lock.yaml')) {
    return 'pnpm';
  }
  if (fs.existsSync('yarn.lock')) {
    return 'yarn';
  }
  if (fs.existsSync('package-lock.json')) {
    return 'npm';
  }
  
  // 2. 環境変数から判断
  const userAgent = process.env.npm_config_user_agent || '';
  if (userAgent.includes('pnpm')) {
    return 'pnpm';
  }
  if (userAgent.includes('yarn')) {
    return 'yarn';
  }
  
  // 3. コマンドの利用可能性から判断
  try {
    execSync('pnpm --version', { stdio: 'pipe' });
    return 'pnpm';
  } catch {}
  
  try {
    execSync('yarn --version', { stdio: 'pipe' });
    return 'yarn';
  } catch {}
  
  // 4. デフォルトはnpm
  return 'npm';
}

/**
 * パッケージマネージャーごとのコマンドを取得
 * @param {string} command - 実行したいコマンド ('install', 'run', 'audit' など)
 * @returns {string} パッケージマネージャー固有のコマンド
 */
function getPackageManagerCommand(command) {
  const pm = detectPackageManager();
  
  const commands = {
    install: {
      npm: 'npm install',
      pnpm: 'pnpm install',
      yarn: 'yarn install'
    },
    installDev: {
      npm: 'npm install -D',
      pnpm: 'pnpm add -D',
      yarn: 'yarn add -D'
    },
    run: {
      npm: 'npm run',
      pnpm: 'pnpm',
      yarn: 'yarn'
    },
    audit: {
      npm: 'npm audit',
      pnpm: 'pnpm audit',
      yarn: 'yarn audit'
    },
    auditFix: {
      npm: 'npm audit fix',
      pnpm: 'pnpm audit --fix',
      yarn: 'yarn audit --fix'
    },
    auditProd: {
      npm: 'npm audit --production',
      pnpm: 'pnpm audit --production',
      yarn: 'yarn audit --production'
    }
  };
  
  return commands[command]?.[pm] || `${pm} ${command}`;
}

module.exports = {
  detectPackageManager,
  getPackageManagerCommand
};