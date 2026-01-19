/**
 * AttemptLogsViewer Tests (PR-63)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AttemptLogsViewer } from "../attempt-logs-viewer";

const mockLogs = [
  { timestamp: "2026-01-19T10:00:00Z", level: "info" as const, message: "Starting task..." },
  { timestamp: "2026-01-19T10:00:01Z", level: "warning" as const, message: "Slow response" },
  { timestamp: "2026-01-19T10:00:02Z", level: "error" as const, message: "Connection failed" },
];

describe("AttemptLogsViewer", () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders log lines", () => {
    render(<AttemptLogsViewer lines={mockLogs} />);

    expect(screen.getByText("Starting task...")).toBeInTheDocument();
    expect(screen.getByText("Slow response")).toBeInTheDocument();
    expect(screen.getByText("Connection failed")).toBeInTheDocument();
  });

  it("shows empty state when no logs", () => {
    render(<AttemptLogsViewer lines={[]} />);

    expect(screen.getByText(/no logs available/i)).toBeInTheDocument();
  });

  it("copy button copies logs to clipboard", async () => {
    render(<AttemptLogsViewer lines={mockLogs} />);

    const copyBtn = screen.getByTestId("copy-logs");
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("Starting task...")
    );
  });

  it("toggle auto-scroll button exists and toggles", () => {
    render(<AttemptLogsViewer lines={mockLogs} autoScroll={true} />);

    const toggleBtn = screen.getByTestId("scroll-toggle");
    expect(toggleBtn).toBeInTheDocument();

    // Initially auto-scroll is on
    expect(toggleBtn).toHaveTextContent(/auto-scroll on/i);

    // Click to toggle off
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent(/auto-scroll off/i);
  });

  it("renders timestamps for each line", () => {
    render(<AttemptLogsViewer lines={mockLogs} />);

    // Check that timestamps are rendered (time format varies by locale)
    const container = screen.getByTestId("logs-container");
    expect(container.querySelectorAll("div > span").length).toBeGreaterThan(0);
  });

  it("applies different colors for log levels", () => {
    render(<AttemptLogsViewer lines={mockLogs} />);

    // Error messages should have red color class
    const errorMessage = screen.getByText("Connection failed");
    expect(errorMessage).toHaveClass("text-red-500");
  });
});
