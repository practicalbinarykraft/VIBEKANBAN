# Feature Flags

This document describes how to use feature flags in VIBEKANBAN for controlled feature rollout.

## Quick Start

```typescript
import { isFeatureEnabled, isDemoMode } from '@/lib/feature-flags';

// Check specific feature
if (isFeatureEnabled('REAL_AI')) {
  // Use real AI API
}

// Check demo mode
if (isDemoMode()) {
  // Return mock/simulated responses
}
```

## Available Feature Flags

| Flag | Environment Variable | Default | Description |
|------|---------------------|---------|-------------|
| `REAL_AI` | `FEATURE_REAL_AI` | `false` | Enable real AI API calls (requires API keys) |
| `AUTOPILOT_V2` | `FEATURE_AUTOPILOT_V2` | `false` | Enable Autopilot v2 with batch processing |
| `COUNCIL_DIALOGUE` | `FEATURE_COUNCIL_DIALOGUE` | `true` | Enable AI Council dialogue system (EPIC-9) |
| `GITHUB_PR` | `FEATURE_GITHUB_PR` | `true` | Enable GitHub PR integration |
| `CONFLICT_RESOLUTION` | `FEATURE_CONFLICT_RESOLUTION` | `true` | Enable merge conflict resolution UI |
| `MCP_SERVERS` | `FEATURE_MCP_SERVERS` | `true` | Enable MCP server management |
| `PLANNING_V3` | `FEATURE_PLANNING_V3` | `false` | Experimental planning v3 |
| `DEBUG` | `FEATURE_DEBUG` | `false` | Enable debug mode with verbose logging |

## Environment Modes

In addition to feature flags, there are environment modes:

| Mode | Environment Variable | Description |
|------|---------------------|-------------|
| Demo Mode | `VIBE_DEMO_MODE=1` | Simulated AI responses |
| Test Mode | `PLAYWRIGHT=1` | E2E test mode (deterministic) |
| Development | `NODE_ENV=development` | Development environment |
| Production | `NODE_ENV=production` | Production environment |

## Enabling Flags

### Via .env file

```bash
# .env.local
FEATURE_REAL_AI=1
FEATURE_AUTOPILOT_V2=1
FEATURE_DEBUG=1
```

### Via command line

```bash
FEATURE_REAL_AI=1 npm run dev
```

### For CI/Testing

```bash
# E2E tests always run in test mode
PLAYWRIGHT=1 npm run test:e2e

# Enable specific features in test
PLAYWRIGHT=1 FEATURE_AUTOPILOT_V2=1 npm run test:e2e
```

## Usage Patterns

### Server-side (API routes)

```typescript
import { isFeatureEnabled, isDemoMode } from '@/lib/feature-flags';

export async function POST(request: Request) {
  if (isDemoMode()) {
    return Response.json({ result: 'mock response' });
  }

  if (!isFeatureEnabled('REAL_AI')) {
    return Response.json({ error: 'AI disabled' }, { status: 503 });
  }

  // Real AI logic
}
```

### Client-side (React components)

```typescript
'use client';

import { useEffect, useState } from 'react';

// Feature flags should be passed from server to client
// Don't read process.env directly in client components

export function FeatureComponent({ featureEnabled }: { featureEnabled: boolean }) {
  if (!featureEnabled) {
    return <div>Feature coming soon...</div>;
  }

  return <div>Feature content</div>;
}
```

### Conditional rendering

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';

export default function Page() {
  const showAutopilotV2 = isFeatureEnabled('AUTOPILOT_V2');

  return (
    <div>
      {showAutopilotV2 ? (
        <AutopilotV2Panel />
      ) : (
        <AutopilotV1Panel />
      )}
    </div>
  );
}
```

## Best Practices

### 1. One PR = One Feature Flag

When developing a new feature:
- Create a feature flag in `lib/feature-flags.ts`
- Gate all new code behind the flag
- Keep the flag disabled by default
- Enable only when feature is stable

### 2. Don't Break CI

```typescript
// Good: Feature is gated, CI passes
if (isFeatureEnabled('NEW_FEATURE')) {
  newFeatureCode();
}

// Bad: New code without gate may break tests
newFeatureCode(); // Might fail in CI
```

### 3. Clean Up Old Flags

Once a feature is stable and fully rolled out:
1. Remove the feature flag check
2. Remove the flag from `FeatureFlagNames`
3. Update this documentation

### 4. Test Both States

E2E tests should cover both enabled and disabled states:

```typescript
// e2e/specs/feature.spec.ts
test.describe('Feature X', () => {
  test('works when enabled', async ({ page }) => {
    // Test with feature enabled
  });

  test('shows fallback when disabled', async ({ page }) => {
    // Test without feature
  });
});
```

## Debugging

Get all feature flags:

```typescript
import { getFeatureFlags, getEnvironmentMode } from '@/lib/feature-flags';

console.log('Feature Flags:', getFeatureFlags());
console.log('Environment:', getEnvironmentMode());
```

Output:
```json
{
  "REAL_AI": false,
  "AUTOPILOT_V2": false,
  "COUNCIL_DIALOGUE": true,
  ...
}
{
  "isDemoMode": true,
  "isTestMode": false,
  "isDevelopment": true,
  "isProduction": false,
  "nodeEnv": "development"
}
```

## Migration Guide

### From hardcoded checks

Before:
```typescript
if (process.env.VIBE_DEMO_MODE === '1') {
  // demo code
}
```

After:
```typescript
import { isDemoMode } from '@/lib/feature-flags';

if (isDemoMode()) {
  // demo code
}
```

### Adding a new feature flag

1. Add to `FeatureFlagNames` in `lib/feature-flags.ts`:
   ```typescript
   MY_NEW_FEATURE: 'FEATURE_MY_NEW_FEATURE',
   ```

2. Add default in `FeatureFlagDefaults`:
   ```typescript
   MY_NEW_FEATURE: false,
   ```

3. Add description in `FeatureFlagDescriptions`:
   ```typescript
   MY_NEW_FEATURE: 'Description of what this feature does',
   ```

4. Update `getFeatureFlags()` to include the new flag

5. Document in this file
