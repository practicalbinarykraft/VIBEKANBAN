/**
 * AutopilotRunsPanel Tests (PR-63)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AutopilotRunsPanel } from "../autopilot-runs-panel";

const mockAttempts = [
  {
    id: "att-1",
    taskId: "task-1",
    status: "completed" as const,
    startedAt: "2026-01-19T10:00:00Z",
    finishedAt: "2026-01-19T10:05:00Z",
    exitCode: 0,
  },
  {
    id: "att-2",
    taskId: "task-2",
    status: "running" as const,
    startedAt: "2026-01-19T11:00:00Z",
    finishedAt: null,
    exitCode: null,
  },
  {
    id: "att-3",
    taskId: "task-3",
    status: "failed" as const,
    startedAt: "2026-01-19T09:00:00Z",
    finishedAt: "2026-01-19T09:01:00Z",
    exitCode: 1,
  },
];

describe("AutopilotRunsPanel", () => {
  it("renders list of attempts", () => {
    render(
      <AutopilotRunsPanel
        attempts={mockAttempts}
        isLoading={false}
        onOpenAttempt={() => {}}
      />
    );

    expect(screen.getByText(/att-1/i)).toBeInTheDocument();
    expect(screen.getByText(/att-2/i)).toBeInTheDocument();
    expect(screen.getByText(/att-3/i)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <AutopilotRunsPanel
        attempts={[]}
        isLoading={true}
        onOpenAttempt={() => {}}
      />
    );

    expect(screen.getByTestId("runs-loading")).toBeInTheDocument();
  });

  it("shows empty state when no attempts", () => {
    render(
      <AutopilotRunsPanel
        attempts={[]}
        isLoading={false}
        onOpenAttempt={() => {}}
      />
    );

    expect(screen.getByText(/no runs/i)).toBeInTheDocument();
  });

  it("calls onOpenAttempt when Open clicked", () => {
    const onOpen = vi.fn();
    render(
      <AutopilotRunsPanel
        attempts={mockAttempts}
        isLoading={false}
        onOpenAttempt={onOpen}
      />
    );

    const openButtons = screen.getAllByRole("button", { name: /open/i });
    fireEvent.click(openButtons[0]);

    expect(onOpen).toHaveBeenCalledWith("att-1");
  });

  it("displays status badges", () => {
    render(
      <AutopilotRunsPanel
        attempts={mockAttempts}
        isLoading={false}
        onOpenAttempt={() => {}}
      />
    );

    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
  });
});
