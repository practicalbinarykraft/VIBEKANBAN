/**
 * GitHub Pull Request Status Sync
 *
 * Responsibility: Fetch and normalize PR status from GitHub
 *
 * Why separate file:
 * - Single responsibility: PR status operations only
 * - Keeps file size under 200 LOC limit
 * - Easy to test status mapping logic
 */

export type PrStatus = 'open' | 'closed' | 'merged';

export interface GetPullRequestParams {
  repoOwner: string;
  repoName: string;
  prNumber: number;
}

export interface PullRequestStatus {
  state: PrStatus;
  merged_at: string | null;
}

/**
 * Map GitHub PR state to our internal enum
 *
 * GitHub PR states:
 * - state="open" → "open"
 * - state="closed" + merged_at != null → "merged"
 * - state="closed" + merged_at == null → "closed"
 *
 * Why separate function:
 * - Testable in isolation
 * - Single source of truth for status mapping
 * - Handles edge cases (unknown states, null vs undefined)
 */
export function mapPrStatus(
  state: string,
  merged_at: string | null | undefined
): PrStatus {
  // If merged_at is set, PR was merged (regardless of state)
  if (merged_at) {
    return 'merged';
  }

  // Map GitHub state to our enum
  if (state === 'open') {
    return 'open';
  }

  if (state === 'closed') {
    return 'closed';
  }

  // Unknown state - default to open (safest assumption)
  return 'open';
}

/**
 * Fetch PR status from GitHub API
 *
 * Uses GitHub REST API v3: GET /repos/{owner}/{repo}/pulls/{pull_number}
 * https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request
 *
 * @throws Error if GITHUB_TOKEN is missing
 * @throws Error if parameters are invalid
 * @throws Error if GitHub API returns error (401, 403, 404, etc.)
 */
export async function getPullRequest(
  params: GetPullRequestParams
): Promise<PullRequestStatus> {
  // Validate environment
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required for fetching PR status');
  }

  // Validate required parameters
  if (!params.repoOwner) {
    throw new Error('repoOwner is required');
  }
  if (!params.repoName) {
    throw new Error('repoName is required');
  }
  if (!params.prNumber || params.prNumber <= 0) {
    throw new Error('prNumber must be a positive integer');
  }

  // Prepare GitHub API request
  const apiUrl = `https://api.github.com/repos/${params.repoOwner}/${params.repoName}/pulls/${params.prNumber}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'vibe-kanban-agent',
      },
    });

    // Handle error responses
    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `GitHub API error (${response.status})`;

      // Parse error details if available
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.message) {
          errorMessage += `: ${errorJson.message}`;
        }
      } catch {
        // If error body is not JSON, use raw text
        errorMessage += `: ${errorBody}`;
      }

      // Provide helpful context for common errors
      if (response.status === 401) {
        errorMessage += ' - Check that GITHUB_TOKEN is valid';
      } else if (response.status === 403) {
        errorMessage += ' - Check that token has repo permissions';
      } else if (response.status === 404) {
        errorMessage += ' - Pull request not found or repository not accessible';
      }

      throw new Error(errorMessage);
    }

    // Parse successful response
    const prData = await response.json();
    const normalizedStatus = mapPrStatus(prData.state, prData.merged_at);

    return {
      state: normalizedStatus,
      merged_at: prData.merged_at || null,
    };
  } catch (error) {
    // Re-throw with context if it's a fetch error
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new Error(`Failed to connect to GitHub API: ${error.message}`);
    }
    throw error;
  }
}
