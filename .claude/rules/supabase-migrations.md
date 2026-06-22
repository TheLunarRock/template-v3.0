---
paths:
  - 'supabase/migrations/**'
  - '**/migrations/**/*.sql'
  - '**/*.sql'
---

# Supabase マイグレーション時の必須ルール

> このルールは CLAUDE.md「セキュリティに関するClaude Code絶対ルール #12」の
> 内容を、マイグレーション／SQL ファイルを触る瞬間に確実に提示するための
> パススコープ版です（ルール内容は CLAUDE.md と同一・変更なし）。

**`public` スキーマに新規テーブルを作成したら明示的に GRANT を付与する** — 2026-05-30 以降に作成された Supabase プロジェクトでは、`public` スキーマのテーブルがデフォルトで Data API（PostgREST / GraphQL / supabase-js）に公開されない。テーブル作成マイグレーションには `grant select, insert, update, delete on table public.<table> to authenticated, service_role;`（連番列・シーケンスを使う場合は `grant usage, select on all sequences in schema public to authenticated, service_role;`）を必ず含める。未認証公開が必要なテーブルのみ `anon` を明示追加し、必ず RLS（`enable row level security`）を併用する。既存テーブルは公開状態が維持されるため遡及対応は不要。**このルールは Supabase 固有。Neon など自動 REST API を持たない素の PostgreSQL ではアクセスモデルが異なり該当しない**（認可はアプリ層で実装。`anon`/`authenticated` GRANT を機械的に流用しないこと）。詳細は [SPECIFICATION.md セクション12.15.9](../../SPECIFICATION.md) を参照。

**Neon 利用時は学習データに頼らず現行仕様を都度確認する** — Neon は破壊的変更・デフォルト変更が頻繁。Auth SDK / Management API / 利用可能な拡張は実装前に必ず Context7 か公式 changelog で現行仕様を確認してから書く。コスト系（Snapshot 課金等）は使用前に料金影響を確認する。詳細は [SPECIFICATION.md セクション12.15.9.11](../../SPECIFICATION.md) を参照。
