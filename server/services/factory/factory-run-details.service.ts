/** Factory Run Details Service (PR-102) - Get detailed run info for UI */

export type RunItemStatus = "queued" | "running" | "completed" | "failed";

export interface RunInfo {
  id: string;
  projectId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  maxParallel: number;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface CiStatus {
  status: "pending" | "success" | "failed" | "cancelled";
  summary: string;
}

export interface RunItem {
  taskId: string;
  taskTitle: string;
  attemptId: string;
  attemptStatus: RunItemStatus;
  branchName: string | null;
  prUrl: string | null;
  headCommit: string | null;
}

export interface RunItemWithCi extends RunItem {
  ci: CiStatus | null;
}

export interface RunCounts {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
}

export interface RunDetailsResult {
  run: RunInfo;
  counts: RunCounts;
  items: RunItemWithCi[];
}

export interface RunDetailsDeps {
  getRun: (runId: string) => Promise<RunInfo | null>;
  getRunItems: (runId: string) => Promise<RunItem[]>;
  getPrCiStatus: (prUrl: string, commitSha: string) => Promise<CiStatus | null>;
}

const STATUS_PRIORITY: Record<RunItemStatus, number> = {
  running: 0,
  queued: 1,
  completed: 2,
  failed: 3,
};

function countItems(items: RunItem[]): RunCounts {
  return {
    total: items.length,
    queued: items.filter((i) => i.attemptStatus === "queued").length,
    running: items.filter((i) => i.attemptStatus === "running").length,
    completed: items.filter((i) => i.attemptStatus === "completed").length,
    failed: items.filter((i) => i.attemptStatus === "failed").length,
  };
}

function sortByStatus(items: RunItemWithCi[]): RunItemWithCi[] {
  return [...items].sort((a, b) => {
    return STATUS_PRIORITY[a.attemptStatus] - STATUS_PRIORITY[b.attemptStatus];
  });
}

/**
 * Get detailed run info including items with CI status
 */
export async function getRunDetails(
  runId: string,
  deps: RunDetailsDeps
): Promise<RunDetailsResult | null> {
  const run = await deps.getRun(runId);
  if (!run) return null;

  const items = await deps.getRunItems(runId);
  const counts = countItems(items);

  // Enrich items with CI status
  const itemsWithCi: RunItemWithCi[] = await Promise.all(
    items.map(async (item) => {
      let ci: CiStatus | null = null;
      if (item.prUrl && item.headCommit) {
        try {
          ci = await deps.getPrCiStatus(item.prUrl, item.headCommit);
        } catch {
          ci = null;
        }
      }
      return { ...item, ci };
    })
  );

  return {
    run,
    counts,
    items: sortByStatus(itemsWithCi),
  };
}
