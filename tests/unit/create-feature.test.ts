/**
 * scripts/create-feature.js が生成するファイル名の命名検証。
 *
 * ケバブケースのフィーチャー名を渡したとき、生成物のファイル名が
 * リポジトリの慣習どおりになることを保証する。以前は API ファイルだけが
 * `user-profileApi.ts` のようにケバブとキャメルの混在になっていた。
 *
 * このリポジトリの慣習は「すべてケバブ」ではなく、種類ごとに異なる。
 *   - React コンポーネント … PascalCase（src/components/ErrorBoundary.tsx）
 *   - フック             … camelCase（src/hooks/useI18n.ts）
 *   - それ以外のモジュール … kebab-case（src/utils/cache/memory-cache.ts）
 * そのため components / hooks の記法もあわせて固定し、将来まとめて
 * ケバブ化されないようにしている。
 *
 * スクリプトは cwd 基準の相対パス（src/features/... など）へ書き出すため、
 * 一時ディレクトリを cwd にして実行する。リポジトリ内の src/features/ を
 * 汚さないための措置であり、実行後は一時ディレクトリごと削除する。
 *
 * @category ユニット
 * @priority 🟢 recommended
 */

import { describe, it, expect, afterEach } from 'vitest'
import { spawnSync } from 'child_process'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const SCRIPT = path.join(ROOT, 'scripts/create-feature.js')

// PATH 依存のコマンド解決を避けるため絶対パスで起動する。
// node は vitest を動かしている実行ファイルをそのまま使う。
const BASH_BIN = '/bin/bash'
const NODE_BIN = process.execPath

/** 後始末する一時ディレクトリ */
const tmpDirs: string[] = []

function sh(script: string, args: string[] = [], cwd?: string): string {
  return spawnSync(BASH_BIN, ['-c', script, 'sh', ...args], {
    encoding: 'utf8',
    timeout: 60_000,
    cwd,
  }).stdout
}

afterEach(() => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop()
    if (dir !== undefined) {
      sh('rm -rf "$1"', [dir])
    }
  }
})

/**
 * 一時ディレクトリで create-feature.js を実行し、
 * 生成されたファイルの相対パス一覧を返す。
 */
function generate(featureName: string): { files: string[]; dir: string } {
  const dir = sh('mktemp -d').trim()
  tmpDirs.push(dir)

  spawnSync(NODE_BIN, [SCRIPT, featureName], {
    encoding: 'utf8',
    timeout: 60_000,
    cwd: dir,
  })

  const files = sh('find . -type f | sed "s|^\\./||" | sort', [], dir)
    .split('\n')
    .filter((line) => line.length > 0)

  return { files, dir }
}

/** ファイルの中身をシェル経由で読む（fs の動的パス参照を避けるため） */
function read(dir: string, relativePath: string): string {
  return sh('cat "$1" 2>/dev/null || true', [path.join(dir, relativePath)])
}

