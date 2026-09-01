/**
 * Bug ID: 2026-09-01-009
 * Date: 2026-09-01
 * Issue: preflight のフック公開チェックがコメントアウトされた行を誤検出していた。
 *
 *          pnpm create:feature sample-item
 *          pnpm preflight
 *          → ✗ 🔴 sample-item: フックが公開されています（本番環境では致命的）
 *
 *        生成された index.ts はフックを公開しておらず、「❌❌❌ フック（絶対に
 *        公開禁止）」の見出しの下に悪い例としてコメント行があるだけだった。
 *
 *          // export { useSampleItem } from './hooks/useSampleItem'  // 致命的エラー！
 *
 *        scripts/preflight.js がコメントを剥がさずに正規表現を当てていたため、
 *        この行の "export { useS" にマッチしていた。
 *
 *        src/features/_template/ は `_` 始まりで検証対象外のため、フィーチャーを
 *        1 つ作るまで表面化しない。つまり全クローンが最初のフィーチャーで踏む。
 * Feature: scripts/preflight.js（pnpm preflight のフィーチャー別検証）
 * Fixed by: 判定を publishesHook() に切り出し、check-boundaries.js が既に
 *           export している stripComments でコメントを除去してから走査する。
 *           同等の関数を preflight 側に新設していない（挙動がずれると
 *           また同じ種類の乖離が生まれるため）。
 *
 * @category 回帰
 * @priority 🔴 critical
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const preflight = require('../../scripts/preflight.js') as {
  publishesHook: (indexContent: string) => boolean
}

/** create-feature.js が生成する index.ts の、フック部分の実物 */
const GENERATED_INDEX = [
  '// ✅ API関数（公開推奨）',
  'export {',
  '  getSampleItemData,',
  '  createSampleItem,',
  "} from './api/sample-item-api'",
  '',
  '// ✅ ドメイン型のみ（公開可）',
  'export type {',
  '  SampleItem,',
  "} from './types'",
  '',
  '// ❌❌❌ フック（絶対に公開禁止）',
  "// export { useSampleItem } from './hooks/useSampleItem'  // 致命的エラー！",
  '',
  '// ❌ UIコンポーネント（原則非公開）',
  "// export { SampleItemComponent } from './components/SampleItemComponent'",
].join('\n')

describe('Regression: 2026-09-01-009 - コメント行をフック公開と誤検出する', () => {
  it('生成直後の index.ts（コメントアウトされた例のみ）はエラーにならない', () => {
    expect(preflight.publishesHook(GENERATED_INDEX)).toBe(false)
  })

  it.each([
    ['行コメント', "// export { useSampleItem } from './hooks/useSampleItem'"],
    ['行末に注記付きの行コメント', "// export { useThing } from './hooks/useThing'  // 禁止"],
    ['ブロックコメント', "/* export { useThing } from './hooks/useThing' */"],
    [
      '複数行のブロックコメント',
      ['/*', " export { useThing } from './hooks/useThing'", '*/'].join('\n'),
    ],
    [
      'JSDoc ブロック',
      ['/**', ' * 悪い例:', " *   export { useThing } from './hooks/useThing'", ' */'].join('\n'),
    ],
  ])('コメント内のフック export は検出しない: %s', (_label, content) => {
    expect(preflight.publishesHook(content)).toBe(false)
  })

  // 退行確認: 本物の公開は今までどおり検出できること
  it.each([
    ['単一行の公開', "export { useThing } from './hooks/useThing'"],
    ['スペース無しの公開', "export {useThing} from './hooks/useThing'"],
    [
      '複数行の公開',
      ['export {', '  getThingData,', '  useThing,', "} from './api/thing-api'"].join('\n'),
    ],
    [
      'API 関数に混ざった公開',
      ['export { getThingData, useThing } from ' + "'./api/thing-api'"].join('\n'),
    ],
  ])('本物のフック公開は検出する: %s', (_label, content) => {
    expect(preflight.publishesHook(content)).toBe(true)
  })

  it('コメントと本物が同居していたら検出する', () => {
    const content = [
      "// export { useCommented } from './hooks/useCommented'",
      "export { useReal } from './hooks/useReal'",
    ].join('\n')

    expect(preflight.publishesHook(content)).toBe(true)
  })

  it('use で始まらない export は検出しない（誤検出を広げていないこと）', () => {
    const content = ["export { getUserData, userStore } from './api/user-api'"].join('\n')

    expect(preflight.publishesHook(content)).toBe(false)
  })
})
