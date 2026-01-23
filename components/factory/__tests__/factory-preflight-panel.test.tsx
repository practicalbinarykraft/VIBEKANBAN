/** Factory Preflight Panel Tests (PR-101) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FactoryPreflightPanel, type PreflightDisplayResult } from "../factory-preflight-panel";

const allPassed: PreflightDisplayResult = {
  ok: true,
  checks: [
    { name: "repo_clean", label: "Repository clean", passed: true },
    { name: "default_branch", label: "Default branch exists", passed: true },
    { name: "gh_cli", label: "GitHub CLI available", passed: true },
    { name: "push_permission", label: "Push permission", passed: true },
    { name: "budget", label: "Budget OK", passed: true },
    { name: "no_active_run", label: "No active run", passed: true },
    { name: "config_valid", label: "Config valid", passed: true },
  ],
};

const oneFailed: PreflightDisplayResult = {
  ok: false,
  errorCode: "FACTORY_REPO_DIRTY",
  errorMessage: "Repository has uncommitted changes",
  checks: [
    { name: "config_valid", label: "Config valid", passed: true },
    { name: "repo_clean", label: "Repository clean", passed: false },
  ],
};

describe("FactoryPreflightPanel", () => {
  const defaultProps = {
    result: null as PreflightDisplayResult | null,
    isRunning: false,
    onRunPreflight: vi.fn(),
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders panel with data-testid", () => {
    render(<FactoryPreflightPanel {...defaultProps} />);
    expect(screen.getByTestId("factory-preflight-panel")).toBeInTheDocument();
  });

  it("renders 'Run Preflight' button when no result", () => {
    render(<FactoryPreflightPanel {...defaultProps} />);
    expect(screen.getByTestId("run-preflight-button")).toBeInTheDocument();
  });

  it("calls onRunPreflight when button clicked", () => {
    const onRunPreflight = vi.fn();
    render(<FactoryPreflightPanel {...defaultProps} onRunPreflight={onRunPreflight} />);

    fireEvent.click(screen.getByTestId("run-preflight-button"));

    expect(onRunPreflight).toHaveBeenCalled();
  });

  it("disables button when isRunning=true", () => {
    render(<FactoryPreflightPanel {...defaultProps} isRunning={true} />);
    expect(screen.getByTestId("run-preflight-button")).toBeDisabled();
  });

  it("shows spinner when isRunning=true", () => {
    render(<FactoryPreflightPanel {...defaultProps} isRunning={true} />);
    expect(screen.getByTestId("preflight-spinner")).toBeInTheDocument();
  });

  it("shows success state when all checks passed", () => {
    render(<FactoryPreflightPanel {...defaultProps} result={allPassed} />);
    expect(screen.getByTestId("preflight-success")).toBeInTheDocument();
  });

  it("shows failure state when check failed", () => {
    render(<FactoryPreflightPanel {...defaultProps} result={oneFailed} />);
    expect(screen.getByTestId("preflight-failure")).toBeInTheDocument();
  });

  it("displays error message when check failed", () => {
    render(<FactoryPreflightPanel {...defaultProps} result={oneFailed} />);
    expect(screen.getByText(/uncommitted changes/i)).toBeInTheDocument();
  });

  it("displays check items with status icons", () => {
    render(<FactoryPreflightPanel {...defaultProps} result={allPassed} />);
    const checkItems = screen.getAllByTestId(/^preflight-check-/);
    expect(checkItems.length).toBeGreaterThan(0);
  });

  it("shows dismiss button when result exists", () => {
    render(<FactoryPreflightPanel {...defaultProps} result={allPassed} />);
    expect(screen.getByTestId("preflight-dismiss")).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss clicked", () => {
    const onDismiss = vi.fn();
    render(<FactoryPreflightPanel {...defaultProps} result={allPassed} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByTestId("preflight-dismiss"));

    expect(onDismiss).toHaveBeenCalled();
  });

  it("shows failed check with amber indicator", () => {
    render(<FactoryPreflightPanel {...defaultProps} result={oneFailed} />);
    const failedCheck = screen.getByTestId("preflight-check-repo_clean");
    expect(failedCheck).toHaveClass("bg-amber-50");
  });

  it("shows passed check with green indicator", () => {
    render(<FactoryPreflightPanel {...defaultProps} result={allPassed} />);
    const passedCheck = screen.getByTestId("preflight-check-repo_clean");
    expect(passedCheck).toHaveClass("bg-green-50");
  });
});
