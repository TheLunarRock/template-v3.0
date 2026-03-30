---
name: security
description: Security audit and implementation for individual developers. Scans for vulnerabilities, proposes fixes, and implements them with user approval.
disable-model-invocation: true
---

ultrathink

# Security Audit & Implementation

Target area: $ARGUMENTS

If no arguments provided, run a full scan of all categories below.
If arguments provided (e.g., "auth", "db", "api", "env"), focus on that category only.

## Procedure (strict order)

### Step 1: Scan

Read and analyze the relevant files for the target category:

| Category     | Target files                                                                   |
| ------------ | ------------------------------------------------------------------------------ |
| **env**      | `.env*`, `.gitignore`, `next.config.*`, client-side code using `NEXT_PUBLIC_*` |
| **auth**     | API routes (`src/app/api/`), middleware, session/token handling                |
| **db**       | Supabase client config, RLS policies, direct SQL, data handling                |
| **api**      | API routes, CORS config, rate limiting, input validation                       |
| **deps**     | `package.json`, run `pnpm audit`                                               |
| **frontend** | Components using `dangerouslySetInnerHTML`, user input rendering               |

### Step 2: Diagnose

For each issue found, classify by severity and report:

```
[CRITICAL] file:line - Description
  Risk: What could happen if exploited
  Fix: Specific fix recommendation

[HIGH] file:line - Description
  Risk: ...
  Fix: ...

[MEDIUM] file:line - Description
  Risk: ...
  Fix: ...
```

If no issues found: "No security issues found in [category]."

### Step 3: Propose

Present a summary table of all findings:

```
| # | Severity | Issue | Fix | Implement? |
|---|----------|-------|-----|------------|
| 1 | CRITICAL | ...   | ... | Yes/No     |
| 2 | HIGH     | ...   | ... | Yes/No     |
```

Ask the user which items to implement.

### Step 4: Implement

For each approved item:

1. Implement the fix
2. Verify it does not break existing functionality
3. Report what was changed

### Step 5: Validate

```bash
pnpm check:boundaries
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Repeat until all pass with 0 errors.

### Step 6: Final Report

```
- Issues found: [count by severity]
- Issues fixed: [count]
- Changed files:
  - [file]: [what changed]
- Remaining recommendations: [items not implemented]
```

## Check Items by Category

### env - Environment Variables & Secrets

- `NEXT_PUBLIC_` variables contain no secret values (API keys, DB passwords)
- `.env.local` exists and is in `.gitignore`
- No hardcoded secrets in source code (API keys, tokens, passwords)
- `.env.example` has placeholder values only

### auth - Authentication & Authorization

- All API routes have authentication checks
- Session tokens use httpOnly cookies (not localStorage)
- Password handling uses proper hashing (bcrypt/argon2)
- CSRF protection is in place
- Token expiration is configured

### db - Database Security

- Supabase RLS policies exist on all tables
- No direct SQL string concatenation (use parameterized queries)
- Sensitive data fields are identified (encryption candidates)
- Service role key is never exposed to client
- Row-level access control matches business requirements

### api - API Security

- Rate limiting is configured
- CORS allows only necessary origins
- All user input is validated (Zod or similar)
- Error responses do not leak internal details
- File upload has size and type restrictions

### deps - Dependencies

- `pnpm audit` shows no critical/high vulnerabilities
- No unnecessary dependencies that increase attack surface
- Lock file (`pnpm-lock.yaml`) is committed

### frontend - Frontend Security

- No `dangerouslySetInnerHTML` with user-provided content
- User input is sanitized before display
- Sensitive data is not stored in localStorage/sessionStorage
- No sensitive data in URL parameters
- CSP headers are configured

## Rules

- Do NOT modify config files (tsconfig.json, eslintrc, etc.)
- Stay within feature boundaries
- Ask before implementing - never auto-fix without user approval
- Prioritize CRITICAL and HIGH issues first
