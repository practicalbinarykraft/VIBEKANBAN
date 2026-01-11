/**
 * Unit tests for PR status mapping and fetching
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { mapPrStatus, getPullRequest } from '../github/pr-status';

/**
 * Test: mapPrStatus converts GitHub PR state to our enum
 */
test('mapPrStatus - returns "merged" when merged_at is set', () => {
  const result = mapPrStatus('closed', '2024-01-08T12:00:00Z');
  assert.strictEqual(result, 'merged');
});

test('mapPrStatus - returns "open" when state is open', () => {
  const result = mapPrStatus('open', null);
  assert.strictEqual(result, 'open');
});

test('mapPrStatus - returns "closed" when state is closed and not merged', () => {
  const result = mapPrStatus('closed', null);
  assert.strictEqual(result, 'closed');
});

test('mapPrStatus - handles undefined merged_at as null', () => {
  const result = mapPrStatus('closed', undefined);
  assert.strictEqual(result, 'closed');
});

test('mapPrStatus - returns "open" for unknown state', () => {
  const result = mapPrStatus('unknown-state' as any, null);
  assert.strictEqual(result, 'open');
});

/**
 * Test: getPullRequest fetches PR data from GitHub
 */
test('getPullRequest - throws when GITHUB_TOKEN missing', async () => {
  const originalToken = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;

  await assert.rejects(
    async () => await getPullRequest({
      repoOwner: 'owner',
      repoName: 'repo',
      prNumber: 42,
    }),
    { message: /GITHUB_TOKEN environment variable is required/ }
  );

  if (originalToken) process.env.GITHUB_TOKEN = originalToken;
});

test('getPullRequest - throws when repo owner is empty', async () => {
  process.env.GITHUB_TOKEN = 'test-token';

  await assert.rejects(
    async () => await getPullRequest({
      repoOwner: '',
      repoName: 'repo',
      prNumber: 42,
    }),
    { message: /repoOwner is required/ }
  );
});

test('getPullRequest - throws when repo name is empty', async () => {
  process.env.GITHUB_TOKEN = 'test-token';

  await assert.rejects(
    async () => await getPullRequest({
      repoOwner: 'owner',
      repoName: '',
      prNumber: 42,
    }),
    { message: /repoName is required/ }
  );
});

test('getPullRequest - throws when PR number is invalid', async () => {
  process.env.GITHUB_TOKEN = 'test-token';

  await assert.rejects(
    async () => await getPullRequest({
      repoOwner: 'owner',
      repoName: 'repo',
      prNumber: 0,
    }),
    { message: /prNumber must be a positive integer/ }
  );
});

console.log('✅ All PR status tests defined (TDD - implementation pending)');
