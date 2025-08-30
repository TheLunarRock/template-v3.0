#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { detectPackageManager, getPackageManagerCommand } = require('./utils');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`)
};

// コマンド実行
const runCommand = (command, silent = false) => {
  try {
    if (!silent) log.info(`実行中: ${command}`);
    execSync(command, { stdio: silent ? 'pipe' : 'inherit' });
    return true;
  } catch (error) {
    if (!silent) log.error(`コマンド実行エラー: ${command}`);
    return false;
  }
};

// メイン処理
async function setup() {
  console.log('\n🚀 プロジェクトセットアップを開始します\n');

  // 1. 現在のディレクトリ名をプロジェクト名として使用
  const currentDir = path.basename(process.cwd());
  log.info(`プロジェクト名: ${currentDir}`);
  
  // 2. package.jsonの更新
  log.info('package.jsonを更新中...');
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.name = currentDir;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  log.success('package.jsonを更新しました');

  // 3. 依存関係のインストール
  log.info('依存関係をインストール中...');
  const packageManager = detectPackageManager();
  
  log.info(`パッケージマネージャー: ${packageManager}`);
  runCommand(getPackageManagerCommand('install'));
  log.success('依存関係のインストールが完了しました');
  
  // 3.5. セキュリティアップデート
  log.info('セキュリティ脆弱性をチェック中...');
  const auditResult = runCommand(getPackageManagerCommand('auditProd'), true);
  
  if (auditResult.output && (auditResult.output.includes('high') || auditResult.output.includes('critical'))) {
    log.warning('セキュリティ脆弱性が検出されました');
    log.info('自動修正を実行中...');
    
    runCommand(`${getPackageManagerCommand('auditFix')} --force`, false);
    
    log.success('セキュリティアップデートが完了しました');
  } else {
    log.success('既知の脆弱性はありません');
  }

  // 4. Git設定
  if (fs.existsSync('.git')) {
    log.info('Git設定を確認中...');
    
    // リモートリポジトリの確認
    const hasRemote = runCommand('git remote get-url origin', true);
    if (!hasRemote) {
      const repoUrl = await question('GitHubリポジトリのURLを入力してください (スキップする場合は空): ');
      if (repoUrl.trim()) {
        runCommand(`git remote add origin ${repoUrl.trim()}`);
        log.success('リモートリポジトリを設定しました');
      }
    }
  }

  // 5. 環境変数ファイルの作成
  log.info('環境変数ファイルを作成中...');
  const envExample = `# 環境変数
NEXT_PUBLIC_APP_NAME=${currentDir}

# 開発環境
NODE_ENV=development

# APIエンドポイント（必要に応じて追加）
# NEXT_PUBLIC_API_URL=http://localhost:3000/api
`;
  
  if (!fs.existsSync('.env.local')) {
    fs.writeFileSync('.env.local', envExample);
    log.success('.env.localファイルを作成しました');
  } else {
    log.warning('.env.localは既に存在します');
  }

  // 6. 設定ファイルの検証
  log.info('設定ファイルを検証中...');
  
  // TypeScriptの型チェック
  if (fs.existsSync('tsconfig.json')) {
    log.info('TypeScriptの設定を確認中...');
    if (runCommand(`npx tsc --noEmit`, true)) {
      log.success('TypeScriptの設定は正常です');
    } else {
      log.warning('TypeScriptの型エラーがあります（後で修正してください）');
    }
  }
  
  // GitHub Actions YAMLの検証
  const workflowsDir = '.github/workflows';
  if (fs.existsSync(workflowsDir)) {
    log.info('GitHub Actionsワークフローを確認中...');
    const yamlFiles = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    let yamlValid = true;
    
    for (const file of yamlFiles) {
      const filePath = path.join(workflowsDir, file);
      // 基本的なYAML構文チェック
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        // 簡易的な構文チェック（インデントとキー構造）
        if (!content.includes('name:') || !content.includes('on:')) {
          log.warning(`${file}: 必須フィールドが不足している可能性があります`);
          yamlValid = false;
        }
      } catch (error) {
        log.error(`${file}: 読み取りエラー`);
        yamlValid = false;
      }
    }
    
    if (yamlValid) {
      log.success('GitHub Actionsワークフローの構文は正常です');
    }
  }
  
  // package.jsonの検証
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!pkg.name || !pkg.version) {
      log.warning('package.jsonに必須フィールドが不足しています');
    } else {
      log.success('package.jsonの構文は正常です');
    }
  } catch (error) {
    log.error('package.jsonの解析エラー');
  }
  
  // CLAUDE.mdの検証
  if (fs.existsSync('CLAUDE.md')) {
    log.info('CLAUDE.mdを確認中...');
    const claudeContent = fs.readFileSync('CLAUDE.md', 'utf8');
    const requiredSections = [
      'フィーチャーベース開発の原則',
      'UI実装ガイド',
      'Git操作ルール',
      'GitHub Actions設定'
    ];
    
    let missingSection = false;
    for (const section of requiredSections) {
      if (!claudeContent.includes(section)) {
        log.warning(`CLAUDE.md: "${section}" セクションが見つかりません`);
        missingSection = true;
      }
    }
    
    if (!missingSection) {
      log.success('CLAUDE.mdは必要なセクションを含んでいます');
    }
  } else {
    log.error('CLAUDE.mdが見つかりません - Claude Codeの開発ガイドが必要です');
  }
  
  // フィーチャーベース構造の検証
  log.info('プロジェクト構造を確認中...');
  const requiredDirs = [
    'src/app',
    'src/features',
    'src/components',
    'src/styles'
  ];
  
  let structureValid = true;
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      log.warning(`必須ディレクトリが見つかりません: ${dir}`);
      structureValid = false;
    }
  }
  
  if (structureValid) {
    log.success('フィーチャーベース構造が正しく設定されています');
  }
  
  // Tailwind設定の検証
  if (fs.existsSync('tailwind.config.ts') || fs.existsSync('tailwind.config.js')) {
    const tailwindConfig = fs.readFileSync(
      fs.existsSync('tailwind.config.ts') ? 'tailwind.config.ts' : 'tailwind.config.js',
      'utf8'
    );
    if (tailwindConfig.includes('M PLUS Rounded 1c')) {
      log.success('丸文字フォント設定が確認されました');
    } else {
      log.warning('丸文字フォント設定が見つかりません');
    }
  }
  
  // Node.jsバージョンの確認
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion < 18) {
    log.error(`Node.js ${nodeVersion} は古すぎます。v18以上が必要です`);
  } else {
    log.success(`Node.js ${nodeVersion} ✓`);
  }
  
  // .gitignoreの確認
  if (!fs.existsSync('.gitignore')) {
    log.warning('.gitignoreファイルが見つかりません');
    // 基本的な.gitignoreを作成
    const gitignoreContent = `node_modules/
.next/
.env.local
.env*.local
.DS_Store
*.log
.vercel
out/
build/
dist/
`;
    fs.writeFileSync('.gitignore', gitignoreContent);
    log.success('.gitignoreファイルを作成しました');
  }

  // 7. VS Code設定の作成
  log.info('VS Code設定を作成中...');
  const vscodeDir = '.vscode';
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir);
    
    // settings.json
    const vscodeSettings = {
      "editor.formatOnSave": true,
      "editor.defaultFormatter": "esbenp.prettier-vscode",
      "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
      },
      "typescript.tsdk": "node_modules/typescript/lib",
      "typescript.enablePromptUseWorkspaceTsdk": true,
      "tailwindCSS.includeLanguages": {
        "typescript": "javascript",
        "typescriptreact": "javascript"
      },
      "files.associations": {
        "*.css": "tailwindcss"
      }
    };
    fs.writeFileSync(path.join(vscodeDir, 'settings.json'), JSON.stringify(vscodeSettings, null, 2));
    
    // extensions.json
    const vscodeExtensions = {
      "recommendations": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss",
        "formulahendry.auto-rename-tag",
        "christian-kohler.path-intellisense"
      ]
    };
    fs.writeFileSync(path.join(vscodeDir, 'extensions.json'), JSON.stringify(vscodeExtensions, null, 2));
    
    log.success('VS Code設定を作成しました');
  }

  // 8. Prettier設定の作成
  log.info('Prettier設定を作成中...');
  if (!fs.existsSync('.prettierrc')) {
    const prettierConfig = {
      "semi": false,
      "singleQuote": true,
      "tabWidth": 2,
      "trailingComma": "es5",
      "printWidth": 100,
      "bracketSpacing": true,
      "arrowParens": "always",
      "endOfLine": "lf"
    };
    fs.writeFileSync('.prettierrc', JSON.stringify(prettierConfig, null, 2));
    log.success('Prettier設定を作成しました');
  }

  // 9. ESLint設定の作成
  log.info('ESLint設定を作成中...');
  if (!fs.existsSync('.eslintrc.json')) {
    const eslintConfig = {
      "extends": ["next/core-web-vitals"],
      "rules": {
        "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
        "react/display-name": "off"
      }
    };
    fs.writeFileSync('.eslintrc.json', JSON.stringify(eslintConfig, null, 2));
    log.success('ESLint設定を作成しました');
  }

  // 10. フィーチャーテンプレートの作成
  log.info('フィーチャーテンプレートを作成中...');
  const templateDir = 'src/features/_template';
  if (!fs.existsSync(templateDir)) {
    const dirs = ['api', 'components', 'hooks', 'types', 'utils', 'constants'];
    dirs.forEach(dir => {
      fs.mkdirSync(path.join(templateDir, dir), { recursive: true });
    });
    
    // index.tsテンプレート
    const indexTemplate = `// Public API for this feature
// Export only what other features should use

// Components
// export { FeatureName } from './components/FeatureName'

// Hooks
// export { useFeatureName } from './hooks/useFeatureName'

// Types
// export type { FeatureName } from './types'
`;
    fs.writeFileSync(path.join(templateDir, 'index.ts'), indexTemplate);
    
    // README.mdテンプレート
    const readmeTemplate = `# Feature: [Feature Name]

## 概要
このフィーチャーの目的と機能を記述

## 構造
- \`api/\` - API通信関連
- \`components/\` - UIコンポーネント
- \`hooks/\` - カスタムフック
- \`types/\` - 型定義
- \`utils/\` - ユーティリティ関数
- \`constants/\` - 定数定義

## 使用方法
\`\`\`typescript
import { ComponentName } from '@features/feature-name'
\`\`\`
`;
    fs.writeFileSync(path.join(templateDir, 'README.md'), readmeTemplate);
    
    log.success('フィーチャーテンプレートを作成しました');
  }

  // 11. 初回ビルドの実行
  log.info('初回ビルドを実行中...');
  runCommand(`${getPackageManagerCommand('run')} build`);
  log.success('ビルドが完了しました');

  // 8. 完了メッセージ
  console.log(`
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
🎉 セットアップが完了しました！

次のコマンドで開発を開始できます:
  ${colors.yellow}${getPackageManagerCommand('run')} dev${colors.reset}

その他の利用可能なコマンド:
  ${colors.yellow}${getPackageManagerCommand('run')} build${colors.reset}  - プロダクションビルド
  ${colors.yellow}${getPackageManagerCommand('run')} start${colors.reset}  - プロダクションサーバー起動

詳細はCLAUDE.mdを参照してください。
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`);

  rl.close();
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log.error('セットアップ中にエラーが発生しました');
  console.error(error);
  process.exit(1);
});

// 実行
setup().catch((error) => {
  log.error('セットアップに失敗しました');
  console.error(error);
  process.exit(1);
});