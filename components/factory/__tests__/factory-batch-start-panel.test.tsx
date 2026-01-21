/** FactoryBatchStartPanel Tests (PR-87) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FactoryBatchStartPanel } from "../factory-batch-start-panel";

describe("FactoryBatchStartPanel", () => {
  const defaultProps = {
    projectId: "p1",
    selectedTaskIds: [] as string[],
    tasksByStatus: { todo: 5, in_progress: 2, in_review: 1 },
    isFactoryRunning: false,
    isStarting: false,
    onStart: vi.fn(),
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it("renders panel with data-testid", () => {
    render(<FactoryBatchStartPanel {...defaultProps} />);
    expect(screen.getByTestId("factory-batch-start-panel")).toBeInTheDocument();
  });

  it("shows source selector dropdown", () => {
    render(<FactoryBatchStartPanel {...defaultProps} />);
    expect(screen.getByTestId("batch-source-select")).toBeInTheDocument();
  });

  it("disables start button when factory is running", () => {
    render(<FactoryBatchStartPanel {...defaultProps} isFactoryRunning={true} />);
    expect(screen.getByTestId("batch-start-button")).toBeDisabled();
  });

  it("disables start button when isStarting", () => {
    render(<FactoryBatchStartPanel {...defaultProps} isStarting={true} />);
    expect(screen.getByTestId("batch-start-button")).toBeDisabled();
  });

  it("calls onStart with column source and status", async () => {
    const onStart = vi.fn();
    render(<FactoryBatchStartPanel {...defaultProps} onStart={onStart} />);

    // Select column source (default)
    fireEvent.click(screen.getByTestId("batch-start-button"));

    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({
      source: "column",
    }));
  });

  it("calls onStart with selection source and task IDs", async () => {
    const onStart = vi.fn();
    render(
      <FactoryBatchStartPanel
        {...defaultProps}
        selectedTaskIds={["t1", "t2"]}
        onStart={onStart}
      />
    );

    // Change to selection source
    fireEvent.change(screen.getByTestId("batch-source-select"), { target: { value: "selection" } });
    fireEvent.click(screen.getByTestId("batch-start-button"));

    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({
      source: "selection",
      taskIds: ["t1", "t2"],
    }));
  });

  it("shows task count for column source", () => {
    render(<FactoryBatchStartPanel {...defaultProps} />);
    // Should show count for todo column by default
    expect(screen.getByText(/5 tasks/i)).toBeInTheDocument();
  });

  it("shows task count for selection source", () => {
    render(
      <FactoryBatchStartPanel {...defaultProps} selectedTaskIds={["t1", "t2", "t3"]} />
    );
    fireEvent.change(screen.getByTestId("batch-source-select"), { target: { value: "selection" } });
    expect(screen.getByText(/3 tasks/i)).toBeInTheDocument();
  });

  it("disables start when no tasks available", () => {
    render(<FactoryBatchStartPanel {...defaultProps} tasksByStatus={{ todo: 0, in_progress: 0, in_review: 0 }} />);
    expect(screen.getByTestId("batch-start-button")).toBeDisabled();
  });

  // PR-103: Agent profile dropdown tests
  describe("agent profile selection", () => {
    it("renders agent profile selector", () => {
      render(<FactoryBatchStartPanel {...defaultProps} />);
      expect(screen.getByTestId("batch-agent-select")).toBeInTheDocument();
    });

    it("shows default agent profile label", () => {
      render(<FactoryBatchStartPanel {...defaultProps} />);
      const select = screen.getByTestId("batch-agent-select");
      expect(select).toHaveTextContent(/Claude/i);
    });

    it("includes agentProfileId in onStart callback", () => {
      const onStart = vi.fn();
      render(<FactoryBatchStartPanel {...defaultProps} onStart={onStart} />);

      fireEvent.click(screen.getByTestId("batch-start-button"));

      expect(onStart).toHaveBeenCalledWith(
        expect.objectContaining({
          agentProfileId: expect.any(String),
        })
      );
    });

    it("passes selected profile ID to onStart", () => {
      const onStart = vi.fn();
      render(<FactoryBatchStartPanel {...defaultProps} onStart={onStart} />);

      // Change agent profile
      fireEvent.change(screen.getByTestId("batch-agent-select"), { target: { value: "mock" } });
      fireEvent.click(screen.getByTestId("batch-start-button"));

      expect(onStart).toHaveBeenCalledWith(
        expect.objectContaining({
          agentProfileId: "mock",
        })
      );
    });
  });
});
