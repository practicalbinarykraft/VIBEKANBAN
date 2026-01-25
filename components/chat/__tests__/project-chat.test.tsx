/**
 * ProjectChat Tests (PR-127)
 *
 * Tests for optimistic UI and typing indicator.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProjectChat } from "../project-chat";

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock AiModeBanner
vi.mock("@/components/ai/ai-mode-banner", () => ({
  AiModeBanner: () => <div data-testid="ai-mode-banner">Mock Banner</div>,
}));

describe("ProjectChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: return empty chat history
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it("renders chat container", () => {
    render(<ProjectChat projectId="test-123" />);
    expect(screen.getByTestId("project-chat")).toBeInTheDocument();
  });

  it("renders message input", () => {
    render(<ProjectChat projectId="test-123" />);
    expect(screen.getByTestId("message-input")).toBeInTheDocument();
  });

  it("renders send button", () => {
    render(<ProjectChat projectId="test-123" />);
    expect(screen.getByTestId("send-button")).toBeInTheDocument();
  });

  it("shows empty state when no messages", () => {
    render(<ProjectChat projectId="test-123" />);
    expect(screen.getByText("Start a conversation about your project")).toBeInTheDocument();
  });

  it("disables send button when input is empty", () => {
    render(<ProjectChat projectId="test-123" />);
    const sendButton = screen.getByTestId("send-button");
    expect(sendButton).toBeDisabled();
  });

  it("enables send button when input has content", () => {
    render(<ProjectChat projectId="test-123" />);
    const input = screen.getByTestId("message-input");
    fireEvent.change(input, { target: { value: "Hello" } });
    const sendButton = screen.getByTestId("send-button");
    expect(sendButton).not.toBeDisabled();
  });

  it("shows typing indicator during send", async () => {
    // Delay the response to see typing indicator
    mockFetch.mockImplementation((url, options) => {
      // GET request for chat history
      if (!options?.method || options.method === "GET") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      // Delay POST response
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve({
              userMessage: { id: "1", role: "user", content: "Hello", createdAt: new Date().toISOString() },
              productMessage: { id: "2", role: "product", content: "Hi!", createdAt: new Date().toISOString() },
            }),
          });
        }, 100);
      });
    });

    render(<ProjectChat projectId="test-123" />);

    const input = screen.getByTestId("message-input");
    fireEvent.change(input, { target: { value: "Hello" } });

    const sendButton = screen.getByTestId("send-button");
    fireEvent.click(sendButton);

    // Should show typing indicator
    await waitFor(() => {
      expect(screen.getByTestId("typing-indicator")).toBeInTheDocument();
    });
  });

  it("clears input immediately after send", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        userMessage: { id: "1", role: "user", content: "Hello", createdAt: new Date().toISOString() },
        productMessage: { id: "2", role: "product", content: "Hi!", createdAt: new Date().toISOString() },
      }),
    });

    render(<ProjectChat projectId="test-123" />);

    const input = screen.getByTestId("message-input") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "Hello" } });
    expect(input.value).toBe("Hello");

    const sendButton = screen.getByTestId("send-button");
    fireEvent.click(sendButton);

    // Input should be cleared immediately (optimistic)
    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("adds user message optimistically before server response", async () => {
    // Delay the response
    let resolvePost: Function;
    mockFetch.mockImplementation((url, options) => {
      if (options?.method === "POST") {
        return new Promise((resolve) => {
          resolvePost = () => resolve({
            ok: true,
            json: () => Promise.resolve({
              userMessage: { id: "real-1", role: "user", content: "Hello", createdAt: new Date().toISOString() },
              productMessage: { id: "real-2", role: "product", content: "Hi!", createdAt: new Date().toISOString() },
            }),
          });
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<ProjectChat projectId="test-123" />);

    const input = screen.getByTestId("message-input");
    fireEvent.change(input, { target: { value: "Hello" } });

    const sendButton = screen.getByTestId("send-button");
    fireEvent.click(sendButton);

    // User message should appear immediately (optimistic)
    await waitFor(() => {
      expect(screen.getByTestId("chat-message-user")).toBeInTheDocument();
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    // Resolve the POST request
    resolvePost!();

    // After response, should have both messages
    await waitFor(() => {
      expect(screen.getByTestId("chat-message-ai")).toBeInTheDocument();
    });
  });

  it("shows error on failed request", async () => {
    mockFetch.mockImplementation((url, options) => {
      if (options?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: "Server error" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<ProjectChat projectId="test-123" />);

    const input = screen.getByTestId("message-input");
    fireEvent.change(input, { target: { value: "Hello" } });

    const sendButton = screen.getByTestId("send-button");
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByTestId("chat-error")).toBeInTheDocument();
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("removes optimistic message on error", async () => {
    mockFetch.mockImplementation((url, options) => {
      if (options?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: "Server error" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<ProjectChat projectId="test-123" />);

    const input = screen.getByTestId("message-input");
    fireEvent.change(input, { target: { value: "Hello" } });

    const sendButton = screen.getByTestId("send-button");
    fireEvent.click(sendButton);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByTestId("chat-error")).toBeInTheDocument();
    });

    // Optimistic message should be removed
    expect(screen.queryByTestId("chat-message-user")).not.toBeInTheDocument();
  });
});
