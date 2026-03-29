---
name: react-safety
description: React infinite loop prevention patterns and hook safety. Use when implementing React hooks, useEffect, or debugging re-render issues.
disable-model-invocation: true
---

# React Safety Patterns

## Infinite Loop Prevention

### Common Infinite Loop Patterns (MUST AVOID)

| Cause                        | Symptom                           | Fix                                 |
| ---------------------------- | --------------------------------- | ----------------------------------- |
| Unstable object reference    | API called hundreds/sec           | Stabilize with `useMemo`            |
| Property in dependency array | `[config.category]` miss          | Use whole object `[config]`         |
| Inappropriate useCallback    | Function recreated endlessly      | Remove useCallback, define directly |
| State update on error loop   | Empty array -> error -> re-render | Treat empty array as normal         |

### Forbidden Pattern (causes Mac overheating)

```typescript
// NEVER DO THIS
const Component = () => {
  const config = { limit: 10 } // New object every render
  useEffect(() => {
    fetch(config)
  }, [config]) // Infinite loop!
}
```

### Correct Pattern

```typescript
// ALWAYS DO THIS
const Component = () => {
  const config = useMemo(() => ({ limit: 10 }), []) // Stable reference
  useEffect(() => {
    fetch(config)
  }, [config]) // Safe
}
```

## Checklist for Hook Implementation

- [ ] All objects in dependency arrays stabilized with `useMemo`
- [ ] `useRef` used for previous value tracking where needed
- [ ] Cleanup function provided in `useEffect`
- [ ] No `setState` called directly inside `useEffect` without conditions
- [ ] Empty array results treated as normal (not error)
- [ ] `exhaustive-deps` ESLint rule satisfied
