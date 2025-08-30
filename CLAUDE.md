# Claude Code Development Guide

## ⚠️ Claude Code必読：絶対遵守事項

**このドキュメントは、あなた（Claude Code）のための厳格な実装ガイドです。**
**以下のルールは絶対です。違反すると実装が失敗します。**
**人間の開発者ではなく、Claude Codeが実行時に必ず従うべき命令書です。**

1. **フィーチャー間の参照は必ずindex.ts経由**
2. **../でフィーチャーを跨ぐimportは即座に失敗**
3. **他フィーチャーの/components, /hooks等への直接アクセスは致命的エラー**
4. **実装前に必ず境界違反検出コマンドを実行**
5. **実装後も必ず全import文を再確認**
6. **🔴 最重要: フックは絶対にindex.tsから公開しない（内部実装として隠蔽）**
7. **🔴 最重要: 他フィーチャーのデータはAPI関数経由でのみ取得**

**これらのルールを破ると、コードレビューで却下され、全て書き直しになります。**

# 🔴 最優先ルール（これを無視すると実装失敗）

## 📋 Claude Code: 10秒で理解する絶対原則

```typescript
// 🔴 絶対ルール（違反=即失敗）
const ABSOLUTE_RULES = {
  "フック": "絶対に公開しない（内部実装）",
  "UIコンポーネント": "絶対に公開しない（各フィーチャーが独自実装）",
  "データ取得": "純粋な関数として公開（フックではない）",
  "import形式": "@/features/[name]のみ（内部ディレクトリ禁止）",
  "状態管理": "各フィーチャーが独自に持つ（グローバル禁止）",
  "ユーティリティ": "重複を許容（各フィーチャー内に実装）"
}

// これだけ覚えれば95%の違反を防げる
```

## 0. 🚨 Claude Code最重要：フックとAPI関数の厳格な使い分け

### なぜフックを公開してはいけないのか（Claude Code必読）

#### フック公開によるエラーの実例
```typescript
// ❌ フックを公開すると発生する致命的エラー
// src/features/user/index.ts
export { useUser } from './hooks/useUser'  // これが原因でエラー多発！

// src/features/dashboard/api/dashboardApi.ts
import { useUser } from '@/features/user'  // ❌ エラー: フックは関数内で使えない

const fetchDashboardData = async () => {
  const user = useUser()  // ❌ Runtime Error: フックはReactコンポーネント外で使用不可
  // ...
}

// src/features/dashboard/utils/helpers.ts
import { useUser } from '@/features/user'

export const formatUserInfo = () => {
  const user = useUser()  // ❌ Runtime Error: 通常の関数内でフック使用不可
  // ...
}
```

#### 正しい実装方法
```typescript
// ✅ 純粋な関数として公開
// src/features/user/api/userApi.ts
export const getUserData = async (userId: string): Promise<User> => {
  const response = await fetch(`/api/users/${userId}`)
  return response.json()
}

// src/features/user/index.ts
export { getUserData } from './api/userApi'  // ✅ 関数を公開
export type { User } from './types'
// フックは公開しない！

// src/features/dashboard/api/dashboardApi.ts
import { getUserData } from '@/features/user'  // ✅ 関数をインポート

const fetchDashboardData = async (userId: string) => {
  const user = await getUserData(userId)  // ✅ どこでも使用可能
  // ...
}
```

### フックが引き起こす5つの致命的問題

1. **React Rules of Hooksの違反**
   - 条件分岐内で使用不可
   - ループ内で使用不可
   - 通常の関数内で使用不可

2. **サーバーサイドレンダリング（SSR）の破壊**
   - サーバーサイドでフックは動作しない
   - Hydrationエラーの原因

3. **テストの複雑化**
   - React Testing Libraryが必須
   - モック化が困難
   - 単体テストが書けない

4. **依存関係の強結合**
   - Reactに強く依存
   - 他のフレームワークで再利用不可

5. **実行タイミングの制約**
   - レンダリング時のみ実行
   - 初期化処理で使用不可

### Claude Code: これを必ず守れ

**🔴 絶対ルール: フィーチャー間のデータ取得は必ず純粋な関数で行う**

