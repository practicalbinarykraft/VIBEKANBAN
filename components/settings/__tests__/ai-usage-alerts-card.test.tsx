/**
 * Unit tests for AIUsageAlertsCard (PR-59)
 *
 * Tests all 4 status states: ok, warning, critical, blocked
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AIUsageAlertsCard } from "../ai-usage-alerts-card";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AIUsageAlertsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders ok status correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        provider: "anthropic",
        status: "ok",
        spendUsd: 10.5,
        limitUsd: 50,
        percentUsed: 21,
      }),
    });

    render(<AIUsageAlertsCard />);

    await waitFor(() => {
      expect(screen.getByTestId("alerts-card")).toBeInTheDocument();
    });

    expect(screen.getByText("Ok")).toBeInTheDocument();
    expect(screen.getByTestId("status-text")).toHaveTextContent("Usage within limits");
    expect(screen.getByTestId("spend-limit")).toHaveTextContent("$10.50 / $50.00");
    expect(screen.getByTestId("percent-used")).toHaveTextContent("21.0%");
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
  });

  it("renders warning status correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        provider: "anthropic",
        status: "warning",
        spendUsd: 35,
        limitUsd: 50,
        percentUsed: 70,
      }),
    });

    render(<AIUsageAlertsCard />);

    await waitFor(() => {
      expect(screen.getByTestId("alerts-card")).toBeInTheDocument();
    });

    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getByTestId("status-text")).toHaveTextContent("Approaching limit");
    expect(screen.getByTestId("spend-limit")).toHaveTextContent("$35.00 / $50.00");
    expect(screen.getByTestId("percent-used")).toHaveTextContent("70.0%");
  });

  it("renders critical status correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        provider: "anthropic",
        status: "critical",
        spendUsd: 47.5,
        limitUsd: 50,
        percentUsed: 95,
      }),
    });

    render(<AIUsageAlertsCard />);

    await waitFor(() => {
      expect(screen.getByTestId("alerts-card")).toBeInTheDocument();
    });

    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByTestId("status-text")).toHaveTextContent("Near limit");
    expect(screen.getByTestId("spend-limit")).toHaveTextContent("$47.50 / $50.00");
    expect(screen.getByTestId("percent-used")).toHaveTextContent("95.0%");
  });

  it("renders blocked status correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        provider: "anthropic",
        status: "blocked",
        spendUsd: 55,
        limitUsd: 50,
        percentUsed: 110,
      }),
    });

    render(<AIUsageAlertsCard />);

    await waitFor(() => {
      expect(screen.getByTestId("alerts-card")).toBeInTheDocument();
    });

    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByTestId("status-text")).toHaveTextContent("Usage blocked");
    expect(screen.getByTestId("spend-limit")).toHaveTextContent("$55.00 / $50.00");
    expect(screen.getByTestId("percent-used")).toHaveTextContent("110.0%");

    // Check opacity for blocked state
    const card = screen.getByTestId("alerts-card");
    expect(card).toHaveClass("opacity-75");
  });

  it("shows loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<AIUsageAlertsCard />);

    expect(screen.getByTestId("alerts-loading")).toBeInTheDocument();
    expect(screen.getByText("Loading alerts...")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<AIUsageAlertsCard />);

    await waitFor(() => {
      expect(screen.getByTestId("alerts-error")).toBeInTheDocument();
    });

    expect(screen.getByText("Failed to load usage alerts")).toBeInTheDocument();
  });

  it("renders OpenAI provider label correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        provider: "openai",
        status: "ok",
        spendUsd: 5,
        limitUsd: 20,
        percentUsed: 25,
      }),
    });

    render(<AIUsageAlertsCard />);

    await waitFor(() => {
      expect(screen.getByText("OpenAI")).toBeInTheDocument();
    });
  });
});
