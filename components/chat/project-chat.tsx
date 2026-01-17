/**
 * ProjectChat - Main chat interface for project
 *
 * Left column: User ↔ AI Product conversation
 * Handles message input and display with clear status indicators
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { AiModeBanner } from "@/components/ai/ai-mode-banner";

type ProcessingStatus = "idle" | "thinking" | "generating" | "still-working";

const STATUS_MESSAGES: Record<ProcessingStatus, string> = {
  idle: "",
  thinking: "Thinking…",
  generating: "Generating plan…",
  "still-working": "Still working… (this may take a moment)",
};

// Timeout thresholds in ms
const GENERATING_TIMEOUT = 3000; // 3s -> show "Generating plan"
const STILL_WORKING_TIMEOUT = 20000; // 20s -> show "Still working"

interface ChatMessage {
  id: string;
  role: "user" | "product" | "system";
  content: string;
  createdAt: Date;
}

interface ProjectChatProps {
  projectId: string;
  onMessageSent?: (data: any) => void;
}

export function ProjectChat({ projectId, onMessageSent }: ProjectChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stillWorkingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load chat history
  useEffect(() => {
    loadHistory();
  }, [projectId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (stillWorkingTimerRef.current) clearTimeout(stillWorkingTimerRef.current);
    };
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/chat`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        })));
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  const clearTimers = () => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
    if (stillWorkingTimerRef.current) {
      clearTimeout(stillWorkingTimerRef.current);
      stillWorkingTimerRef.current = null;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    setStatus("thinking");
    setError(null);

    // Set timer for "Generating plan" status
    statusTimerRef.current = setTimeout(() => {
      setStatus("generating");
    }, GENERATING_TIMEOUT);

    // Set timer for "Still working" status
    stillWorkingTimerRef.current = setTimeout(() => {
      setStatus("still-working");
    }, STILL_WORKING_TIMEOUT);

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      clearTimers();

      if (response.ok) {
        const data = await response.json();
        setInput("");
        await loadHistory();
        onMessageSent?.(data);
        // Check for council error (fail loudly)
        if (data.error) {
          setError(data.error);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Request failed (${response.status})`);
      }
    } catch (err) {
      clearTimers();
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      clearTimers();
      setSending(false);
      setStatus("idle");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full flex-col" data-testid="project-chat">
      {/* AI Mode Banner */}
      <div className="p-4 pb-0">
        <AiModeBanner />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && status === "idle" ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Start a conversation about your project</p>
              <p className="text-xs">Ask for features, report issues, or request changes</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={msg.role === "user" ? "chat-message-user" : "chat-message-ai"}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="mt-1 text-xs opacity-70">
                    {msg.createdAt.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {/* Processing Status Indicator */}
            {status !== "idle" && (
              <div className="flex justify-start" data-testid="chat-status-indicator">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {STATUS_MESSAGES[status]}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-2 rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive" data-testid="chat-error">
          ⚠️ {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={sending ? STATUS_MESSAGES[status] || "Processing..." : "Type your message..."}
            className="min-h-[60px] resize-none"
            data-testid="message-input"
            disabled={sending}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            size="icon"
            className="h-[60px] w-[60px]"
            data-testid="send-button"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