```typescript
// Claude Code: 必ずこのパターンを使用せよ
// ステップ1: API関数を作成（フィーチャー内部）
const getXxxData = async (id: string) => { /* ... */ }

// ステップ2: API関数を公開（index.ts）
export { getXxxData } from './api/xxxApi'

// ステップ3: 他フィーチャーでAPI関数を使用
import { getXxxData } from '@/features/xxx'

// ステップ4: 必要に応じて自フィーチャー内でフックを作成
const useXxx = () => {
  const [data, setData] = useState()
  useEffect(() => {
    getXxxData(id).then(setData)
  }, [id])
  return data
}
// このフックは公開しない！内部使用のみ！
```

## 1. フィーチャーベース開発の完全な原則（最重要・絶対違反禁止）

### なぜUIコンポーネントを共有してはいけないのか

#### UIコンポーネント共有が引き起こす問題
1. **密結合の発生**: 他フィーチャーのUI変更が自フィーチャーに影響
2. **スタイルの競合**: 各フィーチャーのCSS/デザインシステムが衝突
3. **依存関係の複雑化**: UIの更新が複数フィーチャーに波及
4. **テストの困難化**: UIテストが他フィーチャーに依存
5. **責任の曖昧化**: UIの不具合の責任がどのフィーチャーか不明

#### 正しいアプローチ
```typescript
// ❌ 間違い: 他フィーチャーのUIコンポーネントを使用
import { UserCard } from '@/features/user'  // 禁止！

// ✅ 正しい: 自フィーチャー内に独自のUIを実装
// src/features/dashboard/components/DashboardUserCard.tsx
const DashboardUserCard = ({ userId }: { userId: string }) => {
  // getUserDataでデータを取得し、独自のUIで表示
}

// UIの重複は許容する - 各フィーチャーの独立性が最優先
```

### 🎯 フィーチャーベース開発の8つの基本原則

#### 1. **完全な独立性（Complete Independence）**
- 各フィーチャーは他のフィーチャーなしでも動作可能
- 削除・追加が他に影響しない
- 自己完結型モジュール

#### 2. **厳格なカプセル化（Strict Encapsulation）**
- 内部実装は完全に隠蔽
- 公開APIのみが外部との接点
- 実装変更が外部に影響しない

#### 3. **単一責任の原則（Single Responsibility）**
- 1フィーチャー = 1つの明確なビジネスドメイン
- 関心の完全な分離
- 責任範囲の明確化

#### 4. **疎結合（Loose Coupling）**
- フィーチャー間の依存は最小限
- 依存は抽象（インターフェース）に対して行う
- 具体的な実装には依存しない

#### 5. **高凝集（High Cohesion）**
- 関連機能は同一フィーチャー内に集約
- フィーチャー内の要素は密接に協調
- 論理的なまとまりの維持

#### 6. **明確な境界（Clear Boundaries）**
```
フィーチャーA          境界（index.ts）         フィーチャーB
    内部実装      →    公開API     →         公開APIを利用
   （非公開）          （契約）              （内部は知らない）
```

#### 7. **テスタビリティ（Testability）**
- 各フィーチャーを独立してテスト
- 依存はモック化可能
- 単体テストの容易性

#### 8. **再利用性（Reusability）**
- フィーチャー単位での移植が可能
- 他プロジェクトへの転用
- 汎用的な設計

## 2. フィーチャー間の境界厳守（最重要・絶対違反禁止）

### 🚨 致命的違反パターン（即座に実装失敗）
```typescript
// ❌❌❌ 絶対禁止: 他フィーチャーの内部実装への直接アクセス
import { UserProfile } from '../user/components/UserProfile'  // 致命的エラー
import { useUser } from '../user/hooks/useUser'               // 致命的エラー
import type { UserState } from '../user/types/state'          // 致命的エラー

// ❌❌❌ 絶対禁止: 相対パスでの他フィーチャー参照
import { validateEmail } from '../../auth/utils/validators'   // 致命的エラー
```

