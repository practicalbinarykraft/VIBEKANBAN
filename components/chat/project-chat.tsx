/**
 * ProjectChat - Main chat interface for project (PR-127: Chat UX Fix)
 *
 * Features:
 * - Optimistic UI: user message appears instantly
 * - TypingIndicator: animated dots while AI responds
 * - No text-based status messages
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare } from "lucide-react";
import { AiModeBanner } from "@/components/ai/ai-mode-banner";
import { TypingIndicator } from "./typing-indicator";

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
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    loadHistory();
  }, [projectId]);

  // Auto-scroll to bottom when messages change or typing starts
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userContent = input.trim();
    const tempId = `temp-${Date.now()}`;

    // 1. OPTIMISTIC UI: Add user message immediately
    const optimisticMessage: ChatMessage = {
      id: tempId,
      role: "user",
      content: userContent,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    // 2. Clear input immediately
    setInput("");

    // 3. Show typing indicator
    setIsTyping(true);
    setError(null);

    try {
      // 4. Send to server
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userContent }),
      });

      if (response.ok) {
        const data = await response.json();

        // 5. Replace optimistic message with real one + add AI response
        setMessages(prev => {
          const withoutTemp = prev.filter(m => m.id !== tempId);
          return [
            ...withoutTemp,
            {
              ...data.userMessage,
              createdAt: new Date(data.userMessage.createdAt),
            },
            {
              ...data.productMessage,
              createdAt: new Date(data.productMessage.createdAt),
            },
          ];
        });

        onMessageSent?.(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Request failed (${response.status})`);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsTyping(false);
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
      {/* Header */}
      <div className="flex-shrink-0 border-b p-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">PM Chat</h3>
        </div>
        <AiModeBanner />
      </div>

      {/* Messages Container - chat window feel */}
      <div className="flex-1 overflow-y-auto" data-testid="chat-messages-container">
        <div className="p-4 space-y-4 min-h-full flex flex-col">
          {messages.length === 0 && !isTyping ? (
            /* Empty state - inside container, not centered on full height */
            <div className="flex-1 flex items-center justify-center" data-testid="chat-empty-state">
              <div className="text-center p-6 rounded-lg bg-muted/30">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Start a conversation about your project</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Ask for features, report issues, or request changes</p>
              </div>
            </div>
          ) : (
            <>
              {/* Spacer to push messages to bottom when few messages */}
              <div className="flex-1" />
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
              {/* Typing Indicator - animated dots */}
              {isTyping && <TypingIndicator />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-2 rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive" data-testid="chat-error">
          {error}
        </div>
      )}

      {/* Input - pinned to bottom */}
      <div className="flex-shrink-0 border-t p-4 bg-background">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="min-h-[60px] resize-none"
            data-testid="message-input"
            disabled={isTyping}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            size="icon"
            className="h-[60px] w-[60px]"
            data-testid="send-button"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
