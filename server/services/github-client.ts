/**
 * GitHub Client - Main entry point (backwards compatibility)
 *
 * This file re-exports all GitHub-related functionality for backward compatibility.
 * Actual implementations are in modular files under server/services/github/
 *
 * Why this structure:
 * - Keeps each module under 200 LOC limit
 * - Single responsibility per file
 * - Maintains backward compatibility with existing imports
 * - Easy to test each module in isolation
 */

// URL parsing
export { parseGitHubUrl, type GitHubRepo } from './github/url';

// PR creation
export {
  createPullRequest,
  type CreatePullRequestParams,
  type PullRequestResult,
} from './github/pr-create';

// PR status sync
export {
  getPullRequest,
  mapPrStatus,
  type GetPullRequestParams,
  type PullRequestStatus,
  type PrStatus,
} from './github/pr-status';
