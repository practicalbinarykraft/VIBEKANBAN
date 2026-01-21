import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CloneRequiredBanner } from "../clone-required-banner";

describe("CloneRequiredBanner", () => {
  it("renders with required props", () => {
    render(<CloneRequiredBanner projectId="test-project" />);
    expect(screen.getByTestId("clone-required-banner")).toBeInTheDocument();
  });

  it("shows title", () => {
    render(<CloneRequiredBanner projectId="test-project" />);
    expect(screen.getByText("Repository Not Configured")).toBeInTheDocument();
  });

  it("explains why repository is needed", () => {
    render(<CloneRequiredBanner projectId="test-project" />);
    expect(
      screen.getByText(/Factory creates isolated git worktrees/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AI agents need access to your codebase/)
    ).toBeInTheDocument();
  });

  it("shows warning about read-only", () => {
    render(<CloneRequiredBanner projectId="test-project" />);
    expect(
      screen.getByText(/Without a repository, tasks are read-only/)
    ).toBeInTheDocument();
  });

  it("has Configure Repository button", () => {
    render(<CloneRequiredBanner projectId="test-project" />);
    const button = screen.getByText("Configure Repository");
    expect(button).toBeInTheDocument();
    expect(button.closest("a")).toHaveAttribute(
      "href",
      "/projects/test-project/settings"
    );
  });

  it("has Learn More button", () => {
    render(<CloneRequiredBanner projectId="test-project" />);
    const button = screen.getByText("Learn More");
    expect(button).toBeInTheDocument();
    expect(button.closest("a")).toHaveAttribute("href", "/docs/repository-setup");
  });

  it("applies custom className", () => {
    render(
      <CloneRequiredBanner projectId="test-project" className="custom-class" />
    );
    expect(screen.getByTestId("clone-required-banner")).toHaveClass(
      "custom-class"
    );
  });
});
