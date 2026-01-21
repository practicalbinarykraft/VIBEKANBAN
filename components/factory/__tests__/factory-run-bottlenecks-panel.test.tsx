/** Factory Run Bottlenecks Panel Tests (PR-96) - TDD first */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FactoryRunBottlenecksPanel } from "../factory-run-bottlenecks-panel";
import type { BottleneckHint } from "@/server/services/factory/factory-run-bottlenecks";

describe("FactoryRunBottlenecksPanel", () => {
  // Test 1: empty hints → nothing rendered
  it("renders nothing when hints array is empty", () => {
    const { container } = render(<FactoryRunBottlenecksPanel hints={[]} />);
    expect(container.firstChild).toBeNull();
  });

  // Test 2: renders panel with data-testid
  it("renders panel with data-testid when hints present", () => {
    const hints: BottleneckHint[] = [
      { code: "LOW_PARALLELISM", severity: "info", title: "Low parallelism", detail: "Consider increasing maxParallel" },
    ];
    render(<FactoryRunBottlenecksPanel hints={hints} />);
    expect(screen.getByTestId("bottlenecks-panel")).toBeInTheDocument();
  });

  // Test 3: renders critical hint with correct styling
  it("renders critical hint with critical styling", () => {
    const hints: BottleneckHint[] = [
      { code: "HIGH_FAILURE_RATE", severity: "critical", title: "High failure rate", detail: "50% of finished attempts failed" },
    ];
    render(<FactoryRunBottlenecksPanel hints={hints} />);
    const hint = screen.getByTestId("bottleneck-hint-HIGH_FAILURE_RATE");
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveAttribute("data-severity", "critical");
    expect(screen.getByText("High failure rate")).toBeInTheDocument();
    expect(screen.getByText("50% of finished attempts failed")).toBeInTheDocument();
  });

  // Test 4: renders warning hint with correct styling
  it("renders warning hint with warning styling", () => {
    const hints: BottleneckHint[] = [
      { code: "LOW_THROUGHPUT", severity: "warning", title: "Low throughput", detail: "Only 0.15 tasks/min" },
    ];
    render(<FactoryRunBottlenecksPanel hints={hints} />);
    const hint = screen.getByTestId("bottleneck-hint-LOW_THROUGHPUT");
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveAttribute("data-severity", "warning");
  });

  // Test 5: renders info hint with correct styling
  it("renders info hint with info styling", () => {
    const hints: BottleneckHint[] = [
      { code: "LOW_PARALLELISM", severity: "info", title: "Low parallelism", detail: "Consider increasing maxParallel" },
    ];
    render(<FactoryRunBottlenecksPanel hints={hints} />);
    const hint = screen.getByTestId("bottleneck-hint-LOW_PARALLELISM");
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveAttribute("data-severity", "info");
  });

  // Test 6: renders multiple hints
  it("renders multiple hints in order", () => {
    const hints: BottleneckHint[] = [
      { code: "NO_PROGRESS", severity: "critical", title: "No progress", detail: "Tasks started but none completed" },
      { code: "HIGH_FAILURE_RATE", severity: "critical", title: "High failure rate", detail: "60% failed" },
      { code: "LOW_PARALLELISM", severity: "info", title: "Low parallelism", detail: "Peak running = 1" },
    ];
    render(<FactoryRunBottlenecksPanel hints={hints} />);
    const allHints = screen.getAllByTestId(/^bottleneck-hint-/);
    expect(allHints).toHaveLength(3);
  });

  // Test 7: displays header
  it("displays 'Issues Detected' header when hints present", () => {
    const hints: BottleneckHint[] = [
      { code: "LOW_PARALLELISM", severity: "info", title: "Low parallelism", detail: "Detail" },
    ];
    render(<FactoryRunBottlenecksPanel hints={hints} />);
    expect(screen.getByText(/issues detected/i)).toBeInTheDocument();
  });
});
