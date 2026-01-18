/**
 * Feature Flags System
 *
 * Centralized feature flag management for controlled feature rollout.
 * Use these flags to enable/disable features without breaking CI.
 *
 * @see docs/FEATURE_FLAGS.md for usage guide
 *
 * Environment Variables:
 * - FEATURE_* flags: Enable specific features
 * - VIBE_DEMO_MODE: Enable demo mode (simulated AI)
 * - PLAYWRIGHT: Enable test/mock mode
 *
 * Usage in code:
 *   import { FeatureFlags, isFeatureEnabled } from '@/lib/feature-flags'
 *   if (isFeatureEnabled('REAL_AI')) { ... }
 */

// ============================================================================
// Feature Flag Definitions
// ============================================================================

/**
 * All available feature flags
 */
export const FeatureFlagNames = {
  /** Enable real AI API calls (vs demo/mock mode) */
  REAL_AI: 'FEATURE_REAL_AI',

  /** Enable Autopilot v2 with batch processing */
  AUTOPILOT_V2: 'FEATURE_AUTOPILOT_V2',

  /** Enable Council dialogue system (EPIC-9) */
  COUNCIL_DIALOGUE: 'FEATURE_COUNCIL_DIALOGUE',

  /** Enable GitHub PR integration */
  GITHUB_PR: 'FEATURE_GITHUB_PR',

  /** Enable conflict resolution UI */
  CONFLICT_RESOLUTION: 'FEATURE_CONFLICT_RESOLUTION',

  /** Enable MCP server management */
  MCP_SERVERS: 'FEATURE_MCP_SERVERS',

  /** Enable experimental planning v3 */
  PLANNING_V3: 'FEATURE_PLANNING_V3',

  /** Enable debug mode (verbose logging) */
  DEBUG: 'FEATURE_DEBUG',
} as const;

export type FeatureFlagName = keyof typeof FeatureFlagNames;

// ============================================================================
// Feature Flag Checking Functions
// ============================================================================

/**
 * Check if a feature flag is enabled via environment variable
 *
 * @param flag - Feature flag name (key from FeatureFlagNames)
 * @returns true if the feature is enabled
 *
 * @example
 * if (isFeatureEnabled('REAL_AI')) {
 *   // Use real AI API
 * }
 */
export function isFeatureEnabled(flag: FeatureFlagName): boolean {
  const envVar = FeatureFlagNames[flag];
  const value = process.env[envVar];
  return value === '1' || value === 'true';
}

/**
 * Check if running in demo mode
 * Demo mode is enabled via VIBE_DEMO_MODE=1 or PLAYWRIGHT=1
 */
export function isDemoMode(): boolean {
  return (
    process.env.VIBE_DEMO_MODE === '1' ||
    process.env.PLAYWRIGHT === '1'
  );
}

/**
 * Check if running in test/E2E mode (Playwright)
 */
export function isTestMode(): boolean {
  return process.env.PLAYWRIGHT === '1';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

// ============================================================================
// Feature Flag Object (for client-side)
// ============================================================================

/**
 * Get all feature flags as an object
 * Useful for passing to client-side or logging
 */
export function getFeatureFlags(): Record<FeatureFlagName, boolean> {
  return {
    REAL_AI: isFeatureEnabled('REAL_AI'),
    AUTOPILOT_V2: isFeatureEnabled('AUTOPILOT_V2'),
    COUNCIL_DIALOGUE: isFeatureEnabled('COUNCIL_DIALOGUE'),
    GITHUB_PR: isFeatureEnabled('GITHUB_PR'),
    CONFLICT_RESOLUTION: isFeatureEnabled('CONFLICT_RESOLUTION'),
    MCP_SERVERS: isFeatureEnabled('MCP_SERVERS'),
    PLANNING_V3: isFeatureEnabled('PLANNING_V3'),
    DEBUG: isFeatureEnabled('DEBUG'),
  };
}

/**
 * Get environment mode information
 */
export function getEnvironmentMode(): {
  isDemoMode: boolean;
  isTestMode: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  nodeEnv: string;
} {
  return {
    isDemoMode: isDemoMode(),
    isTestMode: isTestMode(),
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}

// ============================================================================
// Feature Flag Constants (for reference)
// ============================================================================

/**
 * Default feature flag values
 * These are the defaults when no env var is set
 */
export const FeatureFlagDefaults: Record<FeatureFlagName, boolean> = {
  REAL_AI: false,         // Default to demo mode for safety
  AUTOPILOT_V2: false,    // Disabled until stable
  COUNCIL_DIALOGUE: true, // EPIC-9 is enabled by default
  GITHUB_PR: true,        // GitHub integration enabled
  CONFLICT_RESOLUTION: true, // Conflict UI enabled
  MCP_SERVERS: true,      // MCP management enabled
  PLANNING_V3: false,     // Experimental, disabled
  DEBUG: false,           // Debug logging disabled
};

/**
 * Feature flag descriptions for documentation
 */
export const FeatureFlagDescriptions: Record<FeatureFlagName, string> = {
  REAL_AI: 'Enable real AI API calls (requires API keys)',
  AUTOPILOT_V2: 'Enable Autopilot v2 with batch processing and approval gates',
  COUNCIL_DIALOGUE: 'Enable AI Council dialogue system for collaborative planning',
  GITHUB_PR: 'Enable GitHub Pull Request creation and management',
  CONFLICT_RESOLUTION: 'Enable merge conflict resolution UI',
  MCP_SERVERS: 'Enable MCP (Model Context Protocol) server management',
  PLANNING_V3: 'Enable experimental planning v3 with enhanced task breakdown',
  DEBUG: 'Enable debug mode with verbose logging',
};
