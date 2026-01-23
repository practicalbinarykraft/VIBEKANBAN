import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FactoryHandoffModal } from "../factory-handoff-modal";

describe("FactoryHandoffModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    projectId: "test-project",
    taskCount: 5,
  };

  it("renders when open", () => {
    render(<FactoryHandoffModal {...defaultProps} />);
    expect(screen.getByTestId("factory-handoff-modal")).toBeInTheDocument();
    expect(screen.getByText("Tasks Created!")).toBeInTheDocument();
  });

  it("shows task count", () => {
    render(<FactoryHandoffModal {...defaultProps} taskCount={12} />);
    expect(screen.getByText("12 tasks created")).toBeInTheDocument();
  });

  it("shows next steps", () => {
    render(<FactoryHandoffModal {...defaultProps} />);
    expect(screen.getByText("Next step: Start Factory")).toBeInTheDocument();
    expect(screen.getByText(/Go to Tasks tab/)).toBeInTheDocument();
  });

  it("explains what happened", () => {
    render(<FactoryHandoffModal {...defaultProps} />);
    expect(screen.getByText("What happened:")).toBeInTheDocument();
    expect(screen.getByText(/Plan is now locked/)).toBeInTheDocument();
    expect(screen.getByText(/Tasks appear in the Tasks tab/)).toBeInTheDocument();
  });

  it("calls onViewFactory when Go to Tasks clicked", () => {
    const onViewFactory = vi.fn();
    render(
      <FactoryHandoffModal {...defaultProps} onViewFactory={onViewFactory} />
    );
    fireEvent.click(screen.getByText("Go to Tasks"));
    expect(onViewFactory).toHaveBeenCalledTimes(1);
  });

  it("calls onStayInPlanning when Stay in Planning clicked", () => {
    const onStayInPlanning = vi.fn();
    render(
      <FactoryHandoffModal {...defaultProps} onStayInPlanning={onStayInPlanning} />
    );
    fireEvent.click(screen.getByText("Stay in Planning"));
    expect(onStayInPlanning).toHaveBeenCalledTimes(1);
  });

  it("shows factory run link when factoryRunId provided", () => {
    render(
      <FactoryHandoffModal
        {...defaultProps}
        factoryRunId="run-123"
      />
    );
    const link = screen.getByText("View Factory Run Details");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "/projects/test-project/factory/runs/run-123"
    );
  });

  it("does not render when closed", () => {
    render(<FactoryHandoffModal {...defaultProps} open={false} />);
    expect(screen.queryByTestId("factory-handoff-modal")).not.toBeInTheDocument();
  });
});
