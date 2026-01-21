/** FactoryAttemptRow Tests (PR-90) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FactoryAttemptRow } from "../factory-attempt-row";
import type { FactoryAttemptResult } from "@/server/services/factory/factory-results.service";

// Mock useAttemptSummary hook
vi.mock("@/hooks/useAttemptSummary", () => ({
  useAttemptSummary: vi.fn(),
}));

import { useAttemptSummary } from "@/hooks/useAttemptSummary";

const mockAttempt: FactoryAttemptResult = {
  taskId: 1,
  attemptId: "a1",
  status: "completed",
  prUrl: "https://github.com/pr/1",
  updatedAt: "2026-01-20T12:00:00Z",
};

describe("FactoryAttemptRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAttemptSummary).mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });
  });

  it("renders Open attempt link", () => {
    render(<FactoryAttemptRow attempt={mockAttempt} projectId="p1" />);
    const openLink = screen.getByTestId("open-attempt-a1");
    expect(openLink).toBeInTheDocument();
    expect(openLink).toHaveAttribute("href", "/projects/p1?task=1&attempt=a1");
  });

  it("renders PR link when present", () => {
    render(<FactoryAttemptRow attempt={mockAttempt} projectId="p1" />);
    const prLink = screen.getByTestId("pr-link-a1");
    expect(prLink).toBeInTheDocument();
    expect(prLink).toHaveAttribute("href", "https://github.com/pr/1");
  });

  it("does not render PR link when absent", () => {
    const attemptWithoutPr = { ...mockAttempt, prUrl: null };
    render(<FactoryAttemptRow attempt={attemptWithoutPr} projectId="p1" />);
    expect(screen.queryByTestId("pr-link-a1")).not.toBeInTheDocument();
  });

  it("renders last log line when hook returns it", () => {
    vi.mocked(useAttemptSummary).mockReturnValue({
      data: {
        attemptId: "a1",
        status: "completed",
        lastLogLine: "Processing complete",
        errorMessage: null,
        updatedAt: "2026-01-20T12:00:00Z",
      },
      loading: false,
      error: null,
    });

    render(<FactoryAttemptRow attempt={mockAttempt} projectId="p1" />);
    const lastLog = screen.getByTestId("last-log-a1");
    expect(lastLog).toBeInTheDocument();
    expect(lastLog).toHaveTextContent("Processing complete");
  });

  it("does not render last log when null", () => {
    vi.mocked(useAttemptSummary).mockReturnValue({
      data: {
        attemptId: "a1",
        status: "completed",
        lastLogLine: null,
        errorMessage: null,
        updatedAt: "2026-01-20T12:00:00Z",
      },
      loading: false,
      error: null,
    });

    render(<FactoryAttemptRow attempt={mockAttempt} projectId="p1" />);
    expect(screen.queryByTestId("last-log-a1")).not.toBeInTheDocument();
  });

  it("renders error when present", () => {
    vi.mocked(useAttemptSummary).mockReturnValue({
      data: {
        attemptId: "a1",
        status: "failed",
        lastLogLine: null,
        errorMessage: "Connection refused",
        updatedAt: "2026-01-20T12:00:00Z",
      },
      loading: false,
      error: null,
    });

    render(<FactoryAttemptRow attempt={mockAttempt} projectId="p1" />);
    const errorEl = screen.getByTestId("error-a1");
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveTextContent("Error: Connection refused");
  });

  it("does not render error when null", () => {
    vi.mocked(useAttemptSummary).mockReturnValue({
      data: {
        attemptId: "a1",
        status: "completed",
        lastLogLine: "Done",
        errorMessage: null,
        updatedAt: "2026-01-20T12:00:00Z",
      },
      loading: false,
      error: null,
    });

    render(<FactoryAttemptRow attempt={mockAttempt} projectId="p1" />);
    expect(screen.queryByTestId("error-a1")).not.toBeInTheDocument();
  });

  it("calls useAttemptSummary with attemptId", () => {
    render(<FactoryAttemptRow attempt={mockAttempt} projectId="p1" />);
    expect(useAttemptSummary).toHaveBeenCalledWith("a1");
  });
});
