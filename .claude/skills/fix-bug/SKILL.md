---
name: fix-bug
description: Bug fix protocol with deep analysis, impact assessment, regression test, and iterative validation. Use when fixing bugs, errors, or unexpected behavior.
disable-model-invocation: true
---

ultrathink

# Bug Fix Protocol (Analysis + Regression Test)

Fix the bug described in: $ARGUMENTS

## Procedure (strict order)

### Step 1: Root Cause Analysis

1. Read all files and dependencies related to the error
2. Identify the root cause and report it
3. Clearly distinguish the root cause from surface-level symptoms

### Step 2: Impact Assessment

List all files that need modification. For each file, specify:

- **Where**: Line number or function name to change
- **What**: What changes from what to what
- **Why safe**: Why this change does not affect other features

### Step 3: Create Regression Test

- File: `tests/regression/YYYY-MM-DD-NNN-description.test.ts`
- Template:
  ```typescript
  /**
   * Bug ID: YYYY-MM-DD-NNN
   * Date: YYYY-MM-DD
   * Issue: [specific problem description]
   * Feature: [related feature]
   */
  describe('Regression: [ID] - [description]', () => {
    it('should [expected behavior]', () => {
      // Bug reproduction test
    })
  })
  ```

### Step 4: Confirm Test Fails

Run `pnpm test:regression` and verify the new test fails (proving the bug exists).

### Step 5: Fix Root Cause

- Fix only the root cause, not symptoms
- Investigate with Sequential-thinking if complex
- Use Serena for symbol/dependency analysis
- Stay within feature boundaries

### Step 6: Confirm Test Passes

Run `pnpm test:regression` and verify the new test passes.

### Step 7: Validate (iterate until all pass)

Run all checks below. If any errors or warnings remain, fix them and re-run. Do NOT stop until all counts are 0.

1. Linter: `pnpm lint` → fix all errors and warnings
2. TypeCheck: `pnpm typecheck` → fix all type errors
3. Tests: `pnpm test` → fix all failing tests
4. Boundaries: `pnpm check:boundaries` → fix all violations
5. Build: `pnpm build` → fix all build errors

Repeat until all 5 pass with 0 errors. Do not proceed until clean.

### Step 8: Final Report

Output the following summary:

```
- Root cause: [1 line]
- Changed files:
  - [file]: [what changed]
- Lint errors: 0
- Type errors: 0
- Build errors: 0
- Impact on existing features: none / [details]
```

### Step 9: Commit

Commit with a descriptive message referencing the bug.

## Rules

- This test is PERMANENT - never delete regression tests
- Fix the root cause, not the symptom
- Change ONLY what is directly related to the error - no refactoring or improvements
- Do NOT change existing UI, UX, routing, or component structure
- Do NOT edit files unrelated to the fix
- Do not modify config files (tsconfig.json, eslintrc, etc.)
- Do not skip or disable any existing tests