### ✅ 唯一許可される正しいパターン
```typescript
// ✅ 必須: index.tsの公開APIのみを通じてアクセス
import { getUserData, updateUserData, type User } from '@/features/user'

// ✅ 必須: aliasを使用した明示的なインポート  
import * as AuthFeature from '@/features/auth'

// ⚠️ 注意: UIコンポーネントは原則としてimportしない
// 各フィーチャーが独自のUIを実装することで疎結合を保つ
```

### 境界ルールの鉄の掟
1. **他フィーチャーへのアクセスは必ずindex.ts経由**
2. **内部ディレクトリ（components/, hooks/, utils/等）への直接参照は即座に失敗**
3. **フィーチャー間の依存は最小限に抑える**
4. **循環参照は絶対禁止**

### index.tsの設計原則
```typescript
// src/features/user/index.ts
// 公開APIのみをexport（内部実装は隠蔽）

// ❌ UIコンポーネントは原則として公開しない
// 各フィーチャーが独自のUIを持つことで疎結合を維持
// export { UserProfile } from './components/UserProfile'  // 非推奨

// ✅ データ取得関数は公開（フックではなく純粋な関数として）
export { getUserData, updateUserData, deleteUserData } from './api/userApi'

// ✅ ドメイン型のみ公開（内部状態型は公開しない）
export type { User, UserPreferences } from './types'  // ドメイン型のみ
// ❌ export type { UserState, UserStore } from './types'  // 内部状態型は禁止

// ❌❌❌ 絶対禁止: フックは内部実装であり公開しない
// export { useUser } from './hooks/useUser'  // 致命的エラー！

// ❌ 内部実装の詳細は絶対にexportしない
// export { validateUserData } from './utils/validators'  // 禁止
// export { userStore } from './store/userStore'          // 禁止
```

## 2. フィーチャーベース開発（絶対遵守）

### 新機能は必ずこの構造で作成
```
src/features/[機能名]/
├── components/   # UIコンポーネント（内部使用）
├── hooks/        # カスタムフック（内部使用のみ）
├── types/        # 型定義（ドメイン型のみ公開）
├── api/          # API関数（公開推奨）
├── utils/        # ヘルパー関数（内部使用）
├── constants/    # 定数定義（必要に応じて公開）
├── store/        # 状態管理（内部使用のみ）
├── __tests__/    # テストファイル
└── index.ts      # 公開API（最小限に留める）
```

### 実装の鉄則
- ❌ **絶対禁止**: src/components直下に新規作成
- ❌ **絶対禁止**: pages/に直接ロジック実装
- ✅ **必須**: 上記構造の厳守
- ✅ **必須**: 各フィーチャーの完全な独立性

### 実装例（必ず参考にする）
```typescript
// ✅ 正しい: src/features/user/api/userApi.ts
export const getUserData = async (userId: string): Promise<User> => {
  const response = await fetch(`/api/users/${userId}`)
  return response.json()
}

export const updateUserData = async (userId: string, data: Partial<User>): Promise<User> => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
  return response.json()
}

// ✅ 正しい: src/features/user/components/UserProfile.tsx
import { useEffect, useState } from 'react'
import { getUserData } from '../api/userApi'  // 内部では直接参照OK

export const UserProfile = ({ userId }: { userId: string }) => {
  const [user, setUser] = useState<User | null>(null)
  
  useEffect(() => {
    getUserData(userId).then(setUser)
  }, [userId])
  
  return (
    <div className="p-4 font-rounded">
      <h2 className="text-2xl font-bold">{user?.name}</h2>
    </div>
  )
}

// ✅ 正しい: src/features/user/index.ts
export { getUserData, updateUserData } from './api/userApi'  // API関数のみ公開
export type { User } from './types'  // ドメイン型のみ公開
// ❌ フックは絶対に公開しない！
// ❌ UIコンポーネントも原則公開しない！
```

### 🚫 なぜClaude Codeが原則を破ってしまうのか - 根本原因

