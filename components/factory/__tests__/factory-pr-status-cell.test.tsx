/** Factory PR Status Cell Tests (PR-98) - TDD first */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FactoryPrStatusCell } from "../factory-pr-status-cell";
import type { PrCheckStatus } from "@/server/services/factory/factory-pr-checks.service";

describe("FactoryPrStatusCell", () => {
  // Test 1: pending status → yellow badge
  it("renders pending status with yellow styling", () => {
    render(<FactoryPrStatusCell status="pending" prUrl="https://github.com/org/repo/pull/1" />);
    const badge = screen.getByTestId("pr-status-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/pending/i);
    expect(badge).toHaveAttribute("data-status", "pending");
  });

  // Test 2: success status → green badge
  it("renders success status with green styling", () => {
    render(<FactoryPrStatusCell status="success" prUrl="https://github.com/org/repo/pull/1" />);
    const badge = screen.getByTestId("pr-status-badge");
    expect(badge).toHaveTextContent(/success/i);
    expect(badge).toHaveAttribute("data-status", "success");
  });

  // Test 3: failed status → red badge
  it("renders failed status with red styling", () => {
    render(<FactoryPrStatusCell status="failed" prUrl="https://github.com/org/repo/pull/1" />);
    const badge = screen.getByTestId("pr-status-badge");
    expect(badge).toHaveTextContent(/failed/i);
    expect(badge).toHaveAttribute("data-status", "failed");
  });

  // Test 4: cancelled status → gray badge
  it("renders cancelled status", () => {
    render(<FactoryPrStatusCell status="cancelled" prUrl="https://github.com/org/repo/pull/1" />);
    const badge = screen.getByTestId("pr-status-badge");
    expect(badge).toHaveTextContent(/cancelled/i);
    expect(badge).toHaveAttribute("data-status", "cancelled");
  });

  // Test 5: PR link is clickable
  it("renders PR link that opens in new tab", () => {
    render(<FactoryPrStatusCell status="success" prUrl="https://github.com/org/repo/pull/42" />);
    const link = screen.getByTestId("pr-status-link");
    expect(link).toHaveAttribute("href", "https://github.com/org/repo/pull/42");
    expect(link).toHaveAttribute("target", "_blank");
  });

  // Test 6: no prUrl → show "No PR" text
  it("renders 'No PR' when prUrl is null", () => {
    render(<FactoryPrStatusCell status={null} prUrl={null} />);
    expect(screen.getByText(/no pr/i)).toBeInTheDocument();
    expect(screen.queryByTestId("pr-status-link")).not.toBeInTheDocument();
  });

  // Test 7: loading state
  it("renders loading state when isLoading is true", () => {
    render(<FactoryPrStatusCell status={null} prUrl="https://github.com/org/repo/pull/1" isLoading />);
    expect(screen.getByTestId("pr-status-loading")).toBeInTheDocument();
  });
});
