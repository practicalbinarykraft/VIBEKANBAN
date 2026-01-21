/** FactoryResultsPanel Tests (PR-89, PR-90) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FactoryResultsPanel } from "../factory-results-panel";
import type { FactoryResultsResponse } from "@/server/services/factory/factory-results.service";

// Mock useAttemptSummary hook to avoid act() warnings
vi.mock("@/hooks/useAttemptSummary", () => ({
  useAttemptSummary: vi.fn().mockReturnValue({
    data: null,
    loading: false,
    error: null,
  }),
}));

const mockData: FactoryResultsResponse = {
  runId: "run-123",
  status: "completed",
  totals: { queued: 1, running: 2, completed: 3, failed: 1 },
  attempts: [
    { taskId: 1, attemptId: "a1", status: "completed", prUrl: "https://github.com/pr/1", updatedAt: "2026-01-20T12:00:00Z" },
    { taskId: 2, attemptId: "a2", status: "failed", prUrl: null, updatedAt: "2026-01-20T11:00:00Z" },
  ],
};

const mockIdleData: FactoryResultsResponse = {
  runId: null,
  status: "idle",
  totals: { queued: 0, running: 0, completed: 0, failed: 0 },
  attempts: [],
};

describe("FactoryResultsPanel", () => {
  const defaultProps = {
    data: mockData,
    loading: false,
    error: null,
    projectId: "p1",
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it("renders panel with data-testid", () => {
    render(<FactoryResultsPanel {...defaultProps} />);
    expect(screen.getByTestId("factory-results-panel")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<FactoryResultsPanel {...defaultProps} data={null} loading={true} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders empty state (idle)", () => {
    render(<FactoryResultsPanel {...defaultProps} data={mockIdleData} />);
    expect(screen.getByText(/no factory run/i)).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(<FactoryResultsPanel {...defaultProps} data={null} error="Network error" />);
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it("renders totals row", () => {
    render(<FactoryResultsPanel {...defaultProps} />);
    expect(screen.getByText(/1 queued/i)).toBeInTheDocument();
    expect(screen.getByText(/2 running/i)).toBeInTheDocument();
    expect(screen.getByText(/3 completed/i)).toBeInTheDocument();
    expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
  });

  it("renders list with PR link when present", () => {
    render(<FactoryResultsPanel {...defaultProps} />);
    const prLink = screen.getByTestId("pr-link-a1");
    expect(prLink).toBeInTheDocument();
    expect(prLink).toHaveAttribute("href", "https://github.com/pr/1");
    expect(prLink).toHaveAttribute("target", "_blank");
  });

  it("does not render PR link when absent", () => {
    render(<FactoryResultsPanel {...defaultProps} />);
    expect(screen.queryByTestId("pr-link-a2")).not.toBeInTheDocument();
  });

  it("Open run button exists only when runId != null", () => {
    render(<FactoryResultsPanel {...defaultProps} />);
    expect(screen.getByTestId("open-run-button")).toBeInTheDocument();
  });

  it("Open run button does not exist when runId is null", () => {
    render(<FactoryResultsPanel {...defaultProps} data={mockIdleData} />);
    expect(screen.queryByTestId("open-run-button")).not.toBeInTheDocument();
  });

  it("Open run button has correct href", () => {
    render(<FactoryResultsPanel {...defaultProps} />);
    const button = screen.getByTestId("open-run-button");
    expect(button).toHaveAttribute("href", "/projects/p1/autopilot/runs/run-123");
  });

  it("shows status badge", () => {
    render(<FactoryResultsPanel {...defaultProps} />);
    expect(screen.getByTestId("status-badge")).toHaveTextContent("completed");
  });
});
