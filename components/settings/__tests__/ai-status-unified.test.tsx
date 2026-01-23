import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AiStatusUnified } from "../ai-status-unified";

describe("AiStatusUnified", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows loading state initially", () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as any;
    render(<AiStatusUnified />);
    expect(screen.getByText("Checking AI status...")).toBeInTheDocument();
  });

  it("shows ready state when AI is eligible", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            realAiEligible: true,
            provider: "anthropic",
            model: "claude-sonnet-4",
          }),
      })
    ) as any;

    render(<AiStatusUnified />);

    await waitFor(() => {
      expect(screen.getByText("AI Ready")).toBeInTheDocument();
    });

    expect(screen.getByTestId("ai-status-unified")).toHaveAttribute(
      "data-status",
      "ready"
    );
    expect(screen.getByText(/claude-sonnet-4/)).toBeInTheDocument();
  });

  it("shows not ready state with reason", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            realAiEligible: false,
            provider: "db",
            model: "configured-in-db",
            reason: "MISSING_API_KEY",
          }),
      })
    ) as any;

    render(<AiStatusUnified />);

    await waitFor(() => {
      expect(screen.getByText(/API key not configured/)).toBeInTheDocument();
    });

    expect(screen.getByTestId("ai-status-unified")).toHaveAttribute(
      "data-status",
      "not-ready"
    );
    expect(screen.getByTestId("ai-status-unified")).toHaveAttribute(
      "data-reason",
      "MISSING_API_KEY"
    );
  });

  it("shows budget exceeded with amounts", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            realAiEligible: false,
            provider: "db",
            model: "configured-in-db",
            reason: "BUDGET_LIMIT_EXCEEDED",
            limitUSD: 100,
            spendUSD: 105.5,
          }),
      })
    ) as any;

    render(<AiStatusUnified />);

    await waitFor(() => {
      expect(screen.getByText(/Budget limit reached/)).toBeInTheDocument();
    });

    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("$105.50")).toBeInTheDocument();
  });

  it("shows context banner when context=factory-blocked", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            realAiEligible: false,
            provider: "db",
            model: "configured-in-db",
            reason: "MISSING_API_KEY",
          }),
      })
    ) as any;

    render(<AiStatusUnified context="factory-blocked" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Factory cannot start because AI is not configured/)
      ).toBeInTheDocument();
    });
  });

  it("shows test mode info", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            realAiEligible: false,
            provider: "mock",
            model: "mock",
            reason: "TEST_MODE_FORCED_MOCK",
          }),
      })
    ) as any;

    render(<AiStatusUnified />);

    await waitFor(() => {
      expect(screen.getByText(/Test mode active/)).toBeInTheDocument();
    });

    expect(screen.getByTestId("ai-status-unified")).toHaveTextContent("Current mode:");
  });

  it("shows error state on fetch failure", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
      })
    ) as any;

    render(<AiStatusUnified />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to check AI status/)).toBeInTheDocument();
    });
  });
});
