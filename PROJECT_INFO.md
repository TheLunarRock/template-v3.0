# SuperClaude v4 Production Edition - プロジェクト情報

## 🚀 アップグレード完了：v3 → v4.0.8

### 📊 バージョン情報
- **Framework**: SuperClaude v4.0.8 Production Edition
- **Template**: Enterprise-ready with Feature-based Architecture
- **Updated**: 2025-08-31

## 🎯 v4 新機能の活用ガイド

### 14の専門エージェント活用例

```bash
# 新フィーチャー開発
/sc:plan auth-feature        # requirements-analyst + system-architect
/sc:implement auth-feature   # backend-architect が自動選択
/sc:review                   # security-engineer + quality-engineer

# パフォーマンス問題
/sc:analyze --performance    # performance-engineer が分析
/sc:optimize                 # refactoring-expert が最適化

# 境界違反の修正
/sc:boundaries --check       # root-cause-analyst が原因特定
/sc:refactor --fix          # refactoring-expert が修正
```

### /sc: コマンド体系（v4新機能）

```bash
# セッション管理
/sc:start                   # 作業開始（境界チェック付き）
/sc:feature user-profile    # フィーチャー作成ウィザード
/sc:validate               # 包括的品質チェック

# ビジネス分析（v4新機能）
/sc:business-panel feature-name
→ ROI分析
→ 技術的負債評価
→ 実装優先順位提案
```

### 初回セットアップ
```bash
# リポジトリをクローン
git clone [your-repo-url] my-app
cd my-app

# 完全セットアップ（推奨）
pnpm setup:project

# 開発開始
pnpm dev
```

### Claude Code実装パターン

#### 新機能開発
```bash
# 1. 開始
pnpm claude:start

# 2. フィーチャー作成
pnpm create:feature user-profile

# 3. 実装後の検証
pnpm claude:validate

# 4. 完了確認
pnpm claude:complete
```

#### エラー対応
```bash
# 境界違反エラー
pnpm fix:boundaries

# 型エラー
pnpm typecheck  # 詳細確認して修正

# テスト失敗
pnpm test:unit  # 個別テスト実行
```

### SuperClaudeフラグ対応表

| タスク | 推奨フラグ | 効果 |
|--------|----------|------|
| 新機能開発 | `--task-manage --validate` | タスク管理+自動検証 |
| UI開発 | `--magic /ui` | 21st.dev UIパターン |
| 複雑な分析 | `--think-hard --sequential` | 深い分析 |
| リファクタリング | `--morph --validate` | パターン適用+検証 |
| E2Eテスト | `--playwright` | ブラウザ自動化 |

### MCPサーバー活用

| サーバー | 用途 | 自動トリガー |
|---------|------|------------|
| Context7 | ライブラリドキュメント | import文検出時 |
| Sequential | 複雑な分析 | --thinkフラグ |
| Magic | UI生成 | /ui, /21コマンド |
| Morphllm | 大規模編集 | 複数ファイル編集時 |
| Playwright | E2Eテスト | test:e2e実行時 |
| Serena | セマンティック分析 | シンボル操作時 |

## プロジェクト固有の設定

<!-- ここにプロジェクト固有の設定を追加 -->
<!-- 例：API設定、環境変数、業務ロジック等 -->