import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhaseBanner, PlanningPhase } from "../phase-banner";

describe("PhaseBanner", () => {
  const phases: PlanningPhase[] = [
    "idle",
    "kickoff",
    "awaiting_response",
    "plan_ready",
    "approved",
    "tasks_created",
  ];

  it.each(phases)("renders %s phase correctly", (phase) => {
    render(<PhaseBanner phase={phase} />);
    const banner = screen.getByTestId("phase-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("data-phase", phase);
  });

  it("shows 'Ready to Plan' for idle phase", () => {
    render(<PhaseBanner phase="idle" />);
    expect(screen.getByText("Ready to Plan")).toBeInTheDocument();
    expect(screen.getByText(/Enter project idea/)).toBeInTheDocument();
  });

  it("shows 'Council Discussing' for kickoff phase", () => {
    render(<PhaseBanner phase="kickoff" />);
    expect(screen.getByText("Council Discussing")).toBeInTheDocument();
    expect(screen.getByText(/Edit idea/)).toBeInTheDocument(); // locked item
  });

  it("shows 'Your Input Needed' for awaiting_response phase", () => {
    render(<PhaseBanner phase="awaiting_response" />);
    expect(screen.getByText("Your Input Needed")).toBeInTheDocument();
    expect(screen.getByText(/Answer council questions/)).toBeInTheDocument();
  });

  it("shows 'Plan Ready for Review' for plan_ready phase", () => {
    render(<PhaseBanner phase="plan_ready" />);
    expect(screen.getByText("Plan Ready for Review")).toBeInTheDocument();
    expect(screen.getByText(/Approve plan/)).toBeInTheDocument();
  });

  it("shows 'Plan Approved' for approved phase", () => {
    render(<PhaseBanner phase="approved" />);
    expect(screen.getByText("Plan Approved")).toBeInTheDocument();
    expect(screen.getByText(/Create tasks from plan/)).toBeInTheDocument();
    expect(screen.getByText(/Edit plan/)).toBeInTheDocument(); // locked
  });

  it("shows 'Tasks Created' for tasks_created phase", () => {
    render(<PhaseBanner phase="tasks_created" />);
    expect(screen.getByText("Tasks Created")).toBeInTheDocument();
    expect(screen.getByText(/Start Factory/)).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<PhaseBanner phase="idle" className="custom-class" />);
    const banner = screen.getByTestId("phase-banner");
    expect(banner).toHaveClass("custom-class");
  });
});
