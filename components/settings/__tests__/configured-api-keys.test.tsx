/**
 * ConfiguredApiKeys Component Tests (PR-123)
 *
 * Tests for the BYOK key list display component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConfiguredApiKeys } from "../configured-api-keys";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ConfiguredApiKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("display", () => {
    it("shows configured provider with masked key", () => {
      const providers = [
        { provider: "anthropic", keyPresent: true, keyMasked: "sk-ant****0QAA" },
      ];

      render(<ConfiguredApiKeys configuredProviders={providers} onKeyRemoved={() => {}} />);

      expect(screen.getByText("anthropic")).toBeInTheDocument();
      expect(screen.getByText("sk-ant****0QAA")).toBeInTheDocument();
    });

    it("shows 'Not configured' for provider without key", () => {
      const providers = [
        { provider: "anthropic", keyPresent: false, keyMasked: null },
      ];

      render(<ConfiguredApiKeys configuredProviders={providers} onKeyRemoved={() => {}} />);

      expect(screen.getByText("anthropic")).toBeInTheDocument();
      // Component shows all providers, so "Not configured" appears for both anthropic and openai
      const notConfiguredTexts = screen.getAllByText("Not configured");
      expect(notConfiguredTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("shows multiple providers when both are configured", () => {
      const providers = [
        { provider: "anthropic", keyPresent: true, keyMasked: "sk-ant****0QAA" },
        { provider: "openai", keyPresent: true, keyMasked: "sk-****xxxx" },
      ];

      render(<ConfiguredApiKeys configuredProviders={providers} onKeyRemoved={() => {}} />);

      expect(screen.getByText("anthropic")).toBeInTheDocument();
      expect(screen.getByText("sk-ant****0QAA")).toBeInTheDocument();
      expect(screen.getByText("openai")).toBeInTheDocument();
      expect(screen.getByText("sk-****xxxx")).toBeInTheDocument();
    });

    it("shows empty state when no providers configured", () => {
      render(<ConfiguredApiKeys configuredProviders={[]} onKeyRemoved={() => {}} />);

      expect(screen.getByText(/no api keys configured/i)).toBeInTheDocument();
    });
  });

  describe("remove action", () => {
    it("calls DELETE endpoint when Remove button clicked", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });

      const providers = [
        { provider: "anthropic", keyPresent: true, keyMasked: "sk-ant****0QAA" },
      ];
      const onKeyRemoved = vi.fn();

      render(<ConfiguredApiKeys configuredProviders={providers} onKeyRemoved={onKeyRemoved} />);

      const removeButton = screen.getByRole("button", { name: /remove/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/settings/api-key?provider=anthropic",
          expect.objectContaining({ method: "DELETE" })
        );
      });
    });

    it("calls onKeyRemoved callback after successful deletion", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });

      const providers = [
        { provider: "anthropic", keyPresent: true, keyMasked: "sk-ant****0QAA" },
      ];
      const onKeyRemoved = vi.fn();

      render(<ConfiguredApiKeys configuredProviders={providers} onKeyRemoved={onKeyRemoved} />);

      const removeButton = screen.getByRole("button", { name: /remove/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(onKeyRemoved).toHaveBeenCalled();
      });
    });

    it("shows error message on deletion failure", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: "Failed" }) });

      const providers = [
        { provider: "anthropic", keyPresent: true, keyMasked: "sk-ant****0QAA" },
      ];

      render(<ConfiguredApiKeys configuredProviders={providers} onKeyRemoved={() => {}} />);

      const removeButton = screen.getByRole("button", { name: /remove/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to remove/i)).toBeInTheDocument();
      });
    });

    it("does not show Remove button for unconfigured provider", () => {
      const providers = [
        { provider: "anthropic", keyPresent: false, keyMasked: null },
      ];

      render(<ConfiguredApiKeys configuredProviders={providers} onKeyRemoved={() => {}} />);

      expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    });
  });
});
