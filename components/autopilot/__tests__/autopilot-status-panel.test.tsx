/** AutopilotStatusPanel Tests (PR-68) */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AutopilotStatusPanel } from "../autopilot-status-panel";

describe("AutopilotStatusPanel", () => {
  const defaultProps = {
    status: "idle" as const,
    sessionId: null,
    currentTaskId: null,
    errorCode: null,
    isLoading: false,
    isStarting: false,
    isStopping: false,
    onStart: vi.fn(),
    onStop: vi.fn(),
  };

  it("shows loading state", () => {
    render(<AutopilotStatusPanel {...defaultProps} isLoading={true} />);
    expect(screen.getByText(/Loading autopilot status/)).toBeInTheDocument();
  });

  it("shows idle status with no session message", () => {
    render(<AutopilotStatusPanel {...defaultProps} />);
    expect(screen.getByTestId("autopilot-status-badge")).toHaveTextContent("Idle");
    expect(screen.getByText(/Create a plan in Planning tab/)).toBeInTheDocument();
  });

  it("shows start button when idle with sessionId", () => {
    render(<AutopilotStatusPanel {...defaultProps} sessionId="s-1" />);
    expect(screen.getByTestId("autopilot-start-button")).toBeInTheDocument();
  });

  it("calls onStart when start clicked", () => {
    const onStart = vi.fn();
    render(<AutopilotStatusPanel {...defaultProps} sessionId="s-1" onStart={onStart} />);
    fireEvent.click(screen.getByTestId("autopilot-start-button"));
    expect(onStart).toHaveBeenCalled();
  });

  it("shows stop button when running", () => {
    render(<AutopilotStatusPanel {...defaultProps} status="running" sessionId="s-1" />);
    expect(screen.getByTestId("autopilot-stop-button")).toBeInTheDocument();
  });

  it("calls onStop when stop clicked", () => {
    const onStop = vi.fn();
    render(<AutopilotStatusPanel {...defaultProps} status="running" sessionId="s-1" onStop={onStop} />);
    fireEvent.click(screen.getByTestId("autopilot-stop-button"));
    expect(onStop).toHaveBeenCalled();
  });

  it("shows current task when running", () => {
    render(<AutopilotStatusPanel {...defaultProps} status="running" sessionId="s-1" currentTaskId="task-abc-123-def" />);
    expect(screen.getByText(/task-abc/)).toBeInTheDocument();
  });

  it("shows error code when present", () => {
    render(<AutopilotStatusPanel {...defaultProps} status="failed" errorCode="EXECUTION_ERROR" />);
    expect(screen.getByText("EXECUTION_ERROR")).toBeInTheDocument();
  });

  it("disables start button while starting", () => {
    render(<AutopilotStatusPanel {...defaultProps} sessionId="s-1" isStarting={true} />);
    expect(screen.getByTestId("autopilot-start-button")).toBeDisabled();
    expect(screen.getByText("Starting...")).toBeInTheDocument();
  });

  it("disables stop button while stopping", () => {
    render(<AutopilotStatusPanel {...defaultProps} status="running" sessionId="s-1" isStopping={true} />);
    expect(screen.getByTestId("autopilot-stop-button")).toBeDisabled();
    expect(screen.getByText("Stopping...")).toBeInTheDocument();
  });

  it("shows start button for stopped status with sessionId", () => {
    render(<AutopilotStatusPanel {...defaultProps} status="stopped" sessionId="s-1" />);
    expect(screen.getByTestId("autopilot-start-button")).toBeInTheDocument();
  });

  it("has autopilot-status-panel data-testid", () => {
    render(<AutopilotStatusPanel {...defaultProps} />);
    expect(screen.getByTestId("autopilot-status-panel")).toBeInTheDocument();
  });
});
