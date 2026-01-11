/**
 * GitHub URL Parsing Utilities
 *
 * Responsibility: Parse GitHub repository URLs to extract owner and repo name
 *
 * Why separate file:
 * - Single responsibility: only URL parsing logic
 * - Reusable across different GitHub operations
 * - Easy to test in isolation
 */

export interface GitHubRepo {
  owner: string;
  repo: string;
}

/**
 * Parse GitHub URL to extract owner and repo name
 *
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 *
 * @throws Error if URL format is not recognized
 */
export function parseGitHubUrl(gitUrl: string): GitHubRepo {
  // HTTPS format: https://github.com/owner/repo(.git)?
  const httpsMatch = gitUrl.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/\.]+)(\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // SSH format: git@github.com:owner/repo.git
  const sshMatch = gitUrl.match(/^git@github\.com:([^\/]+)\/([^\/\.]+)(\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  throw new Error(`Invalid GitHub URL format: ${gitUrl}`);
}
