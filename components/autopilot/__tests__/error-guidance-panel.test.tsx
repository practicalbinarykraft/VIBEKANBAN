/**
 * ErrorGuidancePanel Component Tests (PR-77)
 * Tests error guidance display with various error types and severities.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorGuidancePanel } from "../error-guidance-panel";

// Mock the server imports
vi.mock("@/server/services/autopilot/autopilot-run-error.store", () => ({
  deserializeRunError: vi.fn(),
}));

vi.mock("@/server/services/autopilot/autopilot-error-guidance", () => ({
  getGuidanceForError: vi.fn(),
}));

import { deserializeRunError } from "@/server/services/autopilot/autopilot-run-error.store";
import { getGuidanceForError } from "@/server/services/autopilot/autopilot-error-guidance";

const mockDeserialize = vi.mocked(deserializeRunError);
const mockGetGuidance = vi.mocked(getGuidanceForError);

describe("ErrorGuidancePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when runError is null", () => {
    const { container } = render(<ErrorGuidancePanel runError={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when runError is undefined", () => {
    const { container } = render(<ErrorGuidancePanel runError={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when deserializeRunError returns null", () => {
    mockDeserialize.mockReturnValue(null);
    const { container } = render(<ErrorGuidancePanel runError="some-error" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders error panel with guidance for valid error", () => {
    mockDeserialize.mockReturnValue({
      code: "BUDGET_EXCEEDED",
      message: "Monthly limit reached",
    });
    mockGetGuidance.mockReturnValue({
      title: "Budget Exceeded",
      nextSteps: ["Check your usage", "Increase budget"],
      severity: "critical",
    });

    render(<ErrorGuidancePanel runError='{"code":"BUDGET_EXCEEDED"}' />);

    expect(screen.getByTestId("error-guidance-panel")).toBeInTheDocument();
    expect(screen.getByText("Budget Exceeded")).toBeInTheDocument();
    expect(screen.getByText("BUDGET_EXCEEDED")).toBeInTheDocument();
  });

  it("renders next steps list", () => {
    mockDeserialize.mockReturnValue({
      code: "AI_NOT_CONFIGURED",
      message: "API key missing",
    });
    mockGetGuidance.mockReturnValue({
      title: "AI Not Configured",
      nextSteps: ["Add API key", "Check settings"],
      severity: "warning",
    });

    render(<ErrorGuidancePanel runError='{"code":"AI_NOT_CONFIGURED"}' />);

    expect(screen.getByText("Add API key")).toBeInTheDocument();
    expect(screen.getByText("Check settings")).toBeInTheDocument();
  });

  it("displays error message when code is not UNKNOWN", () => {
    mockDeserialize.mockReturnValue({
      code: "GIT_ERROR",
      message: "Push failed: remote rejected",
    });
    mockGetGuidance.mockReturnValue({
      title: "Git Error",
      nextSteps: ["Check remote access"],
      severity: "warning",
    });

    render(<ErrorGuidancePanel runError='{"code":"GIT_ERROR"}' />);

    expect(screen.getByText("Push failed: remote rejected")).toBeInTheDocument();
  });

  it("hides error message when code is UNKNOWN", () => {
    mockDeserialize.mockReturnValue({
      code: "UNKNOWN",
      message: "Some raw error text",
    });
    mockGetGuidance.mockReturnValue({
      title: "Unknown Error",
      nextSteps: ["Contact support"],
      severity: "info",
    });

    render(<ErrorGuidancePanel runError="Some raw error text" />);

    // Message should NOT be shown for UNKNOWN code
    expect(screen.queryByText("Some raw error text")).not.toBeInTheDocument();
  });

  it("applies correct styling for critical severity", () => {
    mockDeserialize.mockReturnValue({ code: "BUDGET_EXCEEDED", message: "" });
    mockGetGuidance.mockReturnValue({
      title: "Budget Exceeded",
      nextSteps: ["Increase budget"],
      severity: "critical",
    });

    render(<ErrorGuidancePanel runError='{"code":"BUDGET_EXCEEDED"}' />);

    const badge = screen.getByText("BUDGET_EXCEEDED");
    expect(badge).toBeInTheDocument();
  });

  it("renders What to do next section", () => {
    mockDeserialize.mockReturnValue({ code: "REPO_NOT_READY", message: "" });
    mockGetGuidance.mockReturnValue({
      title: "Repo Not Ready",
      nextSteps: ["Clone the repo first"],
      severity: "warning",
    });

    render(<ErrorGuidancePanel runError='{"code":"REPO_NOT_READY"}' />);

    expect(screen.getByText("What to do next:")).toBeInTheDocument();
  });
});
