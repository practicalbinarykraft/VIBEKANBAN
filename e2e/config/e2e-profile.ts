export type E2EProfile = 'local' | 'ci';

export function getE2EProfile(): E2EProfile {
  // EXPLICIT only - no auto-detect from process.env.CI
  const profile = process.env.E2E_PROFILE;
  if (profile === 'ci') return 'ci';
  return 'local'; // default
}
