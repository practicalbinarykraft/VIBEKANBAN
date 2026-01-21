/** FactoryRerunPanel Tests (PR-93) */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FactoryRerunPanel } from "../factory-rerun-panel";

const mockPush = vi.fn();
const mockRerunFailed = vi.fn();
const mockRerunSelected = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

vi.mock("@/hooks/useFactoryRerun", () => ({
  useFactoryRerun: vi.fn(() => ({
    rerunFailed: mockRerunFailed,
    rerunSelected: mockRerunSelected,
    isLoading: false,
    error: null,
    lastResult: null,
  })),
}));

describe("FactoryRerunPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRerunFailed.mockResolvedValue({ started: false });
    mockRerunSelected.mockResolvedValue({ started: false });
  });

  it("renders max parallel input with default value 3", () => {
    render(<FactoryRerunPanel projectId="p1" runId="r1" failedCount={2} selectedTaskIds={[]} />);
    const input = screen.getByTestId("max-parallel-input") as HTMLInputElement;
    expect(input.value).toBe("3");
  });

  it("renders rerun failed button with count", () => {
    render(<FactoryRerunPanel projectId="p1" runId="r1" failedCount={5} selectedTaskIds={[]} />);
    expect(screen.getByText(/Rerun failed \(5\)/)).toBeInTheDocument();
  });

  it("renders rerun selected button with count", () => {
    render(<FactoryRerunPanel projectId="p1" runId="r1" failedCount={0} selectedTaskIds={["t1", "t2"]} />);
    expect(screen.getByText(/Rerun selected \(2\)/)).toBeInTheDocument();
  });

  it("disables rerun failed button when failedCount is 0", () => {
    render(<FactoryRerunPanel projectId="p1" runId="r1" failedCount={0} selectedTaskIds={[]} />);
    expect(screen.getByTestId("rerun-failed-button")).toBeDisabled();
  });

  it("disables rerun selected button when selectedTaskIds is empty", () => {
    render(<FactoryRerunPanel projectId="p1" runId="r1" failedCount={2} selectedTaskIds={[]} />);
    expect(screen.getByTestId("rerun-selected-button")).toBeDisabled();
  });

  it("enables rerun failed button when failedCount > 0", () => {
    render(<FactoryRerunPanel projectId="p1" runId="r1" failedCount={3} selectedTaskIds={[]} />);
    expect(screen.getByTestId("rerun-failed-button")).not.toBeDisabled();
  });

  it("enables rerun selected button when selectedTaskIds has items", () => {
    render(<FactoryRerunPanel projectId="p1" runId="r1" failedCount={0} selectedTaskIds={["t1"]} />);
    expect(screen.getByTestId("rerun-selected-button")).not.toBeDisabled();
  });

  it("calls rerunFailed with correct params on click", async () => {
    mockRerunFailed.mockResolvedValue({ started: true, newRunId: "new-run-1" });
    render(<FactoryRerunPanel projectId="p1" runId="r1" failedCount={2} selectedTaskIds={[]} />);
    fireEvent.click(screen.getByTestId("rerun-failed-button"));
    await waitFor(() => {
      expect(mockRerunFailed).toHaveBeenCalledWith({
        projectId: "p1",
        sourceRunId: "r1",
        maxParallel: 3,
      });
    });
  });

  it("calls rerunSelected with correct params on click", async () => {
    mockRerunSelected.mockResolvedValue({ started: true, newRunId: "new-run-2" });
    render(<FactoryRerunPanel projectId="p1" runId="r1" failedCount={0} selectedTaskIds={["t1", "t2"]} />);
    fireEvent.click(screen.getByTestId("rerun-selected-button"));
    await waitFor(() => {
      expect(mockRerunSelected).toHaveBeenCalledWith({
        projectId: "p1",
        sourceRunId: "r1",
        selectedTaskIds: ["t1", "t2"],
        maxParallel: 3,
      });
    });
  });

  it("navigates to new run on successful rerun", async () => {
    mockRerunFailed.mockResolvedValue({ started: true, newRunId: "new-run-123" });
    render(<FactoryRerunPanel projectId="proj-x" runId="r1" failedCount={1} selectedTaskIds={[]} />);
    fireEvent.click(screen.getByTestId("rerun-failed-button"));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/projects/proj-x/factory/runs/new-run-123");
    });
  });

  it("does not navigate when rerun fails", async () => {
    mockRerunFailed.mockResolvedValue({ started: false, error: "NO_TASKS_TO_RERUN" });
    render(<FactoryRerunPanel projectId="p1" runId="r1" failedCount={1} selectedTaskIds={[]} />);
    fireEvent.click(screen.getByTestId("rerun-failed-button"));
    await waitFor(() => {
      expect(mockRerunFailed).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
