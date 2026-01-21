/** FactoryColumnRunButton Tests (PR-105) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FactoryColumnRunButton } from "../factory-column-run-button";

describe("FactoryColumnRunButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders play icon button", () => {
      render(
        <FactoryColumnRunButton
          columnStatus="todo"
          taskCount={5}
          onStart={vi.fn()}
        />
      );

      expect(screen.getByTestId("factory-column-run-btn")).toBeInTheDocument();
    });

    it("shows task count in tooltip/title", () => {
      render(
        <FactoryColumnRunButton
          columnStatus="todo"
          taskCount={5}
          onStart={vi.fn()}
        />
      );

      const button = screen.getByTestId("factory-column-run-btn");
      expect(button).toHaveAttribute("title", "Run 5 tasks");
    });
  });

  describe("disabled states", () => {
    it("disabled when taskCount is 0", () => {
      render(
        <FactoryColumnRunButton
          columnStatus="todo"
          taskCount={0}
          onStart={vi.fn()}
        />
      );

      const button = screen.getByTestId("factory-column-run-btn");
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", "No runnable tasks");
    });

    it("disabled when isRunning is true", () => {
      render(
        <FactoryColumnRunButton
          columnStatus="todo"
          taskCount={5}
          isRunning
          onStart={vi.fn()}
        />
      );

      const button = screen.getByTestId("factory-column-run-btn");
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", "Factory running");
    });

    it("disabled when isLoading is true", () => {
      render(
        <FactoryColumnRunButton
          columnStatus="todo"
          taskCount={5}
          isLoading
          onStart={vi.fn()}
        />
      );

      const button = screen.getByTestId("factory-column-run-btn");
      expect(button).toBeDisabled();
    });

    it("disabled when preflightOk is false", () => {
      render(
        <FactoryColumnRunButton
          columnStatus="todo"
          taskCount={5}
          preflightOk={false}
          onStart={vi.fn()}
        />
      );

      const button = screen.getByTestId("factory-column-run-btn");
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", "Preflight failed");
    });
  });

  describe("interactions", () => {
    it("calls onStart with columnStatus when clicked", () => {
      const onStart = vi.fn();
      render(
        <FactoryColumnRunButton
          columnStatus="in_progress"
          taskCount={3}
          onStart={onStart}
        />
      );

      fireEvent.click(screen.getByTestId("factory-column-run-btn"));

      expect(onStart).toHaveBeenCalledWith("in_progress");
    });

    it("does not call onStart when disabled", () => {
      const onStart = vi.fn();
      render(
        <FactoryColumnRunButton
          columnStatus="todo"
          taskCount={0}
          onStart={onStart}
        />
      );

      fireEvent.click(screen.getByTestId("factory-column-run-btn"));

      expect(onStart).not.toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("shows loading spinner when isLoading", () => {
      render(
        <FactoryColumnRunButton
          columnStatus="todo"
          taskCount={5}
          isLoading
          onStart={vi.fn()}
        />
      );

      expect(screen.getByTestId("factory-column-run-spinner")).toBeInTheDocument();
    });
  });
});
