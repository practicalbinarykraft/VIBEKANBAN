/** FactoryErrorGuidancePanel Tests (PR-92) */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FactoryErrorGuidancePanel } from "../factory-error-guidance-panel";
import { FactoryErrorCode, createFactoryError } from "@/types/factory-errors";
import { getFactoryGuidance } from "@/server/services/factory/factory-error-guidance";

describe("FactoryErrorGuidancePanel", () => {
  const createProps = (code: FactoryErrorCode, message: string) => {
    const error = createFactoryError(code, message);
    const guidance = getFactoryGuidance(error);
    return { error, guidance };
  };

  it("renders panel with data-testid", () => {
    const props = createProps(FactoryErrorCode.BUDGET_EXCEEDED, "Budget limit");
    render(<FactoryErrorGuidancePanel {...props} />);
    expect(screen.getByTestId("factory-error-guidance-panel")).toBeInTheDocument();
  });

  it("shows critical severity badge for critical errors", () => {
    const props = createProps(FactoryErrorCode.BUDGET_EXCEEDED, "Budget limit");
    render(<FactoryErrorGuidancePanel {...props} />);
    expect(screen.getByTestId("severity-badge")).toHaveTextContent(/critical/i);
  });

  it("shows warning severity badge for warning errors", () => {
    const props = createProps(FactoryErrorCode.QUEUE_CORRUPTED, "Queue error");
    render(<FactoryErrorGuidancePanel {...props} />);
    expect(screen.getByTestId("severity-badge")).toHaveTextContent(/warning/i);
  });

  it("shows info severity badge for info errors", () => {
    const props = createProps(FactoryErrorCode.UNKNOWN, "Unknown");
    render(<FactoryErrorGuidancePanel {...props} />);
    expect(screen.getByTestId("severity-badge")).toHaveTextContent(/info/i);
  });

  it("shows guidance title", () => {
    const props = createProps(FactoryErrorCode.AI_NOT_CONFIGURED, "AI not set");
    render(<FactoryErrorGuidancePanel {...props} />);
    expect(screen.getByTestId("guidance-title")).toBeInTheDocument();
    expect(screen.getByTestId("guidance-title").textContent).toBeTruthy();
  });

  it("shows guidance steps as list", () => {
    const props = createProps(FactoryErrorCode.WORKER_CRASHED, "Crash");
    render(<FactoryErrorGuidancePanel {...props} />);
    const steps = screen.getAllByTestId(/^guidance-step-/);
    expect(steps.length).toBeGreaterThanOrEqual(2);
  });

  it("shows error code in details", () => {
    const props = createProps(FactoryErrorCode.ATTEMPT_START_FAILED, "Failed");
    render(<FactoryErrorGuidancePanel {...props} />);
    expect(screen.getByTestId("error-code")).toHaveTextContent("ATTEMPT_START_FAILED");
  });

  it("renders compact variant when specified", () => {
    const props = createProps(FactoryErrorCode.UNKNOWN, "Error");
    render(<FactoryErrorGuidancePanel {...props} compact />);
    expect(screen.getByTestId("factory-error-guidance-panel")).toHaveClass("compact");
  });
});
