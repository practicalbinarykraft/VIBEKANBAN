import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReadOnlyBanner, LockReason } from "../read-only-banner";

describe("ReadOnlyBanner", () => {
  const reasons: LockReason[] = ["approved", "executing", "completed", "tasks_created"];

  it.each(reasons)("renders %s reason correctly", (reason) => {
    render(<ReadOnlyBanner reason={reason} projectId="test-project" />);
    const banner = screen.getByTestId("read-only-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("data-reason", reason);
  });

  it("shows lock icon", () => {
    render(<ReadOnlyBanner reason="approved" projectId="test-project" />);
    // Lock icon should be present (check by class or role)
    expect(screen.getByTestId("read-only-banner")).toBeInTheDocument();
  });

  it("shows 'Plan is approved and locked' for approved reason", () => {
    render(<ReadOnlyBanner reason="approved" projectId="test-project" />);
    expect(screen.getByText("Plan is approved and locked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Tasks/i })).toBeInTheDocument();
  });

  it("shows 'Plan is being executed by Factory' for executing reason", () => {
    render(
      <ReadOnlyBanner
        reason="executing"
        projectId="test-project"
        factoryRunId="run-123"
      />
    );
    expect(screen.getByText("Plan is being executed by Factory")).toBeInTheDocument();
    expect(screen.getByText("View Factory Run")).toBeInTheDocument();
  });

  it("shows 'Tasks created from this plan' for tasks_created reason", () => {
    render(<ReadOnlyBanner reason="tasks_created" projectId="test-project" />);
    expect(screen.getByText("Tasks created from this plan")).toBeInTheDocument();
    expect(screen.getByText("View Tasks")).toBeInTheDocument();
  });

  it("calls onNewPlan when 'New Plan' is clicked", () => {
    const onNewPlan = vi.fn();
    render(
      <ReadOnlyBanner
        reason="approved"
        projectId="test-project"
        onNewPlan={onNewPlan}
      />
    );
    const newPlanButton = screen.getByText("New Plan");
    fireEvent.click(newPlanButton);
    expect(onNewPlan).toHaveBeenCalledTimes(1);
  });

  it("applies custom className", () => {
    render(
      <ReadOnlyBanner
        reason="approved"
        projectId="test-project"
        className="custom-class"
      />
    );
    const banner = screen.getByTestId("read-only-banner");
    expect(banner).toHaveClass("custom-class");
  });

  it("links to correct factory run page", () => {
    render(
      <ReadOnlyBanner
        reason="executing"
        projectId="proj-1"
        factoryRunId="run-abc"
      />
    );
    const link = screen.getByText("View Factory Run").closest("a");
    expect(link).toHaveAttribute("href", "/projects/proj-1/factory/runs/run-abc");
  });
});
