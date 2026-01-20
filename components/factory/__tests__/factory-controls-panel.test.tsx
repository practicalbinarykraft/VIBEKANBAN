/** FactoryControlsPanel Tests (PR-83) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FactoryControlsPanel } from "../factory-controls-panel";

describe("FactoryControlsPanel", () => {
  const defaultProps = {
    status: "idle" as const,
    total: 0, completed: 0, failed: 0, cancelled: 0, running: 0, queued: 0,
    runId: null,
    isLoading: false,
    isStarting: false,
    isStopping: false,
    error: null,
    onStart: vi.fn(),
    onStop: vi.fn(),
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it("renders panel with data-testid", () => {
    render(<FactoryControlsPanel {...defaultProps} />);
    expect(screen.getByTestId("factory-controls-panel")).toBeInTheDocument();
  });

  it("shows Start button enabled when IDLE", () => {
    render(<FactoryControlsPanel {...defaultProps} status="idle" />);
    const startBtn = screen.getByTestId("factory-start-button");
    expect(startBtn).toBeInTheDocument();
    expect(startBtn).not.toBeDisabled();
  });

  it("shows Stop button disabled when IDLE", () => {
    render(<FactoryControlsPanel {...defaultProps} status="idle" />);
    const stopBtn = screen.getByTestId("factory-stop-button");
    expect(stopBtn).toBeDisabled();
  });

  it("shows Stop button enabled when RUNNING", () => {
    render(<FactoryControlsPanel {...defaultProps} status="running" running={2} />);
    const stopBtn = screen.getByTestId("factory-stop-button");
    expect(stopBtn).not.toBeDisabled();
  });

  it("shows Start button disabled when RUNNING", () => {
    render(<FactoryControlsPanel {...defaultProps} status="running" running={2} />);
    const startBtn = screen.getByTestId("factory-start-button");
    expect(startBtn).toBeDisabled();
  });

  it("shows maxParallel input", () => {
    render(<FactoryControlsPanel {...defaultProps} />);
    expect(screen.getByTestId("factory-max-parallel-input")).toBeInTheDocument();
  });

  it("validates maxParallel min value (1)", () => {
    render(<FactoryControlsPanel {...defaultProps} />);
    const input = screen.getByTestId("factory-max-parallel-input") as HTMLInputElement;
    expect(input.min).toBe("1");
  });

  it("validates maxParallel max value (20)", () => {
    render(<FactoryControlsPanel {...defaultProps} />);
    const input = screen.getByTestId("factory-max-parallel-input") as HTMLInputElement;
    expect(input.max).toBe("20");
  });

  it("calls onStart with maxParallel when Start clicked", () => {
    const onStart = vi.fn();
    render(<FactoryControlsPanel {...defaultProps} onStart={onStart} />);
    const input = screen.getByTestId("factory-max-parallel-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.click(screen.getByTestId("factory-start-button"));
    expect(onStart).toHaveBeenCalledWith(5);
  });

  it("calls onStop when Stop clicked", () => {
    const onStop = vi.fn();
    render(<FactoryControlsPanel {...defaultProps} status="running" running={1} onStop={onStop} />);
    fireEvent.click(screen.getByTestId("factory-stop-button"));
    expect(onStop).toHaveBeenCalled();
  });

  it("disables Start when isStarting", () => {
    render(<FactoryControlsPanel {...defaultProps} isStarting={true} />);
    expect(screen.getByTestId("factory-start-button")).toBeDisabled();
  });

  it("disables Stop when isStopping", () => {
    render(<FactoryControlsPanel {...defaultProps} status="running" running={1} isStopping={true} />);
    expect(screen.getByTestId("factory-stop-button")).toBeDisabled();
  });
});
