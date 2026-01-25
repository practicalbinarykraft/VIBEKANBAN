/**
 * AI Billing WIP Component Tests (PR-125)
 *
 * Tests for the "In Development" placeholder that replaces
 * misleading estimator-based billing UI.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AiBillingWip } from "../ai-billing-wip";

describe("AiBillingWip", () => {
  it("renders the component with correct title", () => {
    render(<AiBillingWip />);
    expect(screen.getByText("AI Billing & Usage")).toBeInTheDocument();
  });

  it("shows 'In development' badge", () => {
    render(<AiBillingWip />);
    expect(screen.getByText("In development")).toBeInTheDocument();
  });

  it("explains why billing is not available", () => {
    render(<AiBillingWip />);
    expect(screen.getByText(/accurate billing data is not available yet/i)).toBeInTheDocument();
  });

  it("mentions Anthropic lacks balance API", () => {
    render(<AiBillingWip />);
    expect(screen.getByText(/anthropic does not provide an api/i)).toBeInTheDocument();
  });

  it("provides guidance to check provider dashboard", () => {
    render(<AiBillingWip />);
    expect(screen.getByText(/check usage in your provider dashboard/i)).toBeInTheDocument();
  });

  it("does NOT show any dollar amounts", () => {
    render(<AiBillingWip />);
    const container = screen.getByTestId("ai-billing-wip");
    expect(container.textContent).not.toMatch(/\$\d/);
  });

  it("does NOT mention 'estimator' source", () => {
    render(<AiBillingWip />);
    const container = screen.getByTestId("ai-billing-wip");
    expect(container.textContent?.toLowerCase()).not.toContain("estimator");
  });
});
