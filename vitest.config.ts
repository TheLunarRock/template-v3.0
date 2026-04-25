import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '*.config.*', '.next/', 'scripts/'],
      // テンプレート段階ではカバレッジ強制（thresholds）を設けない設計（v3.7.5〜）。
      // 個人開発前提（PR運用OFF）でレビュアー不在のため強制力が機能せず、
      // 旧 `global:` キー記法は vitest v3 系で実効していなかったことから削除。
      // クローン後にチーム開発・コンプライアンス要件等で品質ゲートが必要なプロジェクトは
      // 以下のように追加する（v3 系の正しい記法）:
      //   thresholds: {
      //     branches: 70, functions: 70, lines: 70, statements: 70,
      //     'src/features/**': { branches: 80, functions: 80, lines: 80, statements: 80 }
      //   }
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/features': path.resolve(__dirname, './src/features'),
    },
  },
})