#### Claude Codeの典型的な失敗パターン
1. **利便性の誘惑**: `../user/hooks/useUser`の方が短く書けると判断してしまう
2. **既存パターンの模倣**: Web上の悪いコード例を参考にしてしまう  
3. **コンテキストの見落とし**: フィーチャー境界の意識が薄れてしまう
4. **「動けばいい」思考**: 境界ルールより動作を優先してしまう
5. **「依存を排除する」の誤解**: フィーチャー間の正当な依存まで悪と捉えてしまう
6. **dataAccess層への逃避**: 共通層なら中立的で問題ないと誤判断してしまう
7. **独立性を「孤立」と誤解**: 公開APIによる適切な依存を避けてしまう
8. **🔴 フックの公開を正しいと誤解**: Reactでよくあるパターンだと勘違いしてしまう
9. **🔴 「useで始まる」から公開すべきと誤判断**: フックは内部実装の詳細であることを忘れる

#### Claude Code: これらの誘惑に負けてはならない

### ⚠️ 最重要警告：フィーチャーベース開発の本質的な誤解

#### 🔴 致命的な誤解パターン
```typescript
// ❌❌❌ 最悪のアンチパターン: dataAccess層への責任逃避
// src/dataAccess/user.ts
export const getUserData = async (userId: string) => {
  // userフィーチャーの責任をdataAccess層に漏洩させている
  return await fetch(`/api/users/${userId}`)
}

// src/features/profile/hooks/useProfile.ts
import { getUserData } from '@/dataAccess/user'  // 責任境界の破壊！
```

#### ✅ 正しい理解と実装
```typescript
// ✅ 正しい: userフィーチャーが自身の責任を持つ
// src/features/user/api/userApi.ts
export const getUserData = async (userId: string): Promise<User> => {
  const response = await fetch(`/api/users/${userId}`)
  return response.json()
}

// src/features/user/hooks/useUser.ts（内部実装 - 公開しない）
import { getUserData } from '../api/userApi'

const useUser = (userId: string) => {  // exportしない！
  const [user, setUser] = useState<User | null>(null)
  
  useEffect(() => {
    getUserData(userId).then(setUser)
  }, [userId])
  
  return user
}

// src/features/user/index.ts（公開API）
export { getUserData } from './api/userApi'  // 関数を公開
export type { User } from './types'
// フックは公開しない！

// src/features/profile/hooks/useProfile.ts（正しい使用例）
import { getUserData, type User } from '@/features/user'

const useProfile = () => {
  const [user, setUser] = useState<User | null>(null)
  
  useEffect(() => {
    getUserData(profileId).then(setUser)  // API関数を直接使用
  }, [profileId])
  
  return { user }
}
```

#### 🎯 重要な理解ポイント
1. **「独立性」≠「孤立」**: フィーチャーは適切に協調すべき
2. **公開APIによる依存は「良い設計」**: 明示的な契約は推奨される
3. **dataAccess層は間違った逃げ道である**: 責任の所在を曖昧にする
4. **フィーチャーが責任を持つ**: データ取得もそのフィーチャーの責任
5. **依存の方向性を意識**: 依存は抽象（公開API）に対して行う
6. **🔴 フックは内部実装**: 他フィーチャーのフックに依存してはならない
7. **🔴 データ取得は関数で**: 純粋な関数として公開し、フックは各フィーチャー内で作成

### 🔥 Claude Codeがよく犯す違反と修正方法

#### ケース1: ユーザー情報を別フィーチャーで使用
```typescript
// ❌❌❌ 致命的違反: src/features/dashboard/components/Dashboard.tsx
import { useUser } from '../../user/hooks/useUser'  // 絶対禁止！
import { formatUserName } from '../../user/utils/format'  // 絶対禁止！
import { UserProfile } from '../../user/components/UserProfile'  // 絶対禁止！

// ❌❌❌ よくある間違い: 他フィーチャーのフックやUIを使用
import { useUser } from '@/features/user'  // フックの公開は禁止！
import { UserProfile } from '@/features/user'  // UIコンポーネントの公開も禁止！

// ✅ 正しい実装: API関数を使用して独自のUIとロジックを作成
import { getUserData, type User } from '@/features/user'

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null)
  
  useEffect(() => {
    getUserData(userId).then(setUser)
  }, [userId])
  
  // dashboardフィーチャー独自のユーザー表示コンポーネント
  return (
    <div className="dashboard-user-section">
      {user && (
        <div className="user-info">
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
      )}
    </div>
  )
}
```

