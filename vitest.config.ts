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
      // 🔴 95%品質: テストカバレッジ強制（品質向上+4%）
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        // フィーチャー単位でも強制
        'src/features/**/': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/features': path.resolve(__dirname, './src/features'),
    },
  },
})
