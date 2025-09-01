# Claude Code専用実装ガイド - SuperClaude v4 Production Edition

# ═══════════════════════════════════════════════════
# 🚀 SuperClaude v4 Production Edition の新機能
# ═══════════════════════════════════════════════════

## 📊 バージョン情報

| 項目 | 内容 |
|------|------|
| **Framework Version** | SuperClaude v4.0.8 |
| **Template Edition** | Production (Enterprise-ready) |
| **Architecture** | Feature-based with strict boundaries |
| **Last Updated** | 2025-08-31 |

## 🎯 v4新機能：14の専門エージェント

### プロダクション開発に最適化されたエージェント

| エージェント | 役割 | フィーチャー境界との統合 |
|-------------|------|------------------------|
| **general-purpose** | 複雑な質問の調査と多段階タスク | 全フィーチャー横断的な分析 |
| **python-expert** | SOLID原則に基づくPythonコード | フィーチャー内のPython実装 |
| **system-architect** | スケーラブルなシステム設計 | フィーチャー間の依存関係設計 |
| **refactoring-expert** | 技術的負債の削減とリファクタリング | 境界を維持したリファクタリング |
| **devops-architect** | インフラとデプロイメントの自動化 | CI/CDパイプライン統合 |
| **security-engineer** | セキュリティ脆弱性の特定と対策 | フィーチャー単位のセキュリティ監査 |
| **frontend-architect** | アクセシブルで高性能なUI | フィーチャー内UIコンポーネント設計 |
| **backend-architect** | 信頼性の高いバックエンドシステム | APIフィーチャーの設計 |
| **quality-engineer** | 包括的なテスト戦略 | フィーチャー単位のテスト |
| **performance-engineer** | システムパフォーマンス最適化 | ボトルネック分析と改善 |
| **requirements-analyst** | 要件定義と仕様化 | フィーチャー要件の明確化 |
| **technical-writer** | 技術文書の作成 | フィーチャードキュメント |
| **root-cause-analyst** | 複雑な問題の根本原因分析 | 境界違反の原因特定 |
| **learning-guide** | プログラミング概念の教育 | チームへの知識共有 |

## 🎮 /sc: コマンド体系（v4統一名前空間）

### フィーチャー開発専用コマンド

| コマンド | 機能 | 使用タイミング |
|----------|------|--------------|
| `/sc:start` | セッション開始＋境界チェック | 作業開始時 |
| `/sc:feature` | フィーチャー作成ウィザード | 新機能追加時 |
| `/sc:boundaries` | 境界違反の検出と修正 | 実装後の検証 |
| `/sc:analyze` | フィーチャー依存関係分析 | アーキテクチャレビュー |
| `/sc:test` | フィーチャー単位テスト実行 | 品質保証 |
| `/sc:refactor` | 境界を維持したリファクタリング | コード改善 |
| `/sc:validate` | 包括的な品質チェック | リリース前 |

## 🎭 6つの行動モード（v4完全版）

| モード | 用途 | フィーチャー開発での活用 |
|--------|------|------------------------|
| **Brainstorming** | 要件探索 | 新フィーチャーの概念設計 |
| **Business Panel** 🆕 | 戦略的分析 | ビジネス価値とROI評価 |
| **Orchestration** | 効率的な実行 | 並列タスクの最適化 |
| **Token-Efficiency** | リソース節約 | 大規模リファクタリング時 |
| **Task Management** | 体系的管理 | フィーチャー実装の進捗管理 |
| **Introspection** | メタ認知分析 | 境界違反の深層分析 |

# ═══════════════════════════════════════════════════
# 🔴 CRITICAL: Feature-Based Development Rules (維持)
# ═══════════════════════════════════════════════════

## 🤖 重要：このテンプレートは100% Claude Code実装用

**人間はコードを書きません。全ての実装はClaude Codeが行います。**
このドキュメントはClaude Codeの実装ルールです。曖昧さを排除し、自動判断可能な内容のみ記載しています。

## 🚨 なぜフックを公開してはいけないのか（30秒理解）

| 問題 | 具体的なエラー | 影響 |
|------|--------------|------|
| **Reactルール違反** | 関数・ループ内で使用不可 | アプリがクラッシュ |
| **SSR破壊** | サーバーサイドで動作不可 | Hydrationエラー |
| **テスト困難** | React Testing Library必須 | 単体テスト不可 |
| **強結合** | Reactに依存 | 他フレームワーク使用不可 |

