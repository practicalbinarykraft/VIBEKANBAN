#!/usr/bin/env npx tsx
/**
 * Gate CLI - Runs Definition of Done checks and produces reports
 *
 * Usage: npm run gate
 * Outputs: done-report.json, done-report.md
 */

import { writeFileSync } from 'fs';
import { runGate, formatJsonReport, formatMarkdownReport } from '../lib/gate-runner';

async function main() {
  console.log('🚀 Running Definition of Done gate checks...\n');

  const result = await runGate();

  // Write reports
  writeFileSync('done-report.json', formatJsonReport(result));
  writeFileSync('done-report.md', formatMarkdownReport(result));

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log(formatMarkdownReport(result));
  console.log('='.repeat(50));

  console.log('\n📄 Reports written:');
  console.log('  - done-report.json');
  console.log('  - done-report.md\n');

  if (result.passed) {
    console.log('✅ All gate checks passed!');
    process.exit(0);
  } else {
    console.log('❌ Gate checks failed. See reports for details.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Gate runner error:', err);
  process.exit(1);
});
