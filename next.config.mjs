import bundleAnalyzer from '@next/bundle-analyzer'

/**
 * Content-Security-Policy定義
 *
 * Next.js App Routerはインラインスクリプトを使用するため 'unsafe-inline' が必要。
 * それでもCSPは以下を防御する:
 * - 外部スクリプト注入（script-src 'self' で外部ドメインをブロック）
 * - iframing攻撃（frame-ancestors 'none'）
 * - フォームハイジャック（form-action 'self'）
 * - base URIハイジャック（base-uri 'self'）
 *
 * クローン先でSupabase等の外部サービスを追加する場合:
 *   connect-src に 'https://*.supabase.co' を追加
 *   img-src に 'https://*.supabase.co' を追加
 */
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]

/**
 * セキュリティヘッダー定義（7種）
 * CSP + 従来の6種ヘッダーで多層防御を実現
 */
const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspDirectives.join('; ') },
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