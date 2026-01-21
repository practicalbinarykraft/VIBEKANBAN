/** Factory Run Bottlenecks (PR-96) - Pure helper to detect issues */
import type { FactoryRunMetricsV2 } from "./factory-run-metrics-v2.service";

export type BottleneckHint = {
  code: "LOW_THROUGHPUT" | "HIGH_FAILURE_RATE" | "LOW_PARALLELISM" | "NO_PROGRESS";
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
};

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

export function getFactoryRunBottlenecks(m: FactoryRunMetricsV2): BottleneckHint[] {
  const hints: BottleneckHint[] = [];
  const { totals, timing, timeline } = m;

  // No attempts = no issues
  if (totals.started === 0) {
    return [];
  }

  // NO_PROGRESS: started>0, completed=0, failed=0, timeline has 3+ buckets
  if (totals.completed === 0 && totals.failed === 0 && totals.started > 0 && timeline.length >= 3) {
    hints.push({
      code: "NO_PROGRESS",
      severity: "critical",
      title: "No progress detected",
      detail: "Tasks started but none completed or failed after multiple intervals",
    });
  }

  // HIGH_FAILURE_RATE: failed/(completed+failed) >= 0.3 → warning, >=0.5 → critical
  const finishedCount = totals.completed + totals.failed;
  if (finishedCount > 0) {
    const failureRate = totals.failed / finishedCount;
    if (failureRate >= 0.5) {
      hints.push({
        code: "HIGH_FAILURE_RATE",
        severity: "critical",
        title: "High failure rate",
        detail: `${Math.round(failureRate * 100)}% of finished attempts failed`,
      });
    } else if (failureRate >= 0.3) {
      hints.push({
        code: "HIGH_FAILURE_RATE",
        severity: "warning",
        title: "Elevated failure rate",
        detail: `${Math.round(failureRate * 100)}% of finished attempts failed`,
      });
    }
  }

  // LOW_THROUGHPUT: throughputPerMin < 0.1 → critical, < 0.2 → warning
  if (timing.throughputPerMin !== null) {
    if (timing.throughputPerMin < 0.1) {
      hints.push({
        code: "LOW_THROUGHPUT",
        severity: "critical",
        title: "Very low throughput",
        detail: `Only ${timing.throughputPerMin} tasks/min completed`,
      });
    } else if (timing.throughputPerMin < 0.2) {
      hints.push({
        code: "LOW_THROUGHPUT",
        severity: "warning",
        title: "Low throughput",
        detail: `Only ${timing.throughputPerMin} tasks/min completed`,
      });
    }
  }

  // LOW_PARALLELISM: peakRunning <= 1 AND totals.started >= 3
  if (timing.peakRunning <= 1 && totals.started >= 3) {
    hints.push({
      code: "LOW_PARALLELISM",
      severity: "info",
      title: "Low parallelism",
      detail: "Consider increasing maxParallel for faster execution",
    });
  }

  // Sort by severity (critical first) then by code
  hints.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return a.code.localeCompare(b.code);
  });

  return hints;
}
