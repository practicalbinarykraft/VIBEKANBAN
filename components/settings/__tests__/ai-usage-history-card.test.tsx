/** Unit tests for AI Usage History Card (PR-56) */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AiUsageHistoryCard } from "../ai-usage-history-card";

const mockItems = [
  { id: "1", provider: "anthropic", model: "claude-sonnet-4-20250514",
    tokensPrompt: 100, tokensCompletion: 50, estimatedCostUsd: 0.01,
    source: "council", createdAt: "2026-01-19T10:00:00.000Z" },
  { id: "2", provider: "openai", model: "gpt-4", tokensPrompt: 200,
    tokensCompletion: 100, estimatedCostUsd: 0.02, source: "autopilot",
    createdAt: "2026-01-18T09:00:00.000Z" },
];

function mockFetchSuccess(items = mockItems, totalUsd = 0.03) {
  return vi.fn().mockResolvedValue({
    ok: true, json: () => Promise.resolve({ items, totalUsd }),
  });
}

function mockFetchEmpty() {
  return vi.fn().mockResolvedValue({
    ok: true, json: () => Promise.resolve({ items: [], totalUsd: 0 }),
  });
}

function mockFetchError() {
  return vi.fn().mockResolvedValue({ ok: false, status: 500 });
}

describe("AiUsageHistoryCard", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("shows loading state initially", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<AiUsageHistoryCard />);
    expect(screen.getByTestId("ai-usage-history-loading")).toBeInTheDocument();
  });

  it("displays usage items with correct data", async () => {
    vi.stubGlobal("fetch", mockFetchSuccess());
    render(<AiUsageHistoryCard />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-usage-history-card")).toBeInTheDocument();
    });

    expect(screen.getByText("anthropic")).toBeInTheDocument();
    expect(screen.getByText("claude-sonnet-4-20250514")).toBeInTheDocument();
    expect(screen.getByText("council")).toBeInTheDocument();
    expect(screen.getByText(/\$0\.03/)).toBeInTheDocument(); // totalUsd
  });

  it("shows empty state when no events", async () => {
    vi.stubGlobal("fetch", mockFetchEmpty());
    render(<AiUsageHistoryCard />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-usage-history-empty")).toBeInTheDocument();
    });

    expect(screen.getByText(/no ai usage/i)).toBeInTheDocument();
  });

  it("shows error state on API failure", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    render(<AiUsageHistoryCard />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-usage-history-error")).toBeInTheDocument();
    });

    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it("displays tokens correctly", async () => {
    vi.stubGlobal("fetch", mockFetchSuccess());
    render(<AiUsageHistoryCard />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-usage-history-card")).toBeInTheDocument();
    });

    expect(screen.getByText(/100.*50/)).toBeInTheDocument(); // prompt/completion
  });
});
