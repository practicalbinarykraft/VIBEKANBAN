/** Factory Live Console Tests (PR-102, PR-109) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FactoryLiveConsole, type LogLine } from "../factory-live-console";

const mockLines: LogLine[] = [
  { ts: "2024-01-01T10:00:00Z", taskId: "task-1", attemptId: "attempt-1", line: "Starting task..." },
  { ts: "2024-01-01T10:00:01Z", taskId: "task-1", attemptId: "attempt-1", line: "Running npm install" },
  { ts: "2024-01-01T10:00:02Z", taskId: "task-2", attemptId: "attempt-2", line: "Task 2 started" },
];

describe("FactoryLiveConsole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders console with data-testid", () => {
    render(<FactoryLiveConsole lines={[]} />);
    expect(screen.getByTestId("factory-live-console")).toBeInTheDocument();
  });

  it("shows empty state when no lines", () => {
    render(<FactoryLiveConsole lines={[]} />);
    expect(screen.getByText(/waiting for logs/i)).toBeInTheDocument();
  });

  it("renders log lines", () => {
    render(<FactoryLiveConsole lines={mockLines} />);
    expect(screen.getByText(/Starting task/)).toBeInTheDocument();
    expect(screen.getByText(/npm install/)).toBeInTheDocument();
  });

  it("shows task ID prefix for each line", () => {
    render(<FactoryLiveConsole lines={mockLines} />);
    expect(screen.getAllByText(/task-1/).length).toBeGreaterThan(0);
  });

  it("renders pause scroll button", () => {
    render(<FactoryLiveConsole lines={mockLines} />);
    expect(screen.getByTestId("pause-scroll-button")).toBeInTheDocument();
  });

  it("toggles pause state on button click", () => {
    render(<FactoryLiveConsole lines={mockLines} />);
    const button = screen.getByTestId("pause-scroll-button");
    
    expect(button).toHaveTextContent(/pause/i);
    fireEvent.click(button);
    expect(button).toHaveTextContent(/resume/i);
  });

  it("limits displayed lines to maxLines prop", () => {
    const manyLines: LogLine[] = Array.from({ length: 600 }, (_, i) => ({
      ts: new Date(2024, 0, 1, 10, 0, i % 60).toISOString(),
      taskId: "task-1",
      attemptId: "attempt-1",
      line: "Log line " + i,
    }));

    render(<FactoryLiveConsole lines={manyLines} maxLines={500} />);
    
    // Should show last line but not first (truncated)
    expect(screen.getByText(/Log line 599/)).toBeInTheDocument();
  });

  it("shows line count", () => {
    render(<FactoryLiveConsole lines={mockLines} />);
    expect(screen.getByText(/3 lines/i)).toBeInTheDocument();
  });

  it("formats timestamp", () => {
    render(<FactoryLiveConsole lines={mockLines} />);
    // Should show time portion (local time, so check for pattern HH:MM:SS)
    expect(screen.getByText(/\d{2}:\d{2}:00/)).toBeInTheDocument();
  });

  it("applies different colors for different tasks", () => {
    render(<FactoryLiveConsole lines={mockLines} />);
    const lines = screen.getAllByTestId(/console-line-/);
    expect(lines.length).toBe(3);
  });

  // PR-109: Connection status indicator tests
  describe("connection status (PR-109)", () => {
    it("shows connected indicator when connectionStatus is connected", () => {
      render(<FactoryLiveConsole lines={mockLines} connectionStatus="connected" />);
      expect(screen.getByTestId("status-connected")).toBeInTheDocument();
    });

    it("shows reconnecting indicator when connectionStatus is reconnecting", () => {
      render(<FactoryLiveConsole lines={mockLines} connectionStatus="reconnecting" />);
      expect(screen.getByTestId("status-reconnecting")).toBeInTheDocument();
    });

    it("shows disconnected indicator when connectionStatus is disconnected", () => {
      render(<FactoryLiveConsole lines={mockLines} connectionStatus="disconnected" />);
      expect(screen.getByTestId("status-disconnected")).toBeInTheDocument();
    });

    it("defaults to disconnected when no connectionStatus provided", () => {
      render(<FactoryLiveConsole lines={mockLines} />);
      expect(screen.getByTestId("status-disconnected")).toBeInTheDocument();
    });
  });
});
