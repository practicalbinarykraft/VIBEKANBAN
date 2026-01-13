# Testing Contracts

## Refresh Contract (useProjectTasks)

The `useProjectTasks` hook guarantees:

```typescript
{
  tasks: Task[];           // Current task list
  loading: boolean;        // True during initial fetch
  isRefreshing: boolean;   // True during refresh
  error: string | null;    // Error message if failed
  refreshTasks(): Promise<void>;  // Trigger manual refresh
}
```

### Deduplication guarantees

1. **AbortController**: Calling `refreshTasks()` aborts any in-flight request
2. **requestId**: Stale responses are ignored (only latest request updates state)
3. **isRefreshing**: Set to `true` immediately, `false` after completion/error

## UI Refresh Overlay

When `isRefreshing=true`, the Kanban board shows a loading overlay:

```html
<div data-testid="board-refreshing">Refreshing...</div>
```

Tests should wait for this overlay to disappear before asserting board state.

## E2E Testing Rules

### Use these helpers (from `e2e/helpers/board.ts`)

```typescript
// Wait for board to finish refreshing
await waitForBoardReady(page);

// Wait for task to appear in column
await waitForTaskInColumn(page, taskId, 'in_progress');
```

### DO NOT

- **Never use `page.reload()` as a "fix"** for UI not updating
- Never use `waitForTimeout()` with arbitrary delays
- Never assume UI updates instantly after API call

### DO

- Wait for API response: `await page.waitForResponse(...)`
- Trigger refresh if needed: `await page.evaluate(() => window.__VIBE__.refreshTasks())`
- Wait for board ready: `await waitForBoardReady(page)`

## When to call refreshTasks

| Action | Who triggers refresh |
|--------|---------------------|
| Run All / Pause / Resume | `useProjectExecution` via `onTasksChanged` |
| Create / Update / Delete task | `useProjectTasks` internally |
| External API call (test fixtures) | Test must call `window.__VIBE__.refreshTasks()` |

## CI Pipeline

1. **Unit tests** run first (`npm run test:unit`)
2. **E2E tests** run only if unit tests pass (`needs: unit`)

If unit tests fail, E2E tests are skipped to save CI time.
