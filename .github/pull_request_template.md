## Summary

<!-- Brief description of changes -->

## Definition of Done Checklist

Before merging, ensure all items are checked:

### Code Quality
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] ESLint passes (`npm run lint`)
- [ ] No new warnings introduced

### Testing
- [ ] Unit tests pass (`npm run test:unit`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] New functionality has tests

### Build & Limits
- [ ] Build succeeds (`npm run build`)
- [ ] LOC limits respected (`npm run check:loc`)

### Documentation
- [ ] Code is self-documenting or has comments where needed
- [ ] API changes documented (if applicable)

### Review
- [ ] Self-reviewed the diff
- [ ] No secrets or credentials in code

---

**Full gate check:** `npm run gate`

## Test Plan

<!-- How to test these changes -->

## Related Issues

<!-- Link to issues: Fixes #123 -->
