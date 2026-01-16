import { describe, it, expect } from "vitest";
import {
  computeConnectionStatus,
  ConnectionStatus,
  ConnectionStatusResult,
} from "../repo-connection-status";

describe("repo-connection-status", () => {
  describe("computeConnectionStatus", () => {
    it("returns 'no_url' when gitUrl is empty", () => {
      const result = computeConnectionStatus({ gitUrl: "" });
      expect(result.status).toBe<ConnectionStatus>("no_url");
    });

    it("returns 'no_url' when gitUrl is undefined", () => {
      const result = computeConnectionStatus({ gitUrl: undefined });
      expect(result.status).toBe<ConnectionStatus>("no_url");
    });

    it("returns 'url_set' when gitUrl exists but no token provided", () => {
      const result = computeConnectionStatus({
        gitUrl: "https://github.com/owner/repo",
        githubToken: undefined,
      });
      expect(result.status).toBe<ConnectionStatus>("url_set");
    });

    it("returns 'auth_missing' when token is empty string", () => {
      const result = computeConnectionStatus({
        gitUrl: "https://github.com/owner/repo",
        githubToken: "",
      });
      expect(result.status).toBe<ConnectionStatus>("url_set");
    });

    it("returns 'auth_ok' when token exists but not verified", () => {
      const result = computeConnectionStatus({
        gitUrl: "https://github.com/owner/repo",
        githubToken: "ghp_valid_token",
        verified: false,
      });
      expect(result.status).toBe<ConnectionStatus>("auth_ok");
    });

    it("returns 'connected' when verified successfully", () => {
      const result = computeConnectionStatus({
        gitUrl: "https://github.com/owner/repo",
        githubToken: "ghp_valid_token",
        verified: true,
        verificationResult: { accessible: true },
      });
      expect(result.status).toBe<ConnectionStatus>("connected");
    });

    it("returns 'error' when verification failed", () => {
      const result = computeConnectionStatus({
        gitUrl: "https://github.com/owner/repo",
        githubToken: "ghp_valid_token",
        verified: true,
        verificationResult: { accessible: false, error: "404 Not Found" },
      });
      expect(result.status).toBe<ConnectionStatus>("error");
      expect(result.error).toBe("404 Not Found");
    });
  });

  describe("status display properties", () => {
    it("no_url has gray color", () => {
      const result = computeConnectionStatus({ gitUrl: "" });
      expect(result.color).toBe("gray");
      expect(result.label).toBe("No URL");
    });

    it("url_set has gray color", () => {
      const result = computeConnectionStatus({
        gitUrl: "https://github.com/owner/repo",
      });
      expect(result.color).toBe("gray");
      expect(result.label).toBe("Repo URL set");
    });

    it("auth_ok has blue color", () => {
      const result = computeConnectionStatus({
        gitUrl: "https://github.com/owner/repo",
        githubToken: "ghp_token",
        verified: false,
      });
      expect(result.color).toBe("blue");
      expect(result.label).toBe("Auth OK");
    });

    it("connected has green color", () => {
      const result = computeConnectionStatus({
        gitUrl: "https://github.com/owner/repo",
        githubToken: "ghp_token",
        verified: true,
        verificationResult: { accessible: true },
      });
      expect(result.color).toBe("green");
      expect(result.label).toBe("Connected");
    });

    it("error has red color", () => {
      const result = computeConnectionStatus({
        gitUrl: "https://github.com/owner/repo",
        githubToken: "ghp_token",
        verified: true,
        verificationResult: { accessible: false, error: "Forbidden" },
      });
      expect(result.color).toBe("red");
      expect(result.label).toBe("Error");
    });
  });
});
