/** Factory Auto-Fix Panel Tests (PR-99, PR-100) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FactoryAutofixPanel } from "../factory-autofix-panel";

describe("FactoryAutofixPanel", () => {
  const defaultProps = {
    runId: "run-123",
    autofixStatus: { total: 2, used: 0 },
    isLoading: false,
    onRunAutofix: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders panel with data-testid", () => {
    render(<FactoryAutofixPanel {...defaultProps} />);
    expect(screen.getByTestId("factory-autofix-panel")).toBeInTheDocument();
  });

  it("renders diagnostics button", () => {
    render(<FactoryAutofixPanel {...defaultProps} />);
    expect(screen.getByTestId("diagnostics-button")).toBeInTheDocument();
    expect(screen.getByTestId("diagnostics-button")).toHaveTextContent(/diagnostics/i);
  });

  it("renders smart auto-fix button", () => {
    render(<FactoryAutofixPanel {...defaultProps} />);
    expect(screen.getByTestId("autofix-button")).toBeInTheDocument();
    expect(screen.getByTestId("autofix-button")).toHaveTextContent(/smart/i);
  });

  it("shows autofix attempts counter", () => {
    render(<FactoryAutofixPanel {...defaultProps} />);
    expect(screen.getByText(/0.*\/.*2/)).toBeInTheDocument();
  });

  it("calls onRunAutofix with 'diagnostics' mode when diagnostics clicked", () => {
    const onRunAutofix = vi.fn();
    render(<FactoryAutofixPanel {...defaultProps} onRunAutofix={onRunAutofix} />);

    fireEvent.click(screen.getByTestId("diagnostics-button"));

    expect(onRunAutofix).toHaveBeenCalledWith("run-123", "diagnostics");
  });

  it("calls onRunAutofix with 'claude' mode when smart auto-fix clicked", () => {
    const onRunAutofix = vi.fn();
    render(<FactoryAutofixPanel {...defaultProps} onRunAutofix={onRunAutofix} />);

    fireEvent.click(screen.getByTestId("autofix-button"));

    expect(onRunAutofix).toHaveBeenCalledWith("run-123", "claude");
  });

  it("disables both buttons when runId is null", () => {
    render(<FactoryAutofixPanel {...defaultProps} runId={null} />);
    expect(screen.getByTestId("diagnostics-button")).toBeDisabled();
    expect(screen.getByTestId("autofix-button")).toBeDisabled();
  });

  it("disables both buttons when all attempts used", () => {
    render(
      <FactoryAutofixPanel
        {...defaultProps}
        autofixStatus={{ total: 2, used: 2 }}
      />
    );
    expect(screen.getByTestId("diagnostics-button")).toBeDisabled();
    expect(screen.getByTestId("autofix-button")).toBeDisabled();
  });

  it("disables both buttons when isLoading is true", () => {
    render(<FactoryAutofixPanel {...defaultProps} isLoading={true} />);
    expect(screen.getByTestId("diagnostics-button")).toBeDisabled();
    expect(screen.getByTestId("autofix-button")).toBeDisabled();
  });

  it("shows 'already used' text when all attempts used", () => {
    render(
      <FactoryAutofixPanel
        {...defaultProps}
        autofixStatus={{ total: 2, used: 2 }}
      />
    );
    expect(screen.getByText(/all attempts used/i)).toBeInTheDocument();
  });

  it("shows loading spinner when isLoading is true", () => {
    render(<FactoryAutofixPanel {...defaultProps} isLoading={true} />);
    expect(screen.getByTestId("autofix-loading")).toBeInTheDocument();
  });

  it("shows zero state when total is 0", () => {
    render(
      <FactoryAutofixPanel
        {...defaultProps}
        autofixStatus={{ total: 0, used: 0 }}
      />
    );
    expect(screen.getByText(/no failed prs/i)).toBeInTheDocument();
  });
});
