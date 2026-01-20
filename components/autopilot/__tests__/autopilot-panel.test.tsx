/**
 * Unit tests for AutopilotPanel (PR-61)
 *
 * Tests:
 * - Renders all status states
 * - Buttons disabled when no callbacks
 * - Buttons enabled and callable when callbacks provided
 * - Handles null/undefined data gracefully
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AutopilotPanel } from "../autopilot-panel";

describe("AutopilotPanel", () => {
  it("renders IDLE status", () => {
    render(<AutopilotPanel status="IDLE" />);

    expect(screen.getByText("Autopilot")).toBeInTheDocument();
    expect(screen.getByTestId("status-badge")).toHaveTextContent("IDLE");
  });

  it("renders RUNNING status", () => {
    render(<AutopilotPanel status="RUNNING" />);

    expect(screen.getByTestId("status-badge")).toHaveTextContent("RUNNING");
  });

  it("renders FAILED status", () => {
    render(<AutopilotPanel status="FAILED" lastError="Something went wrong" />);

    expect(screen.getByTestId("status-badge")).toHaveTextContent("FAILED");
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders DONE status", () => {
    render(<AutopilotPanel status="DONE" />);

    expect(screen.getByTestId("status-badge")).toHaveTextContent("DONE");
  });

  it("disables Start button when no onStart callback", () => {
    render(<AutopilotPanel status="IDLE" />);

    const startBtn = screen.getByTestId("start-btn");
    expect(startBtn).toBeDisabled();
  });

  it("disables Stop button when no onStop callback", () => {
    render(<AutopilotPanel status="RUNNING" />);

    const stopBtn = screen.getByTestId("stop-btn");
    expect(stopBtn).toBeDisabled();
  });

  it("enables Start button and calls onStart when clicked", () => {
    const onStart = vi.fn();
    render(<AutopilotPanel status="IDLE" onStart={onStart} />);

    const startBtn = screen.getByTestId("start-btn");
    expect(startBtn).not.toBeDisabled();

    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("enables Stop button and calls onStop when clicked", () => {
    const onStop = vi.fn();
    render(<AutopilotPanel status="RUNNING" onStop={onStop} />);

    const stopBtn = screen.getByTestId("stop-btn");
    expect(stopBtn).not.toBeDisabled();

    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("shows lastRunAt when provided", () => {
    render(<AutopilotPanel status="DONE" lastRunAt="2026-01-19T10:00:00.000Z" />);

    expect(screen.getByTestId("last-run")).toBeInTheDocument();
  });

  it("shows attemptCount when provided", () => {
    render(<AutopilotPanel status="DONE" attemptCount={5} />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("handles null/undefined data without crashing", () => {
    render(
      <AutopilotPanel
        status="IDLE"
        lastRunAt={null}
        lastError={null}
        attemptCount={null}
        attempts={null}
      />
    );

    expect(screen.getByText("Autopilot")).toBeInTheDocument();
  });

  it("hides Stop button when status is IDLE", () => {
    render(<AutopilotPanel status="IDLE" onStop={() => {}} />);

    expect(screen.queryByTestId("stop-btn")).not.toBeInTheDocument();
  });

  it("hides Start button when status is RUNNING", () => {
    render(<AutopilotPanel status="RUNNING" onStart={() => {}} />);

    expect(screen.queryByTestId("start-btn")).not.toBeInTheDocument();
  });

  // PR-64: STOPPED status and Retry button tests
  it("renders STOPPED status", () => {
    render(<AutopilotPanel status="STOPPED" />);

    expect(screen.getByTestId("status-badge")).toHaveTextContent("STOPPED");
  });

  it("shows Retry button when status is FAILED", () => {
    render(<AutopilotPanel status="FAILED" />);

    expect(screen.getByTestId("retry-btn")).toBeInTheDocument();
  });

  it("shows Retry button when status is STOPPED", () => {
    render(<AutopilotPanel status="STOPPED" />);

    expect(screen.getByTestId("retry-btn")).toBeInTheDocument();
  });

  it("disables Retry button when no onRetry callback", () => {
    render(<AutopilotPanel status="FAILED" />);

    const retryBtn = screen.getByTestId("retry-btn");
    expect(retryBtn).toBeDisabled();
  });

  it("enables Retry button and calls onRetry when clicked", () => {
    const onRetry = vi.fn();
    render(<AutopilotPanel status="FAILED" onRetry={onRetry} />);

    const retryBtn = screen.getByTestId("retry-btn");
    expect(retryBtn).not.toBeDisabled();

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("hides Retry button when status is IDLE", () => {
    render(<AutopilotPanel status="IDLE" onRetry={() => {}} />);

    expect(screen.queryByTestId("retry-btn")).not.toBeInTheDocument();
  });

  it("hides Retry button when status is RUNNING", () => {
    render(<AutopilotPanel status="RUNNING" onRetry={() => {}} />);

    expect(screen.queryByTestId("retry-btn")).not.toBeInTheDocument();
  });
});
