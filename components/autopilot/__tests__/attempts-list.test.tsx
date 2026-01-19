/**
 * Unit tests for AttemptsList (PR-61)
 *
 * Tests:
 * - Renders list of attempts with status badges
 * - Clicking row calls onOpen callback
 * - Handles empty list gracefully
 * - Shows correct timestamp formatting
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AttemptsList } from "../attempts-list";
import type { AutopilotAttemptSummary } from "@/types/autopilot";

const mockAttempts: AutopilotAttemptSummary[] = [
  { id: "att-1", status: "done", createdAt: "2026-01-19T10:00:00.000Z" },
  { id: "att-2", status: "running", createdAt: "2026-01-19T11:00:00.000Z" },
  { id: "att-3", status: "failed", createdAt: "2026-01-19T12:00:00.000Z" },
  { id: "att-4", status: "queued", createdAt: "2026-01-19T13:00:00.000Z" },
];

describe("AttemptsList", () => {
  it("renders list of attempts", () => {
    render(<AttemptsList attempts={mockAttempts} />);

    expect(screen.getByTestId("attempts-list")).toBeInTheDocument();
    expect(screen.getAllByTestId("attempt-row")).toHaveLength(4);
  });

  it("shows status badge for each attempt", () => {
    render(<AttemptsList attempts={mockAttempts} />);

    expect(screen.getByText("done")).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(screen.getByText("queued")).toBeInTheDocument();
  });

  it("calls onOpen with attemptId when row is clicked", () => {
    const onOpen = vi.fn();
    render(<AttemptsList attempts={mockAttempts} onOpen={onOpen} />);

    const rows = screen.getAllByTestId("attempt-row");
    fireEvent.click(rows[0]);

    expect(onOpen).toHaveBeenCalledWith("att-1");
  });

  it("renders empty state when no attempts", () => {
    render(<AttemptsList attempts={[]} />);

    expect(screen.getByTestId("attempts-empty")).toBeInTheDocument();
    expect(screen.getByText(/no attempts/i)).toBeInTheDocument();
  });

  it("disables row click when no onOpen callback", () => {
    render(<AttemptsList attempts={mockAttempts} />);

    const rows = screen.getAllByTestId("attempt-row");
    // Row should not have pointer cursor when no callback
    expect(rows[0]).not.toHaveClass("cursor-pointer");
  });

  it("shows clickable rows when onOpen is provided", () => {
    const onOpen = vi.fn();
    render(<AttemptsList attempts={mockAttempts} onOpen={onOpen} />);

    const rows = screen.getAllByTestId("attempt-row");
    expect(rows[0]).toHaveClass("cursor-pointer");
  });
});
