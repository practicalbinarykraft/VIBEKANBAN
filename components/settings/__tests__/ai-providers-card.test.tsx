/**
 * Unit tests for AIProvidersCard (PR-55)
 *
 * Tests render states: loading, providers list, error, refresh
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AIProvidersCard } from "../ai-providers-card";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AIProvidersCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AIProvidersCard />);

    expect(screen.getByTestId("ai-providers-loading")).toBeInTheDocument();
    expect(screen.getByText("Loading providers...")).toBeInTheDocument();
  });

  it("renders provider rows after fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        providers: [
          {
            provider: "anthropic",
            balanceUsd: 75.5,
            spendUsd: 24.5,
            limitUsd: 100,
            balanceSource: "estimator",
            updatedAt: "2025-01-19T10:00:00.000Z",
            status: "ok",
          },
          {
            provider: "openai",
            balanceUsd: null,
            spendUsd: null,
            limitUsd: null,
            balanceSource: "unknown",
            updatedAt: null,
            status: "unknown",
          },
        ],
      }),
    });

    render(<AIProvidersCard />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-providers-card")).toBeInTheDocument();
    });

    // Check Anthropic row
    expect(screen.getByTestId("provider-row-anthropic")).toBeInTheDocument();
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("$75.50")).toBeInTheDocument();

    // Check OpenAI row
    expect(screen.getByTestId("provider-row-openai")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
  });

  it("shows OK status badge for healthy providers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        providers: [
          {
            provider: "anthropic",
            balanceUsd: 50,
            spendUsd: 50,
            limitUsd: 100,
            balanceSource: "estimator",
            updatedAt: new Date().toISOString(),
            status: "ok",
          },
        ],
      }),
    });

    render(<AIProvidersCard />);

    await waitFor(() => {
      expect(screen.getByText("OK")).toBeInTheDocument();
    });
  });

  it("shows Over Budget status for negative balance", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        providers: [
          {
            provider: "anthropic",
            balanceUsd: -10,
            spendUsd: 110,
            limitUsd: 100,
            balanceSource: "estimator",
            updatedAt: new Date().toISOString(),
            status: "over_budget",
          },
        ],
      }),
    });

    render(<AIProvidersCard />);

    await waitFor(() => {
      expect(screen.getByText("Over Budget")).toBeInTheDocument();
    });
  });

  it("shows error state on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<AIProvidersCard />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load provider accounts")).toBeInTheDocument();
    });
  });

  it("refresh button triggers refresh and refetch", async () => {
    // Initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        providers: [
          {
            provider: "anthropic",
            balanceUsd: 50,
            spendUsd: 50,
            limitUsd: 100,
            balanceSource: "estimator",
            updatedAt: new Date().toISOString(),
            status: "ok",
          },
        ],
      }),
    });

    render(<AIProvidersCard />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-providers-card")).toBeInTheDocument();
    });

    // Mock refresh endpoint
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });

    // Mock refetch after refresh
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        providers: [
          {
            provider: "anthropic",
            balanceUsd: 45,
            spendUsd: 55,
            limitUsd: 100,
            balanceSource: "estimator",
            updatedAt: new Date().toISOString(),
            status: "ok",
          },
        ],
      }),
    });

    const refreshBtn = screen.getByTestId("refresh-all-btn");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/providers/accounts/refresh", { method: "POST" });
    });
  });

  it("shows error on refresh failure", async () => {
    // Initial load success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        providers: [
          {
            provider: "anthropic",
            balanceUsd: 50,
            spendUsd: 50,
            limitUsd: 100,
            balanceSource: "estimator",
            updatedAt: new Date().toISOString(),
            status: "ok",
          },
        ],
      }),
    });

    render(<AIProvidersCard />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-providers-card")).toBeInTheDocument();
    });

    // Mock refresh failure
    mockFetch.mockResolvedValueOnce({ ok: false });

    const refreshBtn = screen.getByTestId("refresh-all-btn");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText("Failed to refresh balances")).toBeInTheDocument();
    });
  });
});