#### ケース2: 共通ユーティリティの使用
```typescript
// ❌❌❌ 致命的違反: src/features/auth/utils/validators.ts
import { validateEmail } from '../../common/utils/email'  // 禁止！

// ✅ 正しい実装（優先順）

// オプション1（推奨）: 各フィーチャー内で独自に実装
// src/features/auth/utils/validators.ts
const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
// 重複を許容し、各フィーチャーが完全に独立

// オプション2: 真に共通のビジネスロジックのみフィーチャー化
// src/features/validation/index.ts
export { validateEmail, validatePhone } from './api/validators'
// ※単純なユーティリティはフィーチャー化しない
```

#### ケース3: フィーチャー間のデータ共有
```typescript
// ❌❌❌ 致命的違反: src/features/cart/hooks/useCart.ts
import { UserState } from '../../user/types/state'  // 内部型への直接アクセス禁止！
import { userStore } from '../../user/store'  // 内部ストアへの直接アクセス禁止！
import { useUser } from '@/features/user'  // フックの公開は禁止！

// ✅ 正しい実装: API関数を使用
import { getUserData, type User } from '@/features/user'

const useCart = () => {
  const [user, setUser] = useState<User | null>(null)
  
  useEffect(() => {
    // 必要に応じてユーザーデータを取得
    getUserData(userId).then(setUser)
  }, [userId])
  
  // カート機能の実装
  return { user, cart }
}
```

## 2. TypeScript厳格モード

### any型の完全排除
```typescript
// ❌ 絶対禁止
const data = response.data  // any型
const handler = (e) => {}   // パラメータがany

// ✅ 必須
const data: UserData = response.data as UserData
const handler = (e: React.MouseEvent<HTMLButtonElement>) => {}
```

## 3. UI実装の必須ルール

### フォント設定（全テキストに適用）
```tsx
className="font-rounded"  // 必ず含める
```

### レイアウト指示の実装確認
- 「縦に並べる」→ `flex flex-col` または `grid grid-cols-1`
- 「横に並べる」→ `flex flex-row` または `grid grid-flow-col`
- 実装後に必ず該当クラスの存在を確認

## 4. データ永続化の基本設定

### ローカルストレージの活用（推奨）
```typescript
// ✅ 推奨: src/features/[機能名]/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react'

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}
```

### 実装時の注意点
- SSR環境での`window`オブジェクト確認必須
- データ型の明示的な定義
- エラーハンドリングの実装
- 機密情報は保存しない

# 🟡 開発フロー

## 新機能実装の手順

### 1. 事前確認（必須）
```bash
# 既存構造の確認
ls -la src/features/

# 類似機能の参考
find src/features -name "*.tsx" | head -5

# 🚨 境界ルール確認（最重要）
# 依存する他フィーチャーの公開APIを確認
cat src/features/[依存フィーチャー名]/index.ts

# 既存の正しいimportパターンを確認
grep -h "from '@/features" src/features/**/*.tsx | sort -u
```

### 2. フィーチャー作成
```bash
# ディレクトリ作成
mkdir -p src/features/[機能名]/{components,hooks,types,api,utils}

# index.ts作成
touch src/features/[機能名]/index.ts
```

### 3. 実装後の検証（必須）
- [ ] フィーチャー構造が正しいか
- [ ] 型定義が明示的か（any型なし）
- [ ] font-roundedが適用されているか
- [ ] 指示通りのレイアウトか
- [ ] **🚨 境界違反検出コマンドを実行して違反がゼロか**
- [ ] **全import文が@/features/[機能名]形式か**

### 4. 報告ルール
```markdown
❌ 悪い例: "実装しました"
✅ 良い例: "src/features/auth/components/LoginForm.tsxを作成し、
           line 15にflex-colクラスを追加して縦配置にしました"
```

## 🛑 Claude Code専用：事前チェック機構（必ず最初に実行）

