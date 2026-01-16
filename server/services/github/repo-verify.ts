/**
 * GitHub Repository Verification Service
 *
 * Responsibility: Verify access to a GitHub repository
 *
 * Why separate file:
 * - Single responsibility: repo verification only
 * - Keeps file size under 200 LOC limit
 * - Isolates GitHub API interaction for testability
 */

import { parseGitHubUrl } from "./url";

export interface VerifyRepoResult {
  accessible: boolean;
  error?: string;
  repoOwner?: string;
  repoName?: string;
}

export interface VerifyRepoParams {
  gitUrl: string;
  githubToken?: string;
}

/**
 * Check if GITHUB_TOKEN is configured in environment
 */
export function hasGithubToken(): boolean {
  const token = process.env.GITHUB_TOKEN;
  return !!token && token.trim() !== "";
}

/**
 * Get the current GITHUB_TOKEN from environment
 * Returns undefined if not set
 */
export function getGithubToken(): string | undefined {
  const token = process.env.GITHUB_TOKEN;
  if (!token || token.trim() === "") {
    return undefined;
  }
  return token;
}

/**
 * Verify that we can access a GitHub repository
 *
 * Steps:
 * 1. Parse the git URL to extract owner/repo
 * 2. Make authenticated request to GitHub API
 * 3. Return success/failure with details
 */
export async function verifyRepoAccess(
  params: VerifyRepoParams
): Promise<VerifyRepoResult> {
  const { gitUrl, githubToken } = params;

  // Parse the URL
  const parsed = parseGitHubUrl(gitUrl);
  if (!parsed) {
    return {
      accessible: false,
      error: "Invalid GitHub URL format",
    };
  }

  const { owner, repo } = parsed;

  // No token - can't verify
  if (!githubToken) {
    return {
      accessible: false,
      error: "No GitHub token provided",
      repoOwner: owner,
      repoName: repo,
    };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "VibeKanban",
        },
      }
    );

    if (response.ok) {
      return {
        accessible: true,
        repoOwner: owner,
        repoName: repo,
      };
    }

    // Handle specific error cases
    if (response.status === 401) {
      return {
        accessible: false,
        error: "Invalid or expired GitHub token",
        repoOwner: owner,
        repoName: repo,
      };
    }

    if (response.status === 403) {
      return {
        accessible: false,
        error: "Token lacks permission to access this repository",
        repoOwner: owner,
        repoName: repo,
      };
    }

    if (response.status === 404) {
      return {
        accessible: false,
        error: "Repository not found or no access",
        repoOwner: owner,
        repoName: repo,
      };
    }

    return {
      accessible: false,
      error: `GitHub API error: ${response.status}`,
      repoOwner: owner,
      repoName: repo,
    };
  } catch (error) {
    return {
      accessible: false,
      error: error instanceof Error ? error.message : "Network error",
      repoOwner: owner,
      repoName: repo,
    };
  }
}
