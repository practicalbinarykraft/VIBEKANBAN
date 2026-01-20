/** FactoryConsolePanel Tests (PR-84) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FactoryConsolePanel } from "../factory-console-panel";
import type { AttemptState } from "@/hooks/useFactoryStream";

describe("FactoryConsolePanel", () => {
  const defaultProps = {
    isConnected: true,
    runId: "run-1",
    runStatus: "running",
    attempts: new Map<string, AttemptState>(),
    counts: { total: 0, completed: 0, failed: 0, cancelled: 0, running: 0, queued: 0 },
    onStop: vi.fn(),
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it("renders panel with data-testid", () => {
    render(<FactoryConsolePanel {...defaultProps} />);
    expect(screen.getByTestId("factory-console-panel")).toBeInTheDocument();
  });

  it("renders stop all button", () => {
    render(<FactoryConsolePanel {...defaultProps} />);
    expect(screen.getByTestId("factory-stop-all-button")).toBeInTheDocument();
  });

  it("calls onStop when stop all button clicked", () => {
    const onStop = vi.fn();
    render(<FactoryConsolePanel {...defaultProps} onStop={onStop} />);
    fireEvent.click(screen.getByTestId("factory-stop-all-button"));
    expect(onStop).toHaveBeenCalled();
  });

  it("disables stop button when not running", () => {
    render(<FactoryConsolePanel {...defaultProps} runStatus="completed" />);
    expect(screen.getByTestId("factory-stop-all-button")).toBeDisabled();
  });

  it("renders attempt rows", () => {
    const attempts = new Map<string, AttemptState>([
      ["a1", { attemptId: "a1", taskId: "t1", status: "running", lastLogLine: "Processing" }],
      ["a2", { attemptId: "a2", taskId: "t2", status: "completed", lastLogLine: "Done" }],
    ]);
    render(<FactoryConsolePanel {...defaultProps} attempts={attempts} />);
    const rows = screen.getAllByTestId("factory-attempt-row");
    expect(rows).toHaveLength(2);
  });

  it("shows connection status indicator", () => {
    render(<FactoryConsolePanel {...defaultProps} isConnected={false} />);
    expect(screen.getByTestId("factory-console-panel")).toBeInTheDocument();
  });

  it("displays run status", () => {
    render(<FactoryConsolePanel {...defaultProps} runStatus="running" />);
    expect(screen.getByTestId("factory-console-panel")).toBeInTheDocument();
  });

  it("displays counts summary", () => {
    const counts = { total: 5, completed: 2, failed: 1, cancelled: 0, running: 1, queued: 1 };
    render(<FactoryConsolePanel {...defaultProps} counts={counts} />);
    expect(screen.getByTestId("factory-console-panel")).toBeInTheDocument();
  });

  it("handles null runId gracefully", () => {
    render(<FactoryConsolePanel {...defaultProps} runId={null} runStatus={null} />);
    expect(screen.getByTestId("factory-console-panel")).toBeInTheDocument();
  });
});