### Claude Codeが実装開始前に必ず自問自答すること
```typescript
// 🚨 Claude Code: 実装開始前にこれらの質問に答えてから実装を開始せよ
const CLAUDE_CODE_MUST_ANSWER = {
  1: "どのフィーチャーに実装するか明確か？",
  2: "他フィーチャーの何が必要か？",
  3: "それはindex.tsから公開されているか？",
  4: "公開されていない場合、自フィーチャーで実装すべきか？",
  5: "🔴 フックを公開しようとしていないか？（フックは内部実装！）",
  6: "🔴 データ取得は純粋な関数として公開しているか？（フックではなく！）",
  7: "🔴 UIコンポーネントを共有しようとしていないか？（各フィーチャーが独自UI！）",
  8: "🔴 他フィーチャーのUIをimportしようとしていないか？"
}

// Claude Code: 全ての質問に明確に答えられない場合、実装を開始してはならない
```

### Claude Code: 全ファイルの先頭に必ず記述するテンプレート
```typescript
/* ============================================
 * CLAUDE CODE IMPORT RULES - 絶対遵守
 * Claude Code: これらのルールを破ると実装は即座に失敗する
 * ✅ ALLOWED: import { X } from '@/features/other'
 * ❌ FORBIDDEN: import { X } from '../other/...'
 * ❌ FORBIDDEN: import { X } from '@/features/other/components/...'
 * ============================================ */

// Claude Code: 正しいimportのみをここに記述せよ
```

## 🤖 Claude Code専用：実装時の必須手順

### import文を書く前に必ず実行
```bash
# ステップ1: 依存フィーチャーの公開APIを確認
ls src/features/[依存フィーチャー名]/index.ts && cat src/features/[依存フィーチャー名]/index.ts

# ステップ2: 既存の正しいimportパターンを確認
grep "from '@/features/[依存フィーチャー名]'" src/features/**/*.tsx
```

### import文の記述ルール
```typescript
// 🚨 最初に書くimport（絶対にこの形式）
import { 公開されている要素のみ } from '@/features/[フィーチャー名]'

// ❌ 絶対に書いてはいけないimport
import { 何か } from '../other-feature/components/何か'  // 致命的
import { 何か } from '../../other-feature/hooks/何か'     // 致命的
```

### 実装完了後の必須確認
```bash
# 違反がないことを確認（0件であることを確認）
grep -c "from '\.\." [作成したファイルパス]
```

## 🔴 Claude Code: リアルタイム違反検出システム（import文記述後即座に実行）

### Claude Code: 新しいimport文を書いたら必ず即座に実行せよ
```bash
# 🚨 Claude Code: これを実行せずに次の行を書くことは禁止
echo "Claude Code検証中: $FILE_PATH"
grep -n "from '\.\.\/" $FILE_PATH && echo "❌ Claude Code違反: 相対パス検出！即座に修正せよ" || echo "✅ OK"
grep -n "from '@/features/[^']*/\(components\|hooks\|utils\|api\|types\)" $FILE_PATH && echo "❌ Claude Code違反: 内部参照検出！即座に修正せよ" || echo "✅ OK"
```

### 違反パターンの自動修正案
```typescript
// ❌ 違反検出時の自動修正案
// Before: import { useUser } from '../user/hooks/useUser'
// After:  import { useUser } from '@/features/user'

// ❌ 違反検出時の代替案
// 必要な機能がindex.tsから公開されていない場合：
// 1. 該当フィーチャーのindex.tsに追加を依頼
// 2. 自フィーチャー内に同等の機能を実装
```

## 📝 フィーチャー設計の明示化（各フィーチャーのREADME.md必須）

