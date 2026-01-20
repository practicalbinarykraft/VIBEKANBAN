/** AutopilotReadinessPanel Tests (PR-81) */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutopilotReadinessPanel } from "../autopilot-readiness-panel";
import type { AutopilotBlocker } from "@/hooks/useAutopilotReadiness";

describe("AutopilotReadinessPanel", () => {
  it("does NOT render when ready=true", () => {
    render(<AutopilotReadinessPanel ready={true} blockers={[]} />);
    expect(screen.queryByTestId("autopilot-readiness-panel")).not.toBeInTheDocument();
  });

  it("renders panel when ready=false", () => {
    render(<AutopilotReadinessPanel ready={false} blockers={[{ type: "NO_TASKS" }]} />);
    expect(screen.getByTestId("autopilot-readiness-panel")).toBeInTheDocument();
  });

  it("renders NO_TASKS blocker", () => {
    render(<AutopilotReadinessPanel ready={false} blockers={[{ type: "NO_TASKS" }]} />);
    expect(screen.getByTestId("autopilot-blocker")).toBeInTheDocument();
  });

  it("renders AI_NOT_CONFIGURED blocker", () => {
    render(<AutopilotReadinessPanel ready={false} blockers={[{ type: "AI_NOT_CONFIGURED" }]} />);
    expect(screen.getByTestId("autopilot-blocker")).toBeInTheDocument();
  });

  it("renders BUDGET_EXCEEDED blocker with amounts", () => {
    render(<AutopilotReadinessPanel ready={false} blockers={[{ type: "BUDGET_EXCEEDED", limitUSD: 100, spendUSD: 120 }]} />);
    expect(screen.getByTestId("autopilot-blocker")).toBeInTheDocument();
  });

  it("renders AUTOPILOT_RUNNING blocker", () => {
    render(<AutopilotReadinessPanel ready={false} blockers={[{ type: "AUTOPILOT_RUNNING" }]} />);
    expect(screen.getByTestId("autopilot-blocker")).toBeInTheDocument();
  });

  it("renders REPO_NOT_READY blocker", () => {
    render(<AutopilotReadinessPanel ready={false} blockers={[{ type: "REPO_NOT_READY" }]} />);
    expect(screen.getByTestId("autopilot-blocker")).toBeInTheDocument();
  });

  it("renders multiple blockers", () => {
    const blockers: AutopilotBlocker[] = [{ type: "NO_TASKS" }, { type: "AI_NOT_CONFIGURED" }];
    render(<AutopilotReadinessPanel ready={false} blockers={blockers} />);
    expect(screen.getAllByTestId("autopilot-blocker")).toHaveLength(2);
  });

  it("does NOT render when blockers array is empty", () => {
    render(<AutopilotReadinessPanel ready={false} blockers={[]} />);
    expect(screen.queryByTestId("autopilot-readiness-panel")).not.toBeInTheDocument();
  });
});
