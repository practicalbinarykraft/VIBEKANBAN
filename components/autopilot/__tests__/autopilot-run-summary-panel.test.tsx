/**
 * AutopilotRunSummaryPanel Component Tests (PR-79)
 * Tests the summary panel display for completed/failed/cancelled runs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AutopilotRunSummaryPanel } from "../autopilot-run-summary-panel";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("AutopilotRunSummaryPanel", () => {
  const defaultProps = {
    projectId: "test-project",
    runId: "run-123",
    status: "COMPLETED" as const,
    onRunAgain: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders autopilot-run-summary-panel", () => {
    render(<AutopilotRunSummaryPanel {...defaultProps} />);
    expect(screen.getByTestId("autopilot-run-summary-panel")).toBeInTheDocument();
  });

  it("renders autopilot-summary-title", () => {
    render(<AutopilotRunSummaryPanel {...defaultProps} />);
    expect(screen.getByTestId("autopilot-summary-title")).toBeInTheDocument();
  });

  it("renders autopilot-summary-actions", () => {
    render(<AutopilotRunSummaryPanel {...defaultProps} />);
    expect(screen.getByTestId("autopilot-summary-actions")).toBeInTheDocument();
  });

  describe("COMPLETED status", () => {
    it("shows View run details button", () => {
      render(<AutopilotRunSummaryPanel {...defaultProps} status="COMPLETED" />);
      const link = screen.getByRole("link", { name: /view run details/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/projects/test-project/autopilot/runs/run-123");
    });

    it("shows Run again button", () => {
      render(<AutopilotRunSummaryPanel {...defaultProps} status="COMPLETED" />);
      expect(screen.getByRole("button", { name: /run again/i })).toBeInTheDocument();
    });

    it("shows Open PR button when prUrl is provided", () => {
      render(
        <AutopilotRunSummaryPanel
          {...defaultProps}
          status="COMPLETED"
          prUrl="https://github.com/test/pr/1"
        />
      );
      const prLink = screen.getByRole("link", { name: /open pr/i });
      expect(prLink).toBeInTheDocument();
      expect(prLink).toHaveAttribute("href", "https://github.com/test/pr/1");
      expect(prLink).toHaveAttribute("target", "_blank");
    });

    it("does NOT show Open PR button when prUrl is null", () => {
      render(<AutopilotRunSummaryPanel {...defaultProps} status="COMPLETED" prUrl={null} />);
      expect(screen.queryByRole("link", { name: /open pr/i })).not.toBeInTheDocument();
    });

    it("calls onRunAgain when Run again is clicked", () => {
      const onRunAgain = vi.fn();
      render(<AutopilotRunSummaryPanel {...defaultProps} status="COMPLETED" onRunAgain={onRunAgain} />);
      fireEvent.click(screen.getByRole("button", { name: /run again/i }));
      expect(onRunAgain).toHaveBeenCalledTimes(1);
    });
  });

  describe("FAILED status", () => {
    it("shows View error details button", () => {
      render(<AutopilotRunSummaryPanel {...defaultProps} status="FAILED" />);
      const link = screen.getByRole("link", { name: /view error details/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/projects/test-project/autopilot/runs/run-123");
    });

    it("shows Retry button", () => {
      render(<AutopilotRunSummaryPanel {...defaultProps} status="FAILED" />);
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("calls onRunAgain when Retry is clicked", () => {
      const onRunAgain = vi.fn();
      render(<AutopilotRunSummaryPanel {...defaultProps} status="FAILED" onRunAgain={onRunAgain} />);
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(onRunAgain).toHaveBeenCalledTimes(1);
    });
  });

  describe("CANCELLED status", () => {
    it("shows Run again button", () => {
      render(<AutopilotRunSummaryPanel {...defaultProps} status="CANCELLED" />);
      expect(screen.getByRole("button", { name: /run again/i })).toBeInTheDocument();
    });

    it("shows View run details button", () => {
      render(<AutopilotRunSummaryPanel {...defaultProps} status="CANCELLED" />);
      const link = screen.getByRole("link", { name: /view run details/i });
      expect(link).toBeInTheDocument();
    });

    it("calls onRunAgain when Run again is clicked", () => {
      const onRunAgain = vi.fn();
      render(<AutopilotRunSummaryPanel {...defaultProps} status="CANCELLED" onRunAgain={onRunAgain} />);
      fireEvent.click(screen.getByRole("button", { name: /run again/i }));
      expect(onRunAgain).toHaveBeenCalledTimes(1);
    });
  });

  it("displays custom summaryText when provided", () => {
    render(
      <AutopilotRunSummaryPanel
        {...defaultProps}
        status="FAILED"
        summaryText="Budget limit exceeded"
      />
    );
    expect(screen.getByText("Budget limit exceeded")).toBeInTheDocument();
  });
});
