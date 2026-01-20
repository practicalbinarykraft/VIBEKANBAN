/** AutopilotRunHistory Tests (PR-65) */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AutopilotRunHistory } from "../autopilot-run-history";
import type { RunSummary, RunDetails } from "@/types/autopilot-run";

const mockRun: RunSummary = {
  runId: "project-123",
  projectId: "project-123",
  status: "done",
  startedAt: "2026-01-20T10:00:00Z",
  finishedAt: "2026-01-20T10:05:00Z",
  totalTasks: 5,
  doneTasks: 4,
  failedTasks: 1,
};

const mockDetails: RunDetails = {
  ...mockRun,
  attempts: [
    {
      attemptId: "att-1",
      taskId: "task-1",
      taskTitle: "Task 1",
      status: "completed",
      startedAt: "2026-01-20T10:00:00Z",
      finishedAt: "2026-01-20T10:02:00Z",
      exitCode: 0,
      error: null,
    },
    {
      attemptId: "att-2",
      taskId: "task-2",
      taskTitle: "Task 2",
      status: "failed",
      startedAt: "2026-01-20T10:02:00Z",
      finishedAt: "2026-01-20T10:03:00Z",
      exitCode: 1,
      error: "Command failed",
    },
  ],
  errors: [
    { code: "EXIT_1", message: "Command failed", attemptId: "att-2", taskTitle: "Task 2" },
  ],
};

describe("AutopilotRunHistory", () => {
  it("shows loading state", () => {
    render(
      <AutopilotRunHistory
        runs={[]}
        isLoading={true}
        selectedRun={null}
        selectedRunLoading={false}
        onSelectRun={() => {}}
        onCloseDetails={() => {}}
      />
    );
    expect(screen.getByTestId("run-history-loading")).toBeInTheDocument();
  });

  it("shows empty state when no runs", () => {
    render(
      <AutopilotRunHistory
        runs={[]}
        isLoading={false}
        selectedRun={null}
        selectedRunLoading={false}
        onSelectRun={() => {}}
        onCloseDetails={() => {}}
      />
    );
    expect(screen.getByText("No runs yet")).toBeInTheDocument();
  });

  it("renders run list", () => {
    render(
      <AutopilotRunHistory
        runs={[mockRun]}
        isLoading={false}
        selectedRun={null}
        selectedRunLoading={false}
        onSelectRun={() => {}}
        onCloseDetails={() => {}}
      />
    );
    expect(screen.getByText("done")).toBeInTheDocument();
    expect(screen.getByText(/4\/5 done/)).toBeInTheDocument();
  });

  it("calls onSelectRun when clicking a run", () => {
    const onSelectRun = vi.fn();
    render(
      <AutopilotRunHistory
        runs={[mockRun]}
        isLoading={false}
        selectedRun={null}
        selectedRunLoading={false}
        onSelectRun={onSelectRun}
        onCloseDetails={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId("run-item-project-123"));
    expect(onSelectRun).toHaveBeenCalledWith("project-123");
  });

  it("shows details loading state", () => {
    render(
      <AutopilotRunHistory
        runs={[mockRun]}
        isLoading={false}
        selectedRun={null}
        selectedRunLoading={true}
        onSelectRun={() => {}}
        onCloseDetails={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId("run-item-project-123"));
    expect(screen.getByText("Loading details...")).toBeInTheDocument();
  });

  it("shows run details when selected", () => {
    render(
      <AutopilotRunHistory
        runs={[mockRun]}
        isLoading={false}
        selectedRun={mockDetails}
        selectedRunLoading={false}
        onSelectRun={() => {}}
        onCloseDetails={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId("run-item-project-123"));
    expect(screen.getByText("Attempts:")).toBeInTheDocument();
  });

  it("shows errors in details", () => {
    render(
      <AutopilotRunHistory
        runs={[mockRun]}
        isLoading={false}
        selectedRun={mockDetails}
        selectedRunLoading={false}
        onSelectRun={() => {}}
        onCloseDetails={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId("run-item-project-123"));
    expect(screen.getByText(/Failed: 1 task/)).toBeInTheDocument();
  });

  it("displays failed count in run summary", () => {
    render(
      <AutopilotRunHistory
        runs={[mockRun]}
        isLoading={false}
        selectedRun={null}
        selectedRunLoading={false}
        onSelectRun={() => {}}
        onCloseDetails={() => {}}
      />
    );
    expect(screen.getByText(/1 failed/)).toBeInTheDocument();
  });
});
