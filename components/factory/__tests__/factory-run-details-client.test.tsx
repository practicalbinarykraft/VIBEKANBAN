/** FactoryRunDetailsClient Tests (PR-91, PR-92) */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FactoryRunDetailsClient } from "@/app/projects/[id]/factory/runs/[runId]/factory-run-details-client";
import type { FactoryRunDetails } from "@/hooks/useFactoryRunDetails";

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