**→ だから純粋な関数として公開する**

## 🔴 絶対原則（これを破ると実装失敗）

### 7つの鉄則

| ルール | 内容 | 違反時の結果 |
|--------|------|-------------|
| **フック** | フックは絶対にindex.tsから公開しない | React Rules of Hooks違反でクラッシュ |
| **UIコンポーネント** | 各フィーチャーが独自実装（共有禁止） | 密結合・責任曖昧化・スタイル競合 |
| **データ取得** | 純粋な関数として公開（フック禁止） | どこでも使用可能に |
| **import形式** | `@/features/[name]`のみ | ビルドエラー・境界違反 |
| **状態管理** | 各フィーチャーが独自管理 | グローバル状態の混乱 |
| **相対パス** | `../`での他フィーチャー参照禁止 | 循環参照・ビルドエラー |
| **内部アクセス** | `/components`, `/hooks`等への直接参照禁止 | カプセル化の破壊 |

### 正しいindex.tsテンプレート

```typescript
// src/features/[feature-name]/index.ts

// ✅ API関数（公開推奨）
export { getFeatureData, createItem, updateItem, deleteItem } from './api/featureApi'

// ✅ ドメイン型のみ（公開可）
export type { FeatureItem, FeatureConfig } from './types'

// ❌ フック（絶対公開禁止） - これが最重要！
// ❌ UIコンポーネント（原則非公開）
// ❌ 内部実装（utils, store等）
```

## 📁 フィーチャー構造

```
src/features/[機能名]/
├── api/          # API関数（公開推奨）
├── components/   # UIコンポーネント（内部のみ）
├── hooks/        # カスタムフック（内部のみ）
├── types/        # 型定義（ドメイン型のみ公開）
├── utils/        # ヘルパー（内部のみ）
├── store/        # 状態管理（内部のみ）
└── index.ts      # 公開API（最小限）
```

## 🔍 境界違反の自動検出

```bash
# package.jsonに追加済みのコマンド
pnpm check:boundaries

# または手動実行
grep -r "from '\.\./'" src/features/ || echo "✅ 境界違反なし"
grep -r "from '@/features/[^']*/\(components\|hooks\|utils\|api\|types\)" src/features/ || echo "✅ 直接参照なし"
```

## 🤖 SuperClaude統合

### 自動フラグトリガー

| 状況 | フラグ | 効果 |
|------|--------|------|
| 新フィーチャー作成 | `--task-manage --validate --delegate` | タスク管理＋境界検証＋並列実行 |
| 複雑な依存関係 | `--sequential --think-hard` | 深い分析＋循環参照検出 |
| UI開発 | `--magic /ui --validate` | 21st.devパターン＋境界チェック |
| リファクタリング | `--morph --validate --safe-mode` | パターン適用＋安全実行 |
| バグ修正 | `--think --validate` | 原因分析＋影響範囲確認 |
| テスト作成 | `--playwright --delegate` | E2Eテスト＋並列実行 |

### MCPサーバー活用

| サーバー | 用途 | 自動トリガー |
|----------|------|-------------|
| **Serena** | フィーチャー境界の意味的監視 | 他フィーチャー参照時 |
| **Morphllm** | 境界違反パターンの自動修正 | 違反検出時 |
| **Sequential** | 複雑な依存関係の分析 | 3つ以上のフィーチャー関連時 |
| **Magic** | フィーチャー独自UIの高速生成 | UIコンポーネント作成時 |
| **Playwright** | フィーチャー単位のE2Eテスト | テスト作成時 |
| **Context7** | 公式ドキュメント・パターン取得 | ライブラリ/フレームワーク使用時 |

### TodoWrite自動化

- **3つ以上のステップ** → 自動的にTodoWrite使用
- **フィーチャー作成** → タスク自動生成
- **境界違反チェック** → 各タスクで自動実行
- **並列実行** → 独立タスクを最大15並列

## 📋 実装フロー（SuperClaude自動化）

### 1. 開始前チェック（自動）
```bash
--think --validate  # 既存構造の分析と境界チェック
pnpm check:boundaries  # 境界違反の事前検出
```

### 2. フィーチャー作成（自動）
```bash
--task-manage --validate  # タスク自動生成と検証
mkdir -p src/features/[機能名]/{api,components,hooks,types,utils,store}
```

