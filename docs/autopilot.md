# Multi-PR Autopilot

Autopilot executes large backlogs (30-200 tasks) in manageable PR-sized batches (8-12 tasks each), requiring user approval between batches.

## State Machine

```
IDLE → RUNNING → WAITING_APPROVAL → RUNNING → ... → DONE
                       ↓
                     IDLE (cancel)
```

| State | Description |
|-------|-------------|
| `IDLE` | Ready to start, no batch in progress |
| `RUNNING` | Currently processing a batch |
| `WAITING_APPROVAL` | Batch complete, awaiting user approval to continue |
| `DONE` | All batches completed successfully |
| `FAILED` | Error occurred during execution |

## UI Usage

1. **Create a plan** - Enter idea in Planning tab, run council, finish discussion
2. **View autopilot panel** - Appears below the plan when steps exist
3. **Start autopilot** - Click "Start Autopilot" button
4. **Monitor progress** - Progress bar shows `current/total` batches
5. **Approve batches** - When `WAITING_APPROVAL`, click "Approve & Continue"
6. **Cancel anytime** - Click "Cancel" to return to IDLE state

## API Endpoints

All endpoints: `POST /api/projects/[id]/planning/autopilot/*`

| Endpoint | Body | Description |
|----------|------|-------------|
| `/start` | `{ sessionId }` | Initialize batches and start execution |
| `/status` | `?sessionId=` (GET) | Get current status (read-only) |
| `/approve` | `{ sessionId }` | Approve current batch, move to next |
| `/cancel` | `{ sessionId }` | Cancel execution, return to IDLE |
| `/complete-batch` | `{ sessionId }` | Mark batch complete (test-only) |

### Response Format

```json
{
  "success": true,
  "sessionId": "uuid",
  "status": "RUNNING",
  "currentBatch": { "batchId": "...", "title": "...", "tasks": [...], "risk": "low" },
  "batchIndex": 0,
  "totalBatches": 5,
  "progress": "1/5"
}
```

## Data Test IDs

| Test ID | Element |
|---------|---------|
| `autopilot-panel` | Main panel container |
| `autopilot-status` | Status label text |
| `autopilot-progress` | Progress text (e.g., "2/5") |
| `autopilot-progress-bar` | Visual progress bar |
| `autopilot-current-batch` | Current batch info card |
| `batch-risk` | Risk level badge |
| `autopilot-error` | Error message display |
| `autopilot-start-button` | Start button (IDLE state) |
| `autopilot-approve-button` | Approve button (WAITING_APPROVAL) |
| `autopilot-cancel-button` | Cancel button |
| `autopilot-done` | Completion message |
| `autopilot-retry-button` | Retry button (FAILED state) |

## Batch Structure

```typescript
interface Batch {
  batchId: string;      // Stable hash-based ID
  title: string;        // e.g., "Setup (1/5)"
  tasks: string[];      // Task titles in this batch
  rationale: string;    // Why these tasks are grouped
  risk: 'low' | 'med' | 'high';
}
```

## Testing

The `/complete-batch` endpoint is restricted to test mode only. In E2E tests:

```typescript
await request.post('/api/projects/1/planning/autopilot/complete-batch', {
  headers: { 'x-vibe-test': '1' },
  data: { sessionId },
});
```
