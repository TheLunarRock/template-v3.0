# Claude Code Development Guide - SuperClaude Edition

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
| **フック** | 絶対にindex.tsから公開しない | React Rules of Hooks違反でクラッシュ |
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

## 🎯 実装チェックリスト

### Claude Code実装時の確認事項

- [ ] **フィーチャー構造** - `src/features/[機能名]/`に作成
- [ ] **import形式** - 全て`@/features/[名前]`形式
- [ ] **フック非公開** - index.tsから絶対に公開しない
- [ ] **API関数公開** - 純粋な関数として公開
- [ ] **UI非共有** - 各フィーチャーが独自実装
- [ ] **境界チェック実行** - `pnpm check:boundaries`が成功
- [ ] **型定義** - any型を使用しない
- [ ] **フォント** - `font-rounded`を全テキストに適用
- [ ] **SuperClaude** - 適切なフラグが自動適用されている

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