### フィーチャー作成時の必須ドキュメント
```markdown
# src/features/[機能名]/README.md

## このフィーチャーの責任
- [具体的な責任範囲を明記]

## 公開API（index.tsから公開）
- `getDataFunction()` - [データ取得関数] ✅ 推奨
- `updateDataFunction()` - [データ更新関数] ✅ 推奨
- `type DomainType` - [ドメイン型定義] ✅ 公開可
- `FEATURE_CONSTANTS` - [定数] ⚠️ 必要に応じて
- `ComponentName` - [UIコンポーネント] ❌ 原則非公開
- ❌ `useHookName()` - フックは絶対に公開しない！
- ❌ `helperFunction()` - 内部ユーティリティは公開しない！
- ❌ `type InternalState` - 内部状態型は公開しない！

## 依存フィーチャー
- `@/features/auth` - 認証状態の取得のみ
- `@/features/user` - ユーザー情報の参照のみ

## 内部実装（非公開・外部からアクセス禁止）
- `/components/internal/` - 内部コンポーネント
- `/utils/helpers.ts` - 内部ヘルパー関数
- `/types/state.ts` - 内部状態型

## 禁止事項
- 他フィーチャーの内部実装への依存
- このフィーチャーの内部実装の公開
- 循環参照の作成
```

# 🟢 プロジェクト初期設定

## セットアップ（新規プロジェクト時のみ）

```bash
# 自動セットアップ（推奨）
npm run setup:project

# 手動セットアップ
npm install
cp .env.example .env.local
npm run build
```

## 健全性チェック

```bash
# 開発中の定期チェック
npm run check

# デプロイ前の最終確認
npm run preflight
```

## 🔍 境界違反の自動検出（必ず実行）

### 実装後の必須検証コマンド
```bash
# 境界違反を検出（開発時は必ず実行）
# 他フィーチャーの内部実装への直接アクセスを検出
grep -r "from '\.\./\.\./[^/]*/\(components\|hooks\|utils\|api\|types\)" src/features/ || echo "✅ 境界違反なし"

# components/, hooks/, utils/への直接参照を検出
grep -r "from '@/features/[^']*\/\(components\|hooks\|utils\|api\|types\)" src/features/ || echo "✅ 直接参照なし"

# 相対パスでの他フィーチャー参照を検出
grep -r "from '\.\./[^/]*/\(components\|hooks\|utils\|api\|types\)" src/features/ || echo "✅ 相対パス違反なし"
```

### Claude Code専用検証（実装前に必ず実行）
```bash
# 他フィーチャーの公開APIを確認
find src/features -name "index.ts" -exec echo "=== {} ===" \; -exec head -20 {} \;

# 既存のimportパターンを確認（参考実装を探す）
grep -h "from '@/features" src/features/**/*.tsx 2>/dev/null | sort -u | head -10
```

### 違反検出時の対処法
1. **検出されたファイルを開く**
2. **import文を@/features/[機能名]形式に修正**
3. **必要な機能がindex.tsから公開されているか確認**
4. **公開されていない場合は、自フィーチャー内に実装**

# 🔵 Git/GitHub設定

## ブランチルール
```bash
# 必ず機能ブランチで作業
git checkout -b feature/[機能名]-[日付]

# mainへの直接コミット禁止
```

## GitHub Actions
- `@claude`メンションでClaude Code実行
- 自動コードレビュー機能あり
- CLAUDE_CODE_OAUTH_TOKEN設定必須

# ⚫ 制限事項

## GitHub Actions環境
- ❌ npm install, pnpm add禁止
- ❌ 対話的コマンド禁止（git rebase -i等）
- ✅ package.json定義済みパッケージのみ使用

## ファイル作成
- ❌ 不要なREADME.md作成禁止
- ❌ ドキュメント自動生成禁止
- ✅ 必要最小限のファイルのみ

# 🔥 Claude Code専用：クイックリファレンス（実装時に必ず参照）

## 🚨 グローバル状態管理についての厳格なルール

### Claude Code: グローバル状態は存在しない
```typescript
// ❌❌❌ 絶対禁止: グローバルストアへの依存
// src/store/globalStore.ts  // このようなファイルは作成しない！

// ❌❌❌ 絶対禁止: 複数フィーチャーで共有される状態
// src/features/shared/store.ts  // 共有ストアは作らない！

// ✅ 正しい: 各フィーチャーが自身の状態を管理
// src/features/user/store/userStore.ts（内部使用のみ）
// src/features/cart/store/cartStore.ts（内部使用のみ）

// フィーチャー間のデータ共有が必要な場合：
// 1. API関数経由でデータを取得
// 2. 各フィーチャーが独自にキャッシュ/状態管理
// 3. 必要に応じてlocalStorageを活用
```

