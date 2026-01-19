/**
 * Unit tests for AttemptLogModal (PR-61)
 *
 * Tests:
 * - Shows modal when isOpen is true
 * - Hides modal when isOpen is false
 * - Displays attempt details (status, logs, resultSummary)
 * - Calls onClose when close button clicked
 * - Handles null/undefined attempt gracefully
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AttemptLogModal } from "../attempt-log-modal";
import type { AutopilotAttemptDetails } from "@/types/autopilot";

const mockAttempt: AutopilotAttemptDetails = {
  id: "att-123",
  status: "done",
  createdAt: "2026-01-19T10:00:00.000Z",
  logs: "Task started...\nProcessing...\nCompleted successfully.",
  resultSummary: "All tasks completed",
};

describe("AttemptLogModal", () => {
  it("renders modal when isOpen is true", () => {
    render(<AttemptLogModal isOpen={true} attempt={mockAttempt} onClose={() => {}} />);

    expect(screen.getByTestId("attempt-modal")).toBeInTheDocument();
  });

  it("does not render modal when isOpen is false", () => {
    render(<AttemptLogModal isOpen={false} attempt={mockAttempt} onClose={() => {}} />);

    expect(screen.queryByTestId("attempt-modal")).not.toBeInTheDocument();
  });

  it("displays attempt status", () => {
    render(<AttemptLogModal isOpen={true} attempt={mockAttempt} onClose={() => {}} />);

    expect(screen.getByText("done")).toBeInTheDocument();
  });

  it("displays attempt logs", () => {
    render(<AttemptLogModal isOpen={true} attempt={mockAttempt} onClose={() => {}} />);

    expect(screen.getByTestId("attempt-logs")).toBeInTheDocument();
    expect(screen.getByText(/Task started/)).toBeInTheDocument();
  });

  it("displays result summary", () => {
    render(<AttemptLogModal isOpen={true} attempt={mockAttempt} onClose={() => {}} />);

    expect(screen.getByText("All tasks completed")).toBeInTheDocument();
  });

  it("calls onClose when close is triggered", () => {
    const onClose = vi.fn();
    render(<AttemptLogModal isOpen={true} attempt={mockAttempt} onClose={onClose} />);

    // Find and click the close button (X icon)
    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("handles null attempt gracefully when open", () => {
    render(<AttemptLogModal isOpen={true} attempt={null} onClose={() => {}} />);

    expect(screen.getByTestId("attempt-modal")).toBeInTheDocument();
    expect(screen.getByText(/no attempt data/i)).toBeInTheDocument();
  });

  it("shows empty state for null logs", () => {
    const attemptNoLogs: AutopilotAttemptDetails = {
      ...mockAttempt,
      logs: null,
    };
    render(<AttemptLogModal isOpen={true} attempt={attemptNoLogs} onClose={() => {}} />);

    expect(screen.getByText(/no logs available/i)).toBeInTheDocument();
  });
});
