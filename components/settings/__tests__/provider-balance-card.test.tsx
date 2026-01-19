/**
 * Unit tests for Provider Balance Card (PR-53)
 * Tests: loading/data, refresh button, auto-refresh logic, error handling
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ProviderBalanceCard } from "../provider-balance-card";

const FRESH_TIME = Date.now();
const STALE_TIME = Date.now() - 7 * 60 * 60 * 1000;

const freshBalance = {
  provider: "anthropic",
  balanceUsd: 75.5,
  spendUsd: 24.5,
  limitUsd: 100,
  balanceSource: "estimator",
  updatedAt: new Date(FRESH_TIME).toISOString(),
};

function createMockFetch(balanceData: object, postData?: object | null) {
  const calls: { url: string; method: string }[] = [];
  return {
    calls,
    fn: vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      const method = options?.method || "GET";
      calls.push({ url, method });
      if (method === "POST" && url.includes("/refresh")) {
        if (postData === null) return Promise.resolve({ ok: false, status: 500 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(postData || balanceData) });
      }
      if (url.includes("/api/ai/balance")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(balanceData) });
      }
      return Promise.reject(new Error("Unknown URL"));
    }),
  };
}

describe("ProviderBalanceCard", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows loading state then displays balance data", async () => {
    const mock = createMockFetch(freshBalance);
    vi.stubGlobal("fetch", mock.fn);
    render(<ProviderBalanceCard provider="anthropic" />);
    expect(screen.getByTestId("provider-balance-loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("provider-balance-card")).toBeInTheDocument());
    expect(screen.getByText("$75.50")).toBeInTheDocument();
    expect(screen.getByText("$24.50")).toBeInTheDocument();
    expect(screen.getByText("estimator")).toBeInTheDocument();
  });

  it("refresh button calls POST then updates display", async () => {
    const updatedBalance = { ...freshBalance, balanceUsd: 70.0, spendUsd: 30.0 };
    const mock = createMockFetch(freshBalance, updatedBalance);
    vi.stubGlobal("fetch", mock.fn);
    render(<ProviderBalanceCard provider="anthropic" />);
    await waitFor(() => expect(screen.getByTestId("provider-balance-card")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("refresh-balance-btn"));
    await waitFor(() => expect(mock.calls.some((c) => c.method === "POST")).toBe(true));
    await waitFor(() => expect(screen.getByText("$70.00")).toBeInTheDocument());
  });

  it("skips auto-refresh when updatedAt is fresh", async () => {
    const mock = createMockFetch(freshBalance);
    vi.stubGlobal("fetch", mock.fn);
    render(<ProviderBalanceCard provider="anthropic" />);
    await waitFor(() => expect(screen.getByTestId("provider-balance-card")).toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 100));
    expect(mock.calls.filter((c) => c.method === "POST").length).toBe(0);
  });

  it("triggers auto-refresh when updatedAt is stale", async () => {
    const staleBalance = { ...freshBalance, updatedAt: new Date(STALE_TIME).toISOString() };
    const mock = createMockFetch(staleBalance);
    vi.stubGlobal("fetch", mock.fn);
    render(<ProviderBalanceCard provider="anthropic" />);
    await waitFor(() => expect(screen.getByTestId("provider-balance-card")).toBeInTheDocument());
    await waitFor(() => expect(mock.calls.filter((c) => c.method === "POST").length).toBe(1));
  });

  it("triggers auto-refresh when updatedAt is missing", async () => {
    const nullBalance = { ...freshBalance, balanceUsd: null, updatedAt: null, balanceSource: "unknown" };
    const mock = createMockFetch(nullBalance);
    vi.stubGlobal("fetch", mock.fn);
    render(<ProviderBalanceCard provider="anthropic" />);
    await waitFor(() => expect(screen.getByTestId("provider-balance-card")).toBeInTheDocument());
    await waitFor(() => expect(mock.calls.filter((c) => c.method === "POST").length).toBe(1));
  });

  it("shows error and re-enables button on POST 500", async () => {
    const mock = createMockFetch(freshBalance, null);
    vi.stubGlobal("fetch", mock.fn);
    render(<ProviderBalanceCard provider="anthropic" />);
    await waitFor(() => expect(screen.getByTestId("provider-balance-card")).toBeInTheDocument());
    const btn = screen.getByTestId("refresh-balance-btn");
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText(/failed to refresh/i)).toBeInTheDocument());
    expect(btn).not.toBeDisabled();
  });
});
