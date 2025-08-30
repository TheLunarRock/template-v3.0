# プロジェクト固有設定

## 📁 現在のフィーチャー構造

```
src/features/
├── allowance/             # 支給項目管理
├── basic-info/            # 基本情報管理
├── basic-info-input/      # 基本情報入力
├── common/                # 共通コンポーネント
├── cost-item/             # 費用項目管理
├── daily-report-data/     # 日計データ管理
├── daily-report-input/    # 日計入力
├── expense/               # 経費管理
├── performance-data/      # 成績データ管理
├── performance-input/     # 成績入力
├── therapist/             # セラピスト管理
└── team/                  # チーム管理
```

## 🗄️ Supabaseテーブル構造

### 主要テーブル

| テーブル名 | 用途 | 主要カラム |
|-----------|------|----------|
| **performance_data** | 成績データ | id, therapist_id, date, revenue, created_at |
| **performance_allowances** | 成績関連支給項目 | id, performance_id, allowance_id, amount |
| **performance_expenses** | 成績関連費用 | id, performance_id, expense_id, amount |
| **daily_report_data** | 日計データ | id, date, total_revenue, total_expense |
| **daily_report_income_items** | 日計収益項目 | id, daily_report_id, item_name, amount |
| **daily_report_expense_items** | 日計費用項目 | id, daily_report_id, item_name, amount |
| **allowance_items** | 支給項目マスタ | id, name, is_active, display_order |
| **expense_items** | 費用項目マスタ | id, name, is_active, display_order |
| **therapists** | セラピスト管理 | id, name, team_id, is_active |
| **teams** | チーム管理 | id, name, is_active |

### データ特性

- **論理削除**: `is_active`フラグで管理
- **表示順序**: `display_order`カラムで制御
- **タイムスタンプ**: `created_at`, `updated_at`自動管理

## 🎨 UI/UX統一ルール

### デザインシステム

| 要素 | スタイル | 用途 |
|------|---------|------|
| **フォント** | `font-rounded` | 全テキスト要素に必須 |
| **基本コンテナ** | `bg-white rounded-lg shadow-lg p-6` | カード型UI |
| **ボタン（プライマリ）** | `bg-blue-500 hover:bg-blue-600 text-white` | 主要アクション |
| **ボタン（セカンダリ）** | `bg-gray-200 hover:bg-gray-300` | 副次アクション |
| **入力フィールド** | `border rounded-md px-3 py-2` | フォーム要素 |
| **エラー表示** | `text-red-500 text-sm mt-1` | バリデーションエラー |

### レイアウトパターン

- **縦配置**: `flex flex-col` または `grid grid-cols-1`
- **横配置**: `flex flex-row` または `grid grid-flow-col`
- **中央寄せ**: `flex items-center justify-center`
- **スペーシング**: `gap-4` (標準), `gap-2` (狭め), `gap-6` (広め)

## 🔧 実装パターン

### 数値入力フィールドのスクロール防止

```typescript
useEffect(() => {
  const input = inputRef.current
  if (!input) return
  
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }
  
  // passiveをfalseにして確実に動作させる
  input.addEventListener('wheel', handleWheel, { passive: false })
  
  return () => {
    input.removeEventListener('wheel', handleWheel)
  }
}, [])
```

### 論理削除（ソフトデリート）パターン

```typescript
// 削除処理
const handleDelete = async (id: string) => {
  const { error } = await supabase
    .from('table_name')
    .update({ is_active: false })
    .eq('id', id)
}

// 復活処理
const handleRestore = async (id: string) => {
  const { error } = await supabase
    .from('table_name')
    .update({ is_active: true })
    .eq('id', id)
}

// アクティブなデータのみ取得
const { data } = await supabase
  .from('table_name')
  .select('*')
  .eq('is_active', true)
  .order('display_order', { ascending: true })
```

### ローカルストレージ活用

```typescript
// カスタムフック（各フィーチャー内で実装）
const useLocalStorage = <T>(key: string, initialValue: T) => {
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

## 🔐 セキュリティ設定

| 項目 | 設定値 | 用途 |
|------|--------|------|
| **画面パスワード** | "0492" | 全画面共通の認証 |
| **セッション管理** | localStorage | 認証状態の保持 |
| **API認証** | Supabase Auth | バックエンド認証 |

## 🚀 開発環境

| 設定 | 値 | 備考 |
|------|-----|------|
| **開発サーバー** | ポート3000 | 使用中の場合3001 |
| **パッケージマネージャー** | pnpm | 高速・効率的 |
| **Node.jsバージョン** | >=18.0.0 | package.json定義 |
| **フレームワーク** | Next.js 14.2.31 | App Router使用 |
| **スタイリング** | Tailwind CSS | utility-first |
| **型チェック** | TypeScript 5 | 厳格モード |

## 📝 命名規則

| 種類 | 規則 | 例 |
|------|------|-----|
| **フィーチャー名** | kebab-case | `daily-report-input` |
| **コンポーネント** | PascalCase | `UserProfile.tsx` |
| **フック** | camelCase (use接頭辞) | `useLocalStorage.ts` |
| **API関数** | camelCase | `getUserData.ts` |
| **型定義** | PascalCase | `UserData` |
| **定数** | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |

## 🔄 定期的なメンテナンス

- **依存関係更新**: `pnpm update` (週次)
- **セキュリティチェック**: `pnpm audit` (日次)
- **型チェック**: `pnpm tsc --noEmit` (コミット前)
- **境界チェック**: `pnpm check:boundaries` (実装後)

---

**注意**: このファイルにはプロジェクト固有の設定のみを記載しています。
フィーチャーベース開発の原則やSuperClaude設定については `CLAUDE.md` を参照してください。