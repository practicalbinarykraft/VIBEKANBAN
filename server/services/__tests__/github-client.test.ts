/**
 * Unit tests for GitHub client
 * Run with: npx tsx server/services/__tests__/github-client.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { createPullRequest, parseGitHubUrl } from '../github-client';

/**
 * Test: parseGitHubUrl extracts owner and repo from GitHub URLs
 */
test('parseGitHubUrl - extracts owner and repo from HTTPS URL', () => {
  const result = parseGitHubUrl('https://github.com/owner/repo');
  assert.strictEqual(result.owner, 'owner');
  assert.strictEqual(result.repo, 'repo');
});

test('parseGitHubUrl - extracts owner and repo from HTTPS URL with .git', () => {
  const result = parseGitHubUrl('https://github.com/owner/repo.git');
  assert.strictEqual(result.owner, 'owner');
  assert.strictEqual(result.repo, 'repo');
});

test('parseGitHubUrl - extracts owner and repo from SSH URL', () => {
  const result = parseGitHubUrl('git@github.com:owner/repo.git');
  assert.strictEqual(result.owner, 'owner');
  assert.strictEqual(result.repo, 'repo');
});

test('parseGitHubUrl - throws on invalid URL', () => {
  assert.throws(
    () => parseGitHubUrl('invalid-url'),
    { message: /Invalid GitHub URL/ }
  );
});

/**
 * Test: createPullRequest creates PR via GitHub API
 */
test('createPullRequest - throws when GITHUB_TOKEN missing', async () => {
  const originalToken = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;

  await assert.rejects(
    async () => await createPullRequest({
      repoOwner: 'owner',
      repoName: 'repo',
      head: 'feature-branch',
      base: 'main',
      title: 'Test PR',
    }),
    { message: /GITHUB_TOKEN environment variable is required/ }
  );

  // Restore token if it existed
  if (originalToken) process.env.GITHUB_TOKEN = originalToken;
});

test('createPullRequest - throws when repo owner is empty', async () => {
  process.env.GITHUB_TOKEN = 'test-token';

  await assert.rejects(
    async () => await createPullRequest({
      repoOwner: '',
      repoName: 'repo',
      head: 'feature-branch',
      base: 'main',
      title: 'Test PR',
    }),
    { message: /repoOwner is required/ }
  );
});

test('createPullRequest - throws when repo name is empty', async () => {
  process.env.GITHUB_TOKEN = 'test-token';

  await assert.rejects(
    async () => await createPullRequest({
      repoOwner: 'owner',
      repoName: '',
      head: 'feature-branch',
      base: 'main',
      title: 'Test PR',
    }),
    { message: /repoName is required/ }
  );
});

test('createPullRequest - throws when head branch is empty', async () => {
  process.env.GITHUB_TOKEN = 'test-token';

  await assert.rejects(
    async () => await createPullRequest({
      repoOwner: 'owner',
      repoName: 'repo',
      head: '',
      base: 'main',
      title: 'Test PR',
    }),
    { message: /head branch is required/ }
  );
});

test('createPullRequest - throws when base branch is empty', async () => {
  process.env.GITHUB_TOKEN = 'test-token';

  await assert.rejects(
    async () => await createPullRequest({
      repoOwner: 'owner',
      repoName: 'repo',
      head: 'feature-branch',
      base: '',
      title: 'Test PR',
    }),
    { message: /base branch is required/ }
  );
});

test('createPullRequest - throws when title is empty', async () => {
  process.env.GITHUB_TOKEN = 'test-token';

  await assert.rejects(
    async () => await createPullRequest({
      repoOwner: 'owner',
      repoName: 'repo',
      head: 'feature-branch',
      base: 'main',
      title: '',
    }),
    { message: /title is required/ }
  );
});

console.log('✅ All GitHub client tests defined (TDD - implementation pending)');
