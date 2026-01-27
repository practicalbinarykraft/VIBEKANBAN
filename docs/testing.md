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

## Local E2E & Exit 137

Exit code 137 indicates the process was killed due to OOM (Out of Memory). This commonly happens during local E2E runs because Playwright's trace and video recording consume significant memory.

### Symptoms

- Tests pass in CI but fail locally with exit 137
- System becomes sluggish during test runs
- Playwright processes killed unexpectedly

### Solutions

1. **Use the local profile (recommended)**
   ```bash
   npm run test:e2e:local
   ```
   This disables trace and video recording, significantly reducing memory usage.

2. **Run fewer tests at once**
   ```bash
   npm run test:e2e:local -- e2e/specs/specific-test.spec.ts
   ```

3. **Close memory-heavy applications** during test runs (browsers, IDEs, Docker containers)

4. **Increase system swap** if available

### Profile Comparison

| Setting   | Local (default) | CI               |
|-----------|-----------------|------------------|
| trace     | off             | on-first-retry   |
| video     | off             | on-first-retry   |
| reporter  | list            | html             |
| retries   | 0               | 2                |

### Environment Variable

The profile is controlled by `E2E_PROFILE`:

```bash
E2E_PROFILE=local playwright test  # Lightweight
E2E_PROFILE=ci playwright test     # Full CI config
```

Without `E2E_PROFILE`, defaults to `local` for memory-safe local development.
