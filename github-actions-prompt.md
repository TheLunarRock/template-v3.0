**🚨 実装開始前の必須手順 🚨**

## 1️⃣ 最初に必ず実行
```bash
cat CLAUDE.md | head -50   # CLAUDE.mdの絶対原則を確認
ls -la src/features/        # 既存構造を確認
```

## 2️⃣ 10秒で理解する絶対原則
```typescript
// 🔴 これだけ覚えれば95%の違反を防げる
const 絶対ルール = {
  "フック": "絶対に公開しない（内部実装）",
  "UIコンポーネント": "絶対に公開しない（各フィーチャーが独自実装）", 
  "データ取得": "純粋な関数として公開（フックではない）",
  "import形式": "@/features/[name]のみ（内部ディレクトリ禁止）",
  "状態管理": "各フィーチャーが独自に持つ（グローバル禁止）"
}
```

## 3️⃣ フィーチャーベース開発（絶対遵守）
**全ての新機能は必ずこの構造：**
```
src/features/[機能名]/
├── components/   # UIコンポーネント（内部使用のみ）
├── hooks/        # カスタムフック（内部使用のみ）
├── types/        # 型定義（ドメイン型のみ公開）
├── api/          # API関数（公開推奨）
├── utils/        # ヘルパー関数（内部使用）
├── store/        # 状態管理（内部使用のみ）
└── index.ts      # 公開API（最小限に留める）
```

### 🚨 境界ルール（違反は即失敗）
❌ **絶対禁止**: `../other-feature/components/`への直接アクセス
❌ **絶対禁止**: `import { useXxx } from '@/features/other'`（フック公開禁止）
❌ **絶対禁止**: `import { Component } from '@/features/other'`（UI共有禁止）
❌ **絶対禁止**: グローバル状態管理・dataAccess層
✅ **必須**: `import { getXxxData } from '@/features/other'`（API関数のみ）

## 4️⃣ 正しいindex.tsの書き方
```typescript
// src/features/[feature-name]/index.ts

// ✅ データ取得・操作関数（公開推奨）
export { getFeatureData, updateFeatureData } from './api/featureApi'

// ✅ ドメイン型定義のみ（公開可）
export type { FeatureItem } from './types'

// ❌❌❌ フック（絶対に公開禁止）
// export { useFeature } from './hooks/useFeature'  // 致命的エラー！

// ❌❌❌ UIコンポーネント（絶対に公開禁止）
// export { FeatureComponent } from './components/FeatureComponent'  // 致命的エラー！
```

## 5️⃣ 実装ルール
✅ **必須**: 全変数・関数に明示的な型定義
❌ **禁止**: any型、src/components直下への新規作成
✅ **必須**: font-roundedクラスの使用

## 6️⃣ 実装後の自己検証（必須）
```bash
# 境界違反チェック（0件であることを確認）
grep -r "from '\.\." src/features/
grep -r "from '@/features/[^']*/\(components\|hooks\|utils\)" src/features/

# 実装内容を具体的に確認
cat -n [作成・修正したファイル] | grep -A5 -B5 [追加した機能]
```

❌ 確認せずに「完了」と報告することは禁止
❌ 境界違反を検出したら即座に修正
✅ 具体的に報告（例：「src/features/auth/api/authApi.ts:line 23にgetUserData関数を追加」）

## 7️⃣ GitHub Actions制限
❌ **絶対禁止**: npm install, pnpm add, yarn add
✅ package.jsonの既存パッケージのみ使用

Always respond in 日本語