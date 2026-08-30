import { ErrorBoundary } from '@/components/ErrorBoundary'

/**
 * ページ本体（中間保護層）。
 * ErrorBoundary と実描画を分離することで、この配下で起きたエラーが
 * ページ全体・他フィーチャーへ伝播しないようにする。
 * 新しいページを作るときはこの構造（ErrorBoundary → PageContent）を踏襲すること。
 */
function PageContent() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 font-rounded">Next.js App Running</p>
    </main>
  )
}

export default function Home() {
  return (
    <ErrorBoundary featureName="home">
      <PageContent />
    </ErrorBoundary>
  )
}