### 3. 実装（並列最適化）
```bash
--delegate auto --concurrency 15  # 最大15並列で独立タスク実行
--morph --validate  # パターン適用と即時検証
```

### 4. 完了後検証（自動）
```bash
--validate --safe-mode  # 全面的な境界チェック
pnpm check:boundaries  # 最終確認
```

## ⚠️ よくある違反（SuperClaudeが自動修正）

### 最頻出パターンと修正

```typescript
// ❌ 違反例1: フック公開（最も危険）
export { useUser } from './hooks/useUser'  // 致命的エラー！

// ✅ 修正後: API関数公開
export { getUserData } from './api/userApi'  // 正しい

// 使用側の実装
import { getUserData } from '@/features/user'  // API関数を使用
const useMyFeature = () => {
  const [user, setUser] = useState(null)
  useEffect(() => {
    getUserData(id).then(setUser)  // 自フィーチャー内でフック化
  }, [id])
  return user
}

// ❌ 違反例2: 相対パスで他フィーチャー参照
import { UserProfile } from '../user/components/UserProfile'

// ✅ 修正後: 独自UI実装
// 各フィーチャーが独自のUIコンポーネントを持つ
const MyUserCard = ({ userId }) => { /* 独自実装 */ }
```

**SuperClaude自動修正**: `--morph --validate`で即座に修正

## 💡 効率化の指標

| 作業 | 従来 | SuperClaude | 改善率 | 測定根拠 |
|------|------|------------|--------|---------|
| フィーチャー作成 | 30分 | 5分 | 83%短縮 | 実測平均 |
| 境界違反検出 | 手動5分 | 自動即座 | 100%自動化 | ツール実装 |
| 違反修正 | 手動10分 | 自動2秒 | 99%短縮 | --morph実測 |
| 並列タスク実行 | 順次60分 | 並列10分 | 83%短縮 | 15並列実測 |

*測定根拠: 実際のプロジェクトでの平均値

## 🤖 Claude Code実装の自動フロー

### 実装開始時（必須実行）
```bash
git status                    # 現在の状態確認
pnpm check:boundaries        # 既存構造の把握
```

### フィーチャー作成時（必須使用）
```bash
pnpm create:feature [name]   # 自動生成を使用（手動作成禁止）
```

### 実装完了時（必須実行）
```bash
pnpm check:boundaries        # 境界違反チェック
pnpm fix:boundaries          # 違反の自動修正
pnpm typecheck              # 型チェック
pnpm test                   # テスト実行
pnpm build                  # ビルド確認
```

### エラー時の自動対応表
| エラー種別 | 実行コマンド | 次のアクション |
|-----------|-------------|--------------|
| 境界違反 | `pnpm fix:boundaries` | 自動修正される |
| 型エラー | `pnpm typecheck` | エラー箇所を修正 |
| テスト失敗 | `pnpm test:unit` | 失敗テストを修正 |
| ビルドエラー | `pnpm build` | エラーログを解析 |

## 🎯 実装完了の定義

以下が全て成功したら実装完了：
```bash
pnpm validate:all   # 全チェックが通る
```

### Claude Codeの禁止事項（絶対）

1. **フィーチャー間の共有** → 禁止（重複を許容）
2. **フック公開** → 禁止（内部実装）
3. **手動ディレクトリ作成** → 禁止（create:feature使用）
4. **判断の保留** → 禁止（ルールに従う）
5. **any型の使用** → 禁止（適切な型定義）

## 🔵 Git/GitHub設定

```bash
# 機能ブランチで作業（必須）
git checkout -b feature/[機能名]-[日付]

# SuperClaude自動追跡
--task-manage  # 進捗を自動管理

# mainへの直接コミット禁止
```

## 💡 SuperClaude活用のコツ

### 重要な理解

1. **フックは内部実装** - 他フィーチャーから使用不可
2. **データ取得は関数** - どこからでも呼び出し可能
3. **UIは独立** - 重複を許容して独立性を維持
4. **SuperClaudeが監視** - 違反は自動検出・修正

### よく使うコマンド組み合わせ

```bash
# 新機能開発の黄金パターン
--task-manage --validate --delegate auto --concurrency 15

# デバッグの黄金パターン
--think-hard --sequential --validate

# リファクタリングの黄金パターン
--morph --validate --safe-mode
```

---

**このドキュメントはSuperClaudeフレームワークに最適化されています。**
**詳細なプロジェクト固有設定は PROJECT_INFO.md を参照してください。**