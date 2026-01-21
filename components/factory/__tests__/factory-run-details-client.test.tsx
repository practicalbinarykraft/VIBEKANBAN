/** FactoryRunDetailsClient Tests (PR-91, PR-92, PR-93, PR-107, PR-109) */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FactoryRunDetailsClient } from "@/app/projects/[id]/factory/runs/[runId]/factory-run-details-client";
import type { FactoryRunDetails } from "@/hooks/useFactoryRunDetails";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock the rerun hook
vi.mock("@/hooks/useFactoryRerun", () => ({
  useFactoryRerun: vi.fn(() => ({
    rerunFailed: vi.fn().mockResolvedValue({ started: false }),
    rerunSelected: vi.fn().mockResolvedValue({ started: false }),
    isLoading: false,
    error: null,
    lastResult: null,
  })),
}));

// Mock the log stream hook (PR-107, PR-109)
vi.mock("@/hooks/useFactoryLogStream", () => ({
  useFactoryLogStream: vi.fn(() => ({
    lines: [],
    status: "disconnected",
    error: null,
  })),
}));

// Mock the metrics hook
vi.mock("@/hooks/useFactoryRunMetrics", () => ({
  useFactoryRunMetrics: vi.fn(() => ({
    data: null,
    loading: false,
    error: null,
  })),
}));

// Mock the V2 metrics panel (it fetches its own data)
vi.mock("@/components/factory/factory-run-metrics-panel-v2", () => ({
  FactoryRunMetricsPanelV2: () => <div data-testid="metrics-panel-v2">Metrics V2</div>,
}));

// Mock the hook
const mockRun: FactoryRunDetails = {
  id: "run-123",
  projectId: "proj-1",
  status: "running",
  mode: "column",
  maxParallel: 3,
  selectedTaskIds: null,
  columnId: "todo",
  startedAt: "2024-01-15T10:00:00Z",
  finishedAt: null,
  error: null,
  guidance: null,
  counts: { total: 5, completed: 2, failed: 1, running: 1, queued: 1 },
  attempts: [
    { id: "att-1", taskId: "task-1", status: "completed", prUrl: "https://github.com/pr/1", updatedAt: "2024-01-15T10:05:00Z" },
    { id: "att-2", taskId: "task-2", status: "running", prUrl: null, updatedAt: "2024-01-15T10:10:00Z" },
  ],
};

vi.mock("@/hooks/useFactoryRunDetails", () => ({
  useFactoryRunDetails: vi.fn(() => ({
    run: mockRun,
    loading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

describe("FactoryRunDetailsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders run summary with data-testid", () => {
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("run-summary")).toBeInTheDocument();
  });

  it("renders attempts list with data-testid", () => {
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("attempts-list")).toBeInTheDocument();
  });

  it("shows back link", () => {
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("back-link")).toBeInTheDocument();
  });

  it("shows stop button when running", () => {
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("stop-button")).toBeInTheDocument();
  });

  it("shows counts block", () => {
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByText("5")).toBeInTheDocument(); // total
    expect(screen.getByText("2")).toBeInTheDocument(); // completed
  });

  it("shows loading state", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByText("Loading run details...")).toBeInTheDocument();
  });

  it("shows error state", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: null,
      loading: false,
      error: "Run not found",
      refetch: vi.fn(),
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByText("Run not found")).toBeInTheDocument();
  });
});

// PR-93 tests
describe("FactoryRunDetailsClient rerun (PR-93)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT show rerun panel when run is running", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: { ...mockRun, status: "running" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.queryByTestId("rerun-panel")).not.toBeInTheDocument();
  });

  it("shows rerun panel when run is completed with attempts", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: { ...mockRun, status: "completed" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("rerun-panel")).toBeInTheDocument();
  });

  it("shows rerun failed button with count", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: { ...mockRun, status: "failed", counts: { ...mockRun.counts, failed: 3 } },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("rerun-failed-button")).toBeInTheDocument();
    expect(screen.getByText(/Rerun failed \(3\)/)).toBeInTheDocument();
  });

  it("disables rerun failed button when no failed tasks", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: { ...mockRun, status: "completed", counts: { ...mockRun.counts, failed: 0 } },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("rerun-failed-button")).toBeDisabled();
  });

  it("disables rerun selected button when nothing selected", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: { ...mockRun, status: "completed" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("rerun-selected-button")).toBeDisabled();
  });

  it("renders checkboxes for each attempt", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: { ...mockRun, status: "completed" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("attempt-checkbox-att-1")).toBeInTheDocument();
    expect(screen.getByTestId("attempt-checkbox-att-2")).toBeInTheDocument();
  });

  it("shows max parallel input", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: { ...mockRun, status: "completed" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("max-parallel-input")).toBeInTheDocument();
  });
});

// PR-107 tests - Live Console Integration
describe("FactoryRunDetailsClient live console (PR-107)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders live console container", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: mockRun,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("live-console-container")).toBeInTheDocument();
  });

  it("renders FactoryLiveConsole component", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: mockRun,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("factory-live-console")).toBeInTheDocument();
  });

  it("shows logs when stream has lines", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    const { useFactoryLogStream } = await import("@/hooks/useFactoryLogStream");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: mockRun,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useFactoryLogStream).mockReturnValue({
      lines: [
        { ts: "2024-01-01T10:00:00Z", taskId: "task-1", attemptId: "att-1", line: "Test log line" },
      ],
      status: "connected",
      error: null,
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByText(/Test log line/)).toBeInTheDocument();
  });

  it("shows disconnected indicator when not connected (PR-109)", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    const { useFactoryLogStream } = await import("@/hooks/useFactoryLogStream");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: { ...mockRun, status: "completed" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useFactoryLogStream).mockReturnValue({
      lines: [
        { ts: "2024-01-01T10:00:00Z", taskId: "task-1", attemptId: "att-1", line: "Some log" },
      ],
      status: "disconnected",
      error: null,
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("status-disconnected")).toBeInTheDocument();
  });

  it("shows connected indicator when connected (PR-109)", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    const { useFactoryLogStream } = await import("@/hooks/useFactoryLogStream");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: mockRun,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useFactoryLogStream).mockReturnValue({
      lines: [
        { ts: "2024-01-01T10:00:00Z", taskId: "task-1", attemptId: "att-1", line: "Log" },
      ],
      status: "connected",
      error: null,
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("status-connected")).toBeInTheDocument();
  });

  it("does not crash with empty logs array", async () => {
    const { useFactoryRunDetails } = await import("@/hooks/useFactoryRunDetails");
    const { useFactoryLogStream } = await import("@/hooks/useFactoryLogStream");
    vi.mocked(useFactoryRunDetails).mockReturnValue({
      run: mockRun,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useFactoryLogStream).mockReturnValue({
      lines: [],
      status: "connected",
      error: null,
    });
    render(<FactoryRunDetailsClient projectId="proj-1" runId="run-123" />);
    expect(screen.getByTestId("factory-live-console")).toBeInTheDocument();
    expect(screen.getByText(/waiting for logs/i)).toBeInTheDocument();
  });
});
