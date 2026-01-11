/**
 * GitHub Pull Request Creation
 *
 * Responsibility: Create pull requests via GitHub API
 *
 * Why separate file:
 * - Single responsibility: only PR creation logic
 * - Keeps file size under 200 LOC limit
 * - Easy to test and maintain
 */

export interface CreatePullRequestParams {
  repoOwner: string;
  repoName: string;
  head: string; // Source branch (e.g., "vibe/task-123/abc")
  base: string; // Target branch (e.g., "main")
  title: string;
  body?: string;
}

export interface PullRequestResult {
  number: number;
  url: string;
  state: 'open';
}

/**
 * Create a pull request on GitHub
 *
 * Uses GitHub REST API v3: POST /repos/{owner}/{repo}/pulls
 * https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request
 *
 * @throws Error if GITHUB_TOKEN is missing
 * @throws Error if parameters are invalid
 * @throws Error if GitHub API returns error (401, 403, 404, 422, etc.)
 */
export async function createPullRequest(
  params: CreatePullRequestParams
): Promise<PullRequestResult> {
  // Validate environment
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required for creating pull requests');
  }

  // Validate required parameters
  if (!params.repoOwner) {
    throw new Error('repoOwner is required');
  }
  if (!params.repoName) {
    throw new Error('repoName is required');
  }
  if (!params.head) {
    throw new Error('head branch is required');
  }
  if (!params.base) {
    throw new Error('base branch is required');
  }
  if (!params.title) {
    throw new Error('title is required');
  }

  // Prepare GitHub API request
  const apiUrl = `https://api.github.com/repos/${params.repoOwner}/${params.repoName}/pulls`;
  const requestBody = {
    title: params.title,
    head: params.head,
    base: params.base,
    body: params.body || '',
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'vibe-kanban-agent',
      },
      body: JSON.stringify(requestBody),
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
        errorMessage += ' - Check that repository exists and is accessible';
      } else if (response.status === 422) {
        errorMessage += ' - Check that branch exists and PR does not already exist';
      }

      throw new Error(errorMessage);
    }

    // Parse successful response
    const prData = await response.json();

    return {
      number: prData.number,
      url: prData.html_url,
      state: 'open',
    };
  } catch (error) {
    // Re-throw with context if it's a fetch error
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new Error(`Failed to connect to GitHub API: ${error.message}`);
    }
    throw error;
  }
}
