/**
 * Run Details Tests (PR-75)
 * Tests for run details page components
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RunAttemptRow } from "../run-attempt-row";
import type { AttemptSummary } from "@/types/autopilot-run";

// Mock hooks
vi.mock("@/hooks/useAttemptDetails", () => ({
  useAttemptDetails: vi.fn(() => ({
    attempt: null,
    isLoading: true,
    error: null,
    isRunning: false,
  })),
}));

vi.mock("@/hooks/useAttemptLogs", () => ({
  useAttemptLogs: vi.fn(() => ({
    lines: [],
    isLoading: true,
    error: null,
  })),
}));

const mockCompletedAttempt: AttemptSummary = {
  attemptId: "att-1",
  taskId: "task-1",
  taskTitle: "Fix bug in auth",
  status: "completed",
  startedAt: "2026-01-20T10:00:00Z",
  finishedAt: "2026-01-20T10:02:00Z",
  exitCode: 0,
  error: null,
  prUrl: "https://github.com/test/test/pull/123",
};

const mockFailedAttempt: AttemptSummary = {
  attemptId: "att-2",
  taskId: "task-2",
  taskTitle: "Add feature X",
  status: "failed",
  startedAt: "2026-01-20T10:02:00Z",
  finishedAt: "2026-01-20T10:05:00Z",
  exitCode: 1,
  error: "Command failed",
  prUrl: null,
};

describe("RunAttemptRow", () => {
  const mockToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders attempt with task title", () => {
    render(
      <RunAttemptRow
        attempt={mockCompletedAttempt}
        projectId="project-123"
        isExpanded={false}
        onToggle={mockToggle}
      />
    );

    expect(screen.getByText("Fix bug in auth")).toBeInTheDocument();
  });

  it("shows status badge", () => {
    render(
      <RunAttemptRow
        attempt={mockCompletedAttempt}
        projectId="project-123"
        isExpanded={false}
        onToggle={mockToggle}
      />
    );

    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("shows check mark for completed status", () => {
    render(
      <RunAttemptRow
        attempt={mockCompletedAttempt}
        projectId="project-123"
        isExpanded={false}
        onToggle={mockToggle}
      />
    );

    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows X mark for failed status", () => {
    render(
      <RunAttemptRow
        attempt={mockFailedAttempt}
        projectId="project-123"
        isExpanded={false}
        onToggle={mockToggle}
      />
    );

    expect(screen.getByText("✗")).toBeInTheDocument();
  });

  it("shows PR link when available", () => {
    render(
      <RunAttemptRow
        attempt={mockCompletedAttempt}
        projectId="project-123"
        isExpanded={false}
        onToggle={mockToggle}
      />
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://github.com/test/test/pull/123");
  });

  it("does not show PR link when not available", () => {
    render(
      <RunAttemptRow
        attempt={mockFailedAttempt}
        projectId="project-123"
        isExpanded={false}
        onToggle={mockToggle}
      />
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("calls onToggle when clicked", () => {
    render(
      <RunAttemptRow
        attempt={mockCompletedAttempt}
        projectId="project-123"
        isExpanded={false}
        onToggle={mockToggle}
      />
    );

    fireEvent.click(screen.getByTestId("attempt-row-att-1"));
    expect(mockToggle).toHaveBeenCalled();
  });

  it("shows details panel when expanded", () => {
    render(
      <RunAttemptRow
        attempt={mockCompletedAttempt}
        projectId="project-123"
        isExpanded={true}
        onToggle={mockToggle}
      />
    );

    // Details panel wrapper should be present
    expect(screen.getByText("Loading attempt details...")).toBeInTheDocument();
  });

  it("calculates duration correctly", () => {
    render(
      <RunAttemptRow
        attempt={mockCompletedAttempt}
        projectId="project-123"
        isExpanded={false}
        onToggle={mockToggle}
      />
    );

    // 2 minutes difference
    expect(screen.getByText("2m 0s")).toBeInTheDocument();
  });
});
