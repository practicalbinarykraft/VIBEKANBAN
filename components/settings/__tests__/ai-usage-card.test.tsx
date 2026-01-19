/**
 * Unit tests for AI Usage Card (PR-51)
 *
 * Tests:
 * 1. Active real AI (eligible = true)
 * 2. Disabled real AI (reason shown)
 * 3. Budget exceeded (limit + spend shown)
 * 4. Balance unknown
 * 5. Loading state
 * 6. Error state (API 500)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AiUsageCard } from "../ai-usage-card";

// Mock fetch responses
function mockFetch(statusResponse: object, balanceResponse: object) {
  return vi.fn().mockImplementation((url: string) => {
    if (url === "/api/ai/status") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(statusResponse),
      });
    }
    if (url.startsWith("/api/ai/balance")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(balanceResponse),
      });
    }
    return Promise.reject(new Error("Unknown URL"));
  });
}

function mockFetchError() {
  return vi.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: false,
      status: 500,
    });
  });
}

describe("AiUsageCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<AiUsageCard />);
    expect(screen.getByTestId("ai-usage-card-loading")).toBeInTheDocument();
  });

  it("displays active real AI status", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        {
          realAiEligible: true,
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
        },
        {
          providers: [
            {
              provider: "anthropic",
              balanceUSD: 75.0,
              estimatedSpendUSD: 25.0,
              source: "estimator",
            },
          ],
        }
      )
    );

    render(<AiUsageCard />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-usage-card")).toBeInTheDocument();
    });

    expect(screen.getByText("Real AI active")).toBeInTheDocument();
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("claude-sonnet-4-20250514")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
  });

  it("displays disabled real AI with reason", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        {
          realAiEligible: false,
          provider: "db",
          model: "configured-in-db",
          reason: "FEATURE_REAL_AI flag not enabled",
        },
        { providers: [] }
      )
    );

    render(<AiUsageCard />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-usage-card")).toBeInTheDocument();
    });

    expect(screen.getByText("Real AI disabled")).toBeInTheDocument();
    expect(
      screen.getByText("FEATURE_REAL_AI flag not enabled")
    ).toBeInTheDocument();
  });

  it("displays budget exceeded warning", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        {
          realAiEligible: true,
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
        },
        {
          providers: [
            {
              provider: "anthropic",
              balanceUSD: -1.2,
              estimatedSpendUSD: 51.2,
              source: "estimator",
            },
          ],
        }
      )
    );

    render(<AiUsageCard />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-usage-card")).toBeInTheDocument();
    });

    expect(screen.getByText("$51.20")).toBeInTheDocument();
    expect(screen.getByText("-$1.20")).toBeInTheDocument();
  });

  it("displays unknown balance state", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        {
          realAiEligible: true,
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
        },
        {
          providers: [
            {
              provider: "anthropic",
              balanceUSD: null,
              source: "unknown",
            },
          ],
        }
      )
    );

    render(<AiUsageCard />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-usage-card")).toBeInTheDocument();
    });

    expect(screen.getByText(/unknown/i)).toBeInTheDocument();
  });

  it("displays error state on API failure", async () => {
    vi.stubGlobal("fetch", mockFetchError());

    render(<AiUsageCard />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-usage-card-error")).toBeInTheDocument();
    });

    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
});
