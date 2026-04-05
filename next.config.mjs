import bundleAnalyzer from '@next/bundle-analyzer'

/**
 * セキュリティヘッダー定義
 * クローン先プロジェクトで必要に応じてカスタマイズ可能
 * CSPはプロジェクト固有のため含めていない（外部リソース追加時に個別設定）
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

// Bundle Analyzer設定
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
})

export default process.env.ANALYZE === 'true' ? withBundleAnalyzer(nextConfig) : nextConfig