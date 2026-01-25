/**
 * Chat Handler Tests (PR-127)
 *
 * Tests for language detection and chat mode functions.
 */

import { describe, it, expect } from "vitest";
import { detectLanguage } from "../chat-handler";

describe("Chat Handler", () => {
  describe("detectLanguage", () => {
    it("detects Russian text", () => {
      expect(detectLanguage("Привет, как дела?")).toBe("ru");
      expect(detectLanguage("Добавь авторизацию")).toBe("ru");
      expect(detectLanguage("Нужна страница настроек")).toBe("ru");
    });

    it("detects English text", () => {
      expect(detectLanguage("Hello, how are you?")).toBe("en");
      expect(detectLanguage("Add authentication")).toBe("en");
      expect(detectLanguage("I need a settings page")).toBe("en");
    });

    it("detects mixed text as Russian if contains Cyrillic", () => {
      expect(detectLanguage("Hello привет")).toBe("ru");
      expect(detectLanguage("Add авторизацию please")).toBe("ru");
    });

    it("treats numbers and symbols as English", () => {
      expect(detectLanguage("123")).toBe("en");
      expect(detectLanguage("@#$%")).toBe("en");
      expect(detectLanguage("API endpoint")).toBe("en");
    });

    it("handles empty string as English", () => {
      expect(detectLanguage("")).toBe("en");
    });

    it("handles whitespace-only as English", () => {
      expect(detectLanguage("   ")).toBe("en");
    });
  });
});
