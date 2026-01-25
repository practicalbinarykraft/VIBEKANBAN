/**
 * TypingIndicator Tests (PR-127)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TypingIndicator } from "../typing-indicator";

describe("TypingIndicator", () => {
  it("renders with correct testid", () => {
    render(<TypingIndicator />);
    expect(screen.getByTestId("typing-indicator")).toBeInTheDocument();
  });

  it("renders three animated dots", () => {
    render(<TypingIndicator />);
    // Dots are spans with animate-pulse class
    const dots = document.querySelectorAll(".animate-pulse");
    expect(dots).toHaveLength(3);
  });

  it("renders bot icon", () => {
    render(<TypingIndicator />);
    const indicator = screen.getByTestId("typing-indicator");
    expect(indicator.querySelector("svg")).toBeInTheDocument();
  });

  it("has proper styling classes", () => {
    render(<TypingIndicator />);
    const indicator = screen.getByTestId("typing-indicator");
    expect(indicator).toHaveClass("flex", "justify-start");
  });
});
