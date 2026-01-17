import { APIRequestContext } from '@playwright/test';
import { apiUrl } from './base-url';

/**
 * Send GitHub webhook for PR status change
 *
 * Centralized helper to reduce duplication in webhook E2E tests
 */
export async function sendPRWebhook(
  request: APIRequestContext,
  options: {
    action: 'opened' | 'reopened' | 'closed';
    prNumber: number;
    merged?: boolean;
    repoFullName?: string;
    repoUrl?: string;
    deliveryId?: string;
  }
) {
  const {
    action,
    prNumber,
    merged = false,
    repoFullName = 'practicalbinarykraft/VIBEKANBAN',
    repoUrl = 'https://github.com/practicalbinarykraft/VIBEKANBAN',
    deliveryId,
  } = options;

  const headers: Record<string, string> = {
    'X-GitHub-Event': 'pull_request',
    'Content-Type': 'application/json',
  };

  if (deliveryId) {
    headers['X-GitHub-Delivery'] = deliveryId;
  }

  return request.post(apiUrl('/api/webhooks/github'), {
    data: {
      action,
      pull_request: {
        number: prNumber,
        merged,
        html_url: `${repoUrl}/pull/${prNumber}`,
      },
      repository: {
        full_name: repoFullName,
        html_url: repoUrl,
      },
    },
    headers,
  });
}
