/** FactoryRunResultsPanel Tests (PR-88) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FactoryRunResultsPanel } from "../factory-run-results-panel";
import type { FactoryRunResultsDTO, ResultItem } from "@/server/services/factory/factory-run-results.service";

const mockItem: ResultItem = {
  taskId: "t1",
  taskTitle: "Task 1",
  attemptId: "a1",
  attemptStatus: "completed",
  prUrl: "https://github.com/pr/1",
};

const mockFailedItem: ResultItem = {
  taskId: "t2",
  taskTitle: "Task 2 Failed",
  attemptId: "a2",
  attemptStatus: "failed",
  errorCode: "GIT_ERROR",
  errorMessage: "Git push failed",
  guidance: {
    severity: "critical",
    title: "Git operation failed",
    bullets: ["Check permissions", "Verify SSH keys"],
  },
};

const mockResults: FactoryRunResultsDTO = {
  runId: "run-123",
  status: "completed",
  counts: { total: 2, ok: 1, failed: 1, running: 0, queued: 0 },
  items: [mockItem, mockFailedItem],
};

const mockRunningResults: FactoryRunResultsDTO = {
  ...mockResults,
  status: "running",
  counts: { total: 2, ok: 1, failed: 0, running: 1, queued: 0 },
};

describe("FactoryRunResultsPanel", () => {
  const defaultProps = {
    results: mockResults,
    isLoading: false,
    error: null,
    onRetry: vi.fn(),
    onOpenLogs: vi.fn(),
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it("renders panel with data-testid", () => {
    render(<FactoryRunResultsPanel {...defaultProps} />);
    expect(screen.getByTestId("factory-run-results-panel")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<FactoryRunResultsPanel {...defaultProps} results={null} isLoading={true} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows error state", () => {
    render(<FactoryRunResultsPanel {...defaultProps} results={null} error="Network error" />);
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it("shows count chips", () => {
    render(<FactoryRunResultsPanel {...defaultProps} />);
    expect(screen.getByText(/1 ok/i)).toBeInTheDocument();
    expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
  });

  it("shows task titles in items", () => {
    render(<FactoryRunResultsPanel {...defaultProps} />);
    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.getByText("Task 2 Failed")).toBeInTheDocument();
  });

  it("shows PR status cell for completed items with prUrl", () => {
    render(<FactoryRunResultsPanel {...defaultProps} />);
    // PR-98: Changed from pr-link-a1 to pr-status-link
    const prLink = screen.getByTestId("pr-status-link");
    expect(prLink).toBeInTheDocument();
    expect(prLink).toHaveAttribute("href", "https://github.com/pr/1");
  });

  it("shows error message for failed items", () => {
    render(<FactoryRunResultsPanel {...defaultProps} />);
    expect(screen.getByText(/git push failed/i)).toBeInTheDocument();
  });

  it("shows guidance for failed items", () => {
    render(<FactoryRunResultsPanel {...defaultProps} />);
    expect(screen.getByText(/git operation failed/i)).toBeInTheDocument();
  });

  it("calls onRetry when retry button clicked for failed task", () => {
    const onRetry = vi.fn();
    render(<FactoryRunResultsPanel {...defaultProps} onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId("retry-button-t2"));
    expect(onRetry).toHaveBeenCalledWith("t2");
  });

  it("calls onOpenLogs when logs button clicked", () => {
    const onOpenLogs = vi.fn();
    render(<FactoryRunResultsPanel {...defaultProps} onOpenLogs={onOpenLogs} />);
    fireEvent.click(screen.getByTestId("logs-button-a1"));
    expect(onOpenLogs).toHaveBeenCalledWith("a1");
  });

  it("disables retry button when not failed", () => {
    render(<FactoryRunResultsPanel {...defaultProps} />);
    // Task 1 is completed, should not have retry button visible
    expect(screen.queryByTestId("retry-button-t1")).not.toBeInTheDocument();
  });

  it("shows status badge for each item", () => {
    render(<FactoryRunResultsPanel {...defaultProps} />);
    expect(screen.getByTestId("status-badge-a1")).toHaveTextContent("completed");
    expect(screen.getByTestId("status-badge-a2")).toHaveTextContent("failed");
  });
});