### 状態管理の鉄則
1. **各フィーチャーが独自の状態を持つ**
2. **他フィーチャーの状態に直接アクセスしない**
3. **状態の同期はAPI関数経由で行う**
4. **グローバルストアは作成しない**

## 🚨 他フィーチャーのデータが必要な時の判断フロー

```mermaid
他フィーチャーのデータが必要
        ↓
index.tsを確認
        ↓
API関数が公開されている？
    ├─ Yes → その関数を使用
    └─ No → 以下から選択
            ├─ 自フィーチャーで独自実装
            └─ 該当フィーチャーにAPI関数の公開を依頼

❌ 絶対にやってはいけないこと：
- フックの公開を要求
- 内部実装への直接アクセス
- 相対パスでのimport
```

## 正しいindex.tsの書き方（テンプレート）

```typescript
// src/features/[feature-name]/index.ts

// ❌ UIコンポーネント（原則非公開）
// 各フィーチャーが独自のUIを実装する
// export { FeatureComponent } from './components/FeatureComponent'  // 非推奨

// ✅ データ取得・操作関数（公開推奨）
export { 
  getFeatureData,
  createFeatureItem,
  updateFeatureItem,
  deleteFeatureItem 
} from './api/featureApi'

// ✅ ドメイン型定義のみ（公開可）
export type { 
  FeatureItem,  // ドメインモデル
  FeatureConfig // 設定型
} from './types'

// ❌❌❌ フック（絶対に公開禁止）
// export { useFeature } from './hooks/useFeature'  // 致命的エラー！

// ❌ 内部実装（公開禁止）
// export { validateFeature } from './utils/validators'
// export { featureStore } from './store'
// export type { FeatureState } from './types'  // 内部状態型
```

## Claude Code: import文を書く前の3秒ルール

```typescript
// 3秒待って、以下を確認してからimport文を書け：

// 1秒目: これは他フィーチャーか？
// 2秒目: フックをimportしようとしていないか？
// 3秒目: @/features/[name]形式か？

// ✅ 正しい
import { getUserData, type User } from '@/features/user'

// ❌ 間違い（フック）
import { useUser } from '@/features/user'

// ❌ 間違い（内部参照）
import { SomeComponent } from '@/features/user/components/SomeComponent'

// ❌ 間違い（相対パス）
import { getUserData } from '../user/api/userApi'
```

# 📋 Claude Code用：実装チェックリスト

## 🚨 Claude Code: 境界チェック（これを無視したら実装失敗）
- [ ] **他フィーチャーへのimportは全て@/features/[機能名]形式か**
- [ ] **../や../../で他フィーチャーを参照していないか**
- [ ] **他フィーチャーの/components, /hooks, /utils等に直接アクセスしていないか**
- [ ] **importパスに他フィーチャーの内部ディレクトリが含まれていないか**
- [ ] **循環参照が発生していないか**

Claude Code実装前：
- [ ] このCLAUDE.mdを完全に理解した
- [ ] 事前チェックリストの4つの質問に全て答えた
- [ ] フィーチャーベースで実装することを確認した
- [ ] **他フィーチャーのindex.tsを実際に確認して公開APIを把握した**

Claude Code実装中：
- [ ] src/features/[機能名]/に作成している
- [ ] **全てのimport文が@/features/[名前]形式である**
- [ ] **必要な機能は自フィーチャー内に実装した**
- [ ] **🔴 フックをindex.tsから公開していない**
- [ ] **🔴 データ取得は純粋な関数として公開している**
- [ ] **🔴 UIコンポーネントを他フィーチャーから使用していない**
- [ ] **🔴 UIコンポーネントを公開していない（原則）**
- [ ] any型を一切使っていない
- [ ] font-roundedを全テキストに適用している

Claude Code実装後：
- [ ] **リアルタイム違反検出を実行した**
- [ ] **境界違反が0件であることを確認した**
- [ ] 実際のコードパスと行番号を確認した
- [ ] レイアウトが指示通りである
- [ ] 具体的な変更内容を行番号付きで報告できる