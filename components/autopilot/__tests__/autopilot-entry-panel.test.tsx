/** AutopilotEntryPanel Tests (PR-80) */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AutopilotEntryPanel } from "../autopilot-entry-panel";

const mockFetch = vi.fn();
global.fetch = mockFetch;

interface MockOptions {
  aiStatus?: { realAiEligible: boolean; reason?: string };
  autopilotStatus?: { status: string; runId?: string };
  tasksReady?: boolean;
  startResponse?: { success: boolean };
  stopResponse?: { success: boolean };
}

function setupFetchMocks(opts: MockOptions = {}) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/ai/status"))
      return Promise.resolve({ ok: true, json: () => Promise.resolve(opts.aiStatus ?? { realAiEligible: true }) });
    if (url.includes("/planning/autopilot/status"))
      return Promise.resolve({ ok: true, json: () => Promise.resolve(opts.autopilotStatus ?? { status: "IDLE" }) });
    if (url.includes("/api/projects/") && url.includes("/tasks")) {
      const tasks = opts.tasksReady !== false ? [{ id: "1", status: "todo" }] : [];
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ tasks }) });
    }
    if (url.includes("/autopilot/runs/") && url.includes("/start"))
      return Promise.resolve({ ok: opts.startResponse?.success !== false, json: () => Promise.resolve(opts.startResponse ?? { success: true }) });
    if (url.includes("/autopilot/runs/") && url.includes("/stop"))
      return Promise.resolve({ ok: opts.stopResponse?.success !== false, json: () => Promise.resolve(opts.stopResponse ?? { success: true }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

describe("AutopilotEntryPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders autopilot-entry-panel", async () => {
    setupFetchMocks();
    render(<AutopilotEntryPanel projectId="test-project" />);
    await waitFor(() => expect(screen.getByTestId("autopilot-entry-panel")).toBeInTheDocument());
  });

  describe("Start Autopilot button", () => {
    it.each(["IDLE", "COMPLETED", "FAILED", "CANCELLED"])("shows start button when %s", async (status) => {
      setupFetchMocks({ autopilotStatus: { status } });
      render(<AutopilotEntryPanel projectId="test-project" />);
      await waitFor(() => expect(screen.getByTestId("autopilot-start-button")).toBeInTheDocument());
    });

    it("calls start API when clicked", async () => {
      setupFetchMocks({ autopilotStatus: { status: "IDLE" }, startResponse: { success: true } });
      render(<AutopilotEntryPanel projectId="test-project" />);
      await waitFor(() => expect(screen.getByTestId("autopilot-start-button")).not.toBeDisabled());
      fireEvent.click(screen.getByTestId("autopilot-start-button"));
      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/autopilot/runs/test-project/start"),
        expect.objectContaining({ method: "POST" })
      ));
    });
  });

  describe("Stop Autopilot button", () => {
    it("shows stop button when RUNNING", async () => {
      setupFetchMocks({ autopilotStatus: { status: "RUNNING", runId: "run-1" } });
      render(<AutopilotEntryPanel projectId="test-project" />);
      await waitFor(() => expect(screen.getByTestId("autopilot-stop-button")).toBeInTheDocument());
      expect(screen.queryByTestId("autopilot-start-button")).not.toBeInTheDocument();
    });

    it("calls stop API when clicked", async () => {
      setupFetchMocks({ autopilotStatus: { status: "RUNNING", runId: "run-1" }, stopResponse: { success: true } });
      render(<AutopilotEntryPanel projectId="test-project" />);
      await waitFor(() => expect(screen.getByTestId("autopilot-stop-button")).toBeInTheDocument());
      fireEvent.click(screen.getByTestId("autopilot-stop-button"));
      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/autopilot/runs/run-1/stop"),
        expect.objectContaining({ method: "POST" })
      ));
    });
  });

  describe("disabled states", () => {
    it("disables when budget exceeded", async () => {
      setupFetchMocks({ aiStatus: { realAiEligible: false, reason: "BUDGET_LIMIT_EXCEEDED" }, autopilotStatus: { status: "IDLE" } });
      render(<AutopilotEntryPanel projectId="test-project" />);
      await waitFor(() => expect(screen.getByTestId("autopilot-start-button")).toBeDisabled());
    });

    it("disables when no tasks ready", async () => {
      setupFetchMocks({ autopilotStatus: { status: "IDLE" }, tasksReady: false });
      render(<AutopilotEntryPanel projectId="test-project" />);
      await waitFor(() => expect(screen.getByTestId("autopilot-start-button")).toBeDisabled());
    });

    it("disables when AI not configured", async () => {
      setupFetchMocks({ aiStatus: { realAiEligible: false, reason: "MISSING_API_KEY" }, autopilotStatus: { status: "IDLE" } });
      render(<AutopilotEntryPanel projectId="test-project" />);
      await waitFor(() => expect(screen.getByTestId("autopilot-start-button")).toBeDisabled());
    });
  });

  describe("hints", () => {
    it("shows hint when budget exceeded", async () => {
      setupFetchMocks({ aiStatus: { realAiEligible: false, reason: "BUDGET_LIMIT_EXCEEDED" }, autopilotStatus: { status: "IDLE" } });
      render(<AutopilotEntryPanel projectId="test-project" />);
      await waitFor(() => expect(screen.getByTestId("autopilot-hint")).toBeInTheDocument());
    });

    it("shows hint when no tasks ready", async () => {
      setupFetchMocks({ autopilotStatus: { status: "IDLE" }, tasksReady: false });
      render(<AutopilotEntryPanel projectId="test-project" />);
      await waitFor(() => expect(screen.getByTestId("autopilot-hint")).toBeInTheDocument());
    });

    it("no hint when RUNNING", async () => {
      setupFetchMocks({ autopilotStatus: { status: "RUNNING", runId: "run-1" } });
      render(<AutopilotEntryPanel projectId="test-project" />);
      await waitFor(() => expect(screen.getByTestId("autopilot-stop-button")).toBeInTheDocument());
      expect(screen.queryByTestId("autopilot-hint")).not.toBeInTheDocument();
    });
  });
});
