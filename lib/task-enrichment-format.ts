/**
 * Task Enrichment Format Helper
 *
 * Pure functions for formatting task enrichment fields in UI.
 * Handles null/undefined gracefully for backward compatibility.
 */

type Estimate = 'S' | 'M' | 'L';
type Priority = 'P1' | 'P2' | 'P3';

/**
 * Formats estimate value for display
 * Returns "—" for missing values
 */
export function formatEstimate(estimate: string | null | undefined): string {
  if (!estimate) return '—';
  return estimate;
}

/**
 * Formats priority value for display
 * Returns "—" for missing values
 */
export function formatPriority(priority: string | null | undefined): string {
  if (!priority) return '—';
  return priority;
}

/**
 * Safely parses tags JSON string to array
 * Returns empty array for invalid/missing values
 */
export function parseTags(tagsJson: string | null | undefined): string[] {
  if (!tagsJson) return [];

  try {
    const parsed = JSON.parse(tagsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Returns Tailwind color class for priority
 * P1 (high) = red, P2 (medium) = yellow, P3 (low) = green
 */
export function getPriorityColor(priority: string | null | undefined): string {
  switch (priority) {
    case 'P1':
      return 'text-red-500';
    case 'P2':
      return 'text-yellow-500';
    case 'P3':
      return 'text-green-500';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Returns Tailwind color class for estimate
 * S (small) = green, M (medium) = yellow, L (large) = red
 */
export function getEstimateColor(estimate: string | null | undefined): string {
  switch (estimate) {
    case 'S':
      return 'text-green-500';
    case 'M':
      return 'text-yellow-500';
    case 'L':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}