describe('create-feature.js: 生成されるファイル名', () => {
  it('ケバブケースのフィーチャー名で、想定どおりの一式を生成する', () => {
    const { files } = generate('user-profile')

    expect(files).toEqual([
      'src/app/user-profile/page.tsx',
      'src/features/user-profile/README.md',
      'src/features/user-profile/api/user-profile-actions.ts',
      'src/features/user-profile/api/user-profile-api.ts',
      'src/features/user-profile/index.ts',
      'src/features/user-profile/types/index.ts',
      'tests/unit/features/user-profile.test.ts',
    ])
  })

  it('API ファイルはケバブケースで、キャメルケースと混在しない', () => {
    const { files } = generate('user-profile')
    const apiFiles = files.filter((file) => file.includes('/api/'))

    expect(apiFiles).toEqual([
      'src/features/user-profile/api/user-profile-actions.ts',
      'src/features/user-profile/api/user-profile-api.ts',
    ])
    // 以前の user-profileApi.ts のような混在が復活していないこと
    apiFiles.forEach((file) => expect(file).not.toMatch(/[a-z]-[a-z]+[A-Z]/))
  })

  it('フックとコンポーネントの雛形を生成しない（画面の部品は app 側に置く）', () => {
    const { files } = generate('user-profile')

    expect(files.filter((file) => /\/(hooks|components)\//.test(file))).toEqual([])
  })

  it('単語が 3 つ以上でも各ファイル名が崩れない', () => {
    const { files } = generate('order-history-list')

    expect(files).toContain('src/features/order-history-list/api/order-history-list-api.ts')
    expect(files).toContain('src/features/order-history-list/api/order-history-list-actions.ts')
    expect(files).toContain('src/app/order-history-list/page.tsx')
    expect(files).toContain('tests/unit/features/order-history-list.test.ts')
  })

  it('単語が 1 つでも生成できる', () => {
    const { files } = generate('auth')

    expect(files).toContain('src/features/auth/api/auth-api.ts')
    expect(files).toContain('src/features/auth/api/auth-actions.ts')
  })
})

describe('create-feature.js: 生成されたコードの参照先が実在する', () => {
  it('index.ts の import 先が生成された取得・更新のファイルと一致する', () => {
    const { files, dir } = generate('user-profile')
    const indexContent = read(dir, 'src/features/user-profile/index.ts')

    expect(indexContent).toContain("from './api/user-profile-api'")
    expect(indexContent).toContain("from './api/user-profile-actions'")
    expect(files).toContain('src/features/user-profile/api/user-profile-api.ts')
    expect(files).toContain('src/features/user-profile/api/user-profile-actions.ts')
  })

  it('生成コード内の識別子はキャメル / パスカルのまま（ファイル名だけを揃えている）', () => {
    const { dir } = generate('user-profile')
    const apiContent = read(dir, 'src/features/user-profile/api/user-profile-api.ts')
    const actionsContent = read(dir, 'src/features/user-profile/api/user-profile-actions.ts')

    expect(apiContent).toContain('getUserProfileData')
    expect(actionsContent).toContain('createUserProfile')
  })
})

describe('create-feature.js: 取得はサーバー側の関数、更新は Server Actions', () => {
  /**
   * 以前の雛形は、取得の関数が自分のアプリの /api/<name> を fetch していた。
   * page.tsx（サーバーコンポーネント）から呼ぶとサーバー側の fetch は相対 URL を
   * 受け付けないため、生成直後のページは必ずエラー表示になっていた。
   * 実際のアプリの形（取得はサーバー側の関数を直接 await、更新は 'use server'）に合わせる。
   */
  it('取得の関数は fetch を含まない（自分のアプリの API を呼ばない）', () => {
    const { dir } = generate('user-profile')
    const apiContent = read(dir, 'src/features/user-profile/api/user-profile-api.ts')

    expect(apiContent).toContain('export const getUserProfileData')
    expect(apiContent).not.toMatch(/\bfetch\(/)
    expect(apiContent).not.toContain('/api/')
  })

  it('取得の関数の冒頭に差し替え方と use cache の扱いが書かれている', () => {
    const { dir } = generate('user-profile')
    const apiContent = read(dir, 'src/features/user-profile/api/user-profile-api.ts')

    expect(apiContent).toContain('実際の保存先')
    expect(apiContent).toContain('Suspense')
    expect(apiContent).toContain("'use cache'")
    expect(apiContent).toContain('持ち主の承認')
  })

  it("更新の関数のファイルは先頭が 'use server' で、作成・更新・削除を持つ", () => {
    const { dir } = generate('user-profile')
    const actionsContent = read(dir, 'src/features/user-profile/api/user-profile-actions.ts')

    expect(actionsContent.split('\n')[0]).toBe("'use server'")
    expect(actionsContent).toMatch(/export async function createUserProfile\(/)
    expect(actionsContent).toMatch(/export async function updateUserProfile\(/)
    expect(actionsContent).toMatch(/export async function deleteUserProfile\(/)
    expect(actionsContent).not.toMatch(/\bfetch\(/)
  })

  it('更新の関数の冒頭に権限の確認と入力の検証が書かれている', () => {
    const { dir } = generate('user-profile')
    const actionsContent = read(dir, 'src/features/user-profile/api/user-profile-actions.ts')

    expect(actionsContent).toContain('権限')
    expect(actionsContent).toContain('入力は必ず検証する')
  })

  it('生成されるテストは fetch をモックせず、関数を直接呼ぶ', () => {
    const { dir } = generate('user-profile')
    const testContent = read(dir, 'tests/unit/features/user-profile.test.ts')

    expect(testContent).not.toContain('fetch')
    expect(testContent).not.toContain('vi.fn')
    expect(testContent).toContain('await getUserProfileData(')
    expect(testContent).toContain('await createUserProfile(')
  })
})

describe('create-feature.js: 生成コードの健全性', () => {
  /**
   * 生成コードに抑制コメントを埋めて typecheck / lint を黙らせるのは禁止。
   * スカフォールドは「最小限だが成立している例」であるべきで、宣言だけして
   * 使っていない引数や型を抑制コメントで隠すと、雛形として意味が薄くなる。
   * 将来また黙らせる形で直されないための歯止めとして固定する。
   */
  const SUPPRESSIONS = ['eslint-disable', '@ts-ignore', '@ts-expect-error']

  it('生成されたどのファイルにも抑制コメントが含まれない', () => {
    const { files, dir } = generate('user-profile')
    const sources = files.filter((file) => /\.tsx?$/.test(file))

    expect(sources.length).toBeGreaterThan(0)

    const offenders = sources.filter((file) => {
      const content = read(dir, file)
      return SUPPRESSIONS.some((token) => content.includes(token))
    })

    expect(offenders).toEqual([])
  })
})

describe('create-feature.js: page.tsx のデータ取得は <Suspense> の内側', () => {
  /**
   * next.config.mjs で cacheComponents を有効にしているため、<Suspense> の外で
   * キャッシュしないデータ取得を行うページはビルドが失敗する（2026-11-22 実測）。
   * FeatureErrorBoundary は Suspense の代わりにならない。
   * 設定を入れる前は同じページが静的（○）として出力され、ビルド時に 1 回だけ
   * 取得した結果が固定されていた。雛形からその形を取り除いたことを固定する。
   */
  const PAGE = 'src/app/user-profile/page.tsx'

  it('react から Suspense を import している', () => {
    const { dir } = generate('user-profile')
    const page = read(dir, PAGE)

    expect(page).toMatch(/import\s*\{[^}]*\bSuspense\b[^}]*\}\s*from\s*'react'/)
  })

  it('async の PageContent が <Suspense> の内側でだけ描画される', () => {
    const { dir } = generate('user-profile')
    const page = read(dir, PAGE)

    expect(page).toMatch(/async function UserProfilePageContent\(/)
    // fallback に JSX（> を含む）が入るため、<Suspense から </Suspense> までを切り出して調べる
    const suspenseBlock = /<Suspense\b[\s\S]*?<\/Suspense>/.exec(page)?.[0] ?? ''
    expect(suspenseBlock).toMatch(/<UserProfilePageContent\s*\/>\s*<\/Suspense>$/)
    expect(page.match(/<UserProfilePageContent\b/g)).toHaveLength(1)
  })

  it('<Suspense> に fallback が指定されている', () => {
    const { dir } = generate('user-profile')
    const page = read(dir, PAGE)

    expect(page).toMatch(/<Suspense\s+fallback=\{/)
  })
})

describe('create-feature.js: 入力の検証', () => {
  it.each(['UserProfile', 'user_profile', 'userProfile'])(
    'ケバブケース以外は拒否する: %s',
    (invalidName) => {
      const dir = sh('mktemp -d').trim()
      tmpDirs.push(dir)

      const result = spawnSync(NODE_BIN, [SCRIPT, invalidName], {
        encoding: 'utf8',
        timeout: 60_000,
        cwd: dir,
      })

      expect(result.status).not.toBe(0)
      const generated = sh('find . -type f | wc -l', [], dir).trim()
      expect(generated).toBe('0')
    }
  )
})
