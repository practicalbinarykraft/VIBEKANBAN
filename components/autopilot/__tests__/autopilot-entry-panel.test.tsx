/**
 * AutopilotEntryPanel Component Tests (PR-78)
 * Tests the autopilot entry button with various states.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AutopilotEntryPanel } from "../autopilot-entry-panel";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to set up fetch responses
function setupFetchMocks(options: {
  aiStatus?: { realAiEligible: boolean; reason?: string };
  autopilotStatus?: { status: string };
  startResponse?: { success: boolean; error?: string };
}) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/ai/status")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(options.aiStatus ?? { realAiEligible: true }),
      });
    }
    if (url.includes("/planning/autopilot/status")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(options.autopilotStatus ?? { status: "IDLE" }),
      });
    }
    if (url.includes("/autopilot/runs/") && url.includes("/start")) {
      return Promise.resolve({
        ok: options.startResponse?.success !== false,
        json: () => Promise.resolve(options.startResponse ?? { success: true }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

describe("AutopilotEntryPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Run Autopilot button in enabled state", async () => {
    setupFetchMocks({
      aiStatus: { realAiEligible: true },
      autopilotStatus: { status: "IDLE" },
    });

    render(<AutopilotEntryPanel projectId="test-project" />);

    await waitFor(() => {
      const button = screen.getByTestId("run-autopilot-btn");
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });
  });

  it("shows button text as Run Autopilot", async () => {
    setupFetchMocks({
      aiStatus: { realAiEligible: true },
      autopilotStatus: { status: "IDLE" },
    });

    render(<AutopilotEntryPanel projectId="test-project" />);

    await waitFor(() => {
      expect(screen.getByText("Run Autopilot")).toBeInTheDocument();
    });
  });

  it("disables button when autopilot is running", async () => {
    setupFetchMocks({
      aiStatus: { realAiEligible: true },
      autopilotStatus: { status: "RUNNING" },
    });

    render(<AutopilotEntryPanel projectId="test-project" />);

    await waitFor(() => {
      const button = screen.getByTestId("run-autopilot-btn");
      expect(button).toBeDisabled();
    });
  });

  it("shows running text when autopilot is running", async () => {
    setupFetchMocks({
      aiStatus: { realAiEligible: true },
      autopilotStatus: { status: "RUNNING" },
    });

    render(<AutopilotEntryPanel projectId="test-project" />);

    await waitFor(() => {
      expect(screen.getByText("Autopilot is running")).toBeInTheDocument();
    });
  });

  it("disables button when AI is not configured", async () => {
    setupFetchMocks({
      aiStatus: { realAiEligible: false, reason: "MISSING_API_KEY" },
      autopilotStatus: { status: "IDLE" },
    });

    render(<AutopilotEntryPanel projectId="test-project" />);

    await waitFor(() => {
      const button = screen.getByTestId("run-autopilot-btn");
      expect(button).toBeDisabled();
    });
  });

  it("disables button when budget is exceeded", async () => {
    setupFetchMocks({
      aiStatus: { realAiEligible: false, reason: "BUDGET_LIMIT_EXCEEDED" },
      autopilotStatus: { status: "IDLE" },
    });

    render(<AutopilotEntryPanel projectId="test-project" />);

    await waitFor(() => {
      const button = screen.getByTestId("run-autopilot-btn");
      expect(button).toBeDisabled();
    });
  });

  it("calls start API when button is clicked", async () => {
    setupFetchMocks({
      aiStatus: { realAiEligible: true },
      autopilotStatus: { status: "IDLE" },
      startResponse: { success: true },
    });

    render(<AutopilotEntryPanel projectId="test-project" />);

    await waitFor(() => {
      const button = screen.getByTestId("run-autopilot-btn");
      expect(button).not.toBeDisabled();
    });

    const button = screen.getByTestId("run-autopilot-btn");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/autopilot/runs/test-project/start"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("shows loading state during start", async () => {
    // Make start call hang
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/ai/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ realAiEligible: true }),
        });
      }
      if (url.includes("/planning/autopilot/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: "IDLE" }),
        });
      }
      if (url.includes("/autopilot/runs/") && url.includes("/start")) {
        return new Promise(() => {}); // Never resolves
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<AutopilotEntryPanel projectId="test-project" />);

    await waitFor(() => {
      const button = screen.getByTestId("run-autopilot-btn");
      expect(button).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId("run-autopilot-btn"));

    await waitFor(() => {
      expect(screen.getByText("Starting...")).toBeInTheDocument();
    });
  });

  it("renders description text", async () => {
    setupFetchMocks({
      aiStatus: { realAiEligible: true },
      autopilotStatus: { status: "IDLE" },
    });

    render(<AutopilotEntryPanel projectId="test-project" />);

    await waitFor(() => {
      expect(
        screen.getByText("Autopilot will execute the current plan automatically")
      ).toBeInTheDocument();
    });
  });
});
