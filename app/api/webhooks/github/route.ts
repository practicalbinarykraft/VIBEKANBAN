import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts, processedWebhooks } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { verifyGitHubSignature, isTestMode } from "@/server/services/github/webhook-signature";
import { emitPRStatus } from "@/server/services/events-hub";
import { findProjectByRepoUrl, findAttemptByPRNumber } from "@/server/services/github/webhook-helpers";

/**
 * POST /api/webhooks/github
 *
 * Receives GitHub webhook events for pull_request changes
 * Updates PR status in real-time without manual sync
 *
 * Supported actions:
 * - opened, reopened → "open"
 * - closed + merged=true → "merged"
 * - closed + merged=false → "closed"
 *
 * Security: Validates HMAC SHA256 signature (bypassed in test mode)
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    // Validate signature in production mode
    if (!isTestMode()) {
      const secret = process.env.GITHUB_WEBHOOK_SECRET;
      if (!secret) {
        console.error('GITHUB_WEBHOOK_SECRET not configured');
        return NextResponse.json(
          { error: 'Webhook secret not configured' },
          { status: 500 }
        );
      }

      const signature = request.headers.get('x-hub-signature-256');
      const isValid = verifyGitHubSignature({
        secret,
        rawBody,
        signatureHeader: signature,
      });

      if (!isValid) {
        console.warn('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Only handle pull_request events
    const eventType = request.headers.get('x-github-event');
    if (eventType !== 'pull_request') {
      return NextResponse.json({ message: 'Event type not supported' }, { status: 200 });
    }

    // Check for duplicate delivery (idempotency)
    const deliveryId = request.headers.get('x-github-delivery');
    if (deliveryId) {
      const existing = await db
        .select()
        .from(processedWebhooks)
        .where(eq(processedWebhooks.deliveryId, deliveryId))
        .get();

      if (existing) {
        console.log(`Duplicate webhook delivery: ${deliveryId}`);
        return NextResponse.json({
          duplicate: true,
          message: 'Webhook already processed',
        }, { status: 200 });
      }
    }

    // Extract PR data
    const action = payload.action;
    const pr = payload.pull_request;
    const repo = payload.repository;

    if (!pr || !repo) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const prNumber = pr.number;
    const merged = pr.merged || false;
    const repoFullName = repo.full_name; // "owner/repo"
    const repoUrl = repo.html_url; // https://github.com/owner/repo

    // Map GitHub action to our internal status
    let newPrStatus: 'open' | 'merged' | 'closed';

    if (action === 'opened' || action === 'reopened') {
      newPrStatus = 'open';
    } else if (action === 'closed') {
      newPrStatus = merged ? 'merged' : 'closed';
    } else {
      // Ignore other actions (synchronize, edited, etc.)
      return NextResponse.json({ message: 'Action ignored' }, { status: 200 });
    }

    // Find project by repository URL
    const matchedProject = await findProjectByRepoUrl(repoUrl);
    if (!matchedProject) {
      console.log(`No project found for repo: ${repoUrl}`);
      return NextResponse.json({ message: 'Project not found' }, { status: 200 });
    }

    // Find attempt by PR number within this project
    const matchedAttempt = await findAttemptByPRNumber(matchedProject.id, prNumber);
    if (!matchedAttempt) {
      console.log(`No attempt found for PR #${prNumber} in project ${matchedProject.id}`);
      return NextResponse.json({ message: 'Attempt not found' }, { status: 200 });
    }

    // State guard: only update if status actually changed
    const currentPrStatus = matchedAttempt.prStatus;
    const statusChanged = currentPrStatus !== newPrStatus;

    if (statusChanged) {
      // Update PR status in database
      await db
        .update(attempts)
        .set({ prStatus: newPrStatus })
        .where(eq(attempts.id, matchedAttempt.id));

      // Emit SSE event for real-time UI update
      emitPRStatus({
        attemptId: matchedAttempt.id,
        prStatus: newPrStatus,
      });

      console.log(`Updated PR #${prNumber} status to ${newPrStatus} for attempt ${matchedAttempt.id}`);
    } else {
      console.log(`PR #${prNumber} status unchanged (${newPrStatus}), skipping update`);
    }

    // Record delivery ID to prevent replay
    if (deliveryId) {
      await db.insert(processedWebhooks).values({
        deliveryId,
        event: eventType || 'pull_request',
      });
    }

    return NextResponse.json({
      success: true,
      attemptId: matchedAttempt.id,
      prStatus: newPrStatus,
    });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
