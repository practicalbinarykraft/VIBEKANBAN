/**
 * AttemptDetailsPanel Tests (PR-63)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AttemptDetailsPanel } from "../attempt-details-panel";

const mockAttempt = {
  attemptId: "att-123",
  status: "running" as const,
  startedAt: "2026-01-19T10:00:00Z",
  finishedAt: null,
  exitCode: null,
  error: null,
};

const mockLogs = [
  { timestamp: "2026-01-19T10:00:00Z", level: "info" as const, message: "Starting..." },
  { timestamp: "2026-01-19T10:00:01Z", level: "error" as const, message: "Error occurred" },
];

describe("AttemptDetailsPanel", () => {
  it("renders attempt details", () => {
    render(
      <AttemptDetailsPanel
        attempt={mockAttempt}
        logs={mockLogs}
        isLoading={false}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/att-123/)).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <AttemptDetailsPanel
        attempt={null}
        logs={[]}
        isLoading={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByTestId("details-loading")).toBeInTheDocument();
  });

  it("shows error when attempt has error", () => {
    const failedAttempt = {
      ...mockAttempt,
      status: "failed" as const,
      error: "Process exited with code 1",
    };

    render(
      <AttemptDetailsPanel
        attempt={failedAttempt}
        logs={[]}
        isLoading={false}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/process exited/i)).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(
      <AttemptDetailsPanel
        attempt={mockAttempt}
        logs={[]}
        isLoading={false}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it("displays timestamps", () => {
    const completedAttempt = {
      ...mockAttempt,
      status: "completed" as const,
      finishedAt: "2026-01-19T10:05:00Z",
    };

    render(
      <AttemptDetailsPanel
        attempt={completedAttempt}
        logs={[]}
        isLoading={false}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/started/i)).toBeInTheDocument();
    expect(screen.getByText(/finished/i)).toBeInTheDocument();
  });

  it("passes logs to viewer", () => {
    render(
      <AttemptDetailsPanel
        attempt={mockAttempt}
        logs={mockLogs}
        isLoading={false}
        onClose={() => {}}
      />
    );

    // Logs should be visible
    expect(screen.getByText("Starting...")).toBeInTheDocument();
    expect(screen.getByText("Error occurred")).toBeInTheDocument();
  });
});
