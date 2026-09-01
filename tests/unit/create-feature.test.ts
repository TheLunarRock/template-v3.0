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
      'src/features/user-profile/api/user-profile-api.ts',
      'src/features/user-profile/components/UserProfileComponent.tsx',
      'src/features/user-profile/hooks/useUserProfile.ts',
      'src/features/user-profile/index.ts',
      'src/features/user-profile/types/index.ts',
      'tests/unit/features/user-profile.test.ts',
    ])
  })

  it('API ファイルはケバブケースで、キャメルケースと混在しない', () => {
    const { files } = generate('user-profile')
    const apiFile = files.find((file) => file.includes('/api/'))

    expect(apiFile).toBe('src/features/user-profile/api/user-profile-api.ts')
    // 以前の user-profileApi.ts のような混在が復活していないこと
    expect(apiFile).not.toMatch(/[a-z]-[a-z]+[A-Z]/)
  })

  it('コンポーネントは PascalCase、フックは camelCase を保つ', () => {
    const { files } = generate('user-profile')

    expect(files).toContain('src/features/user-profile/components/UserProfileComponent.tsx')
    expect(files).toContain('src/features/user-profile/hooks/useUserProfile.ts')
  })

  it('単語が 3 つ以上でも各ファイル名が崩れない', () => {
    const { files } = generate('order-history-list')

    expect(files).toContain('src/features/order-history-list/api/order-history-list-api.ts')
    expect(files).toContain(
      'src/features/order-history-list/components/OrderHistoryListComponent.tsx'
    )
    expect(files).toContain('src/features/order-history-list/hooks/useOrderHistoryList.ts')
    expect(files).toContain('src/app/order-history-list/page.tsx')
    expect(files).toContain('tests/unit/features/order-history-list.test.ts')
  })

  it('単語が 1 つでも生成できる', () => {
    const { files } = generate('auth')

    expect(files).toContain('src/features/auth/api/auth-api.ts')
    expect(files).toContain('src/features/auth/components/AuthComponent.tsx')
    expect(files).toContain('src/features/auth/hooks/useAuth.ts')
  })
})

describe('create-feature.js: 生成されたコードの参照先が実在する', () => {
  it('index.ts の import 先が生成された API ファイルと一致する', () => {
    const { files, dir } = generate('user-profile')
    const indexContent = read(dir, 'src/features/user-profile/index.ts')

    expect(indexContent).toContain("from './api/user-profile-api'")
    expect(files).toContain('src/features/user-profile/api/user-profile-api.ts')
  })

  it('フックの import 先が生成された API ファイルと一致する', () => {
    const { dir } = generate('user-profile')
    const hookContent = read(dir, 'src/features/user-profile/hooks/useUserProfile.ts')

    expect(hookContent).toContain("from '../api/user-profile-api'")
  })

  it('生成コード内の識別子はキャメル / パスカルのまま（ファイル名だけを揃えている）', () => {
    const { dir } = generate('user-profile')
    const apiContent = read(dir, 'src/features/user-profile/api/user-profile-api.ts')

    expect(apiContent).toContain('getUserProfileData')
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
