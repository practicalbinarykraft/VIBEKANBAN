/**
 * Repo connection status computation logic.
 * Pure functions - no side effects, no API calls.
 */

export type ConnectionStatus =
  | "no_url"
  | "url_set"
  | "auth_ok"
  | "connected"
  | "error";

export type StatusColor = "gray" | "blue" | "green" | "red";

export interface VerificationResult {
  accessible: boolean;
  error?: string;
}

export interface ConnectionStatusInput {
  gitUrl?: string;
  githubToken?: string;
  verified?: boolean;
  verificationResult?: VerificationResult;
}

export interface ConnectionStatusResult {
  status: ConnectionStatus;
  label: string;
  color: StatusColor;
  error?: string;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; color: StatusColor }
> = {
  no_url: { label: "No URL", color: "gray" },
  url_set: { label: "Repo URL set", color: "gray" },
  auth_ok: { label: "Auth OK", color: "blue" },
  connected: { label: "Connected", color: "green" },
  error: { label: "Error", color: "red" },
};

export function computeConnectionStatus(
  input: ConnectionStatusInput
): ConnectionStatusResult {
  const { gitUrl, githubToken, verified, verificationResult } = input;

  // No URL provided
  if (!gitUrl || gitUrl.trim() === "") {
    return { ...STATUS_CONFIG.no_url, status: "no_url" };
  }

  // URL exists but no token
  if (!githubToken || githubToken.trim() === "") {
    return { ...STATUS_CONFIG.url_set, status: "url_set" };
  }

  // Token exists but not verified yet
  if (!verified) {
    return { ...STATUS_CONFIG.auth_ok, status: "auth_ok" };
  }

  // Verified - check result
  if (verificationResult?.accessible) {
    return { ...STATUS_CONFIG.connected, status: "connected" };
  }

  // Verification failed
  return {
    ...STATUS_CONFIG.error,
    status: "error",
    error: verificationResult?.error,
  };
}
