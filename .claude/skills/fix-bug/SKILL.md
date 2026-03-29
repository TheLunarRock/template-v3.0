---
name: fix-bug
description: Bug fix protocol with regression test first. Use when fixing bugs, errors, or unexpected behavior.
disable-model-invocation: true
---

# Bug Fix Protocol (Regression Test First)

Fix the bug described in: $ARGUMENTS

## Procedure (strict order)

1. **Create regression test first**
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

2. **Confirm test fails**: `pnpm test:regression`

3. **Fix root cause** (not symptoms)
   - Investigate with Sequential-thinking if complex
   - Use Serena for symbol/dependency analysis
   - Stay within feature boundaries

4. **Confirm test passes**: `pnpm test:regression`

5. **Validate**:

   ```bash
   pnpm check:boundaries
   pnpm typecheck
   pnpm test
   ```

6. **Commit** with descriptive message referencing the bug

## Rules

- This test is PERMANENT - never delete regression tests
- Fix the root cause, not the symptom
- Do not modify config files (tsconfig.json, eslintrc, etc.)
- Do not skip or disable any existing tests
