/**
 * Backlog Chunker - deterministic PR-sized batch generator
 * Splits 30-200 tasks into batches of 8-12 tasks for manageable PRs.
 * No randomness - uses stable hash for deterministic output.
 */

export interface Batch {
  batchId: string;
  title: string;
  tasks: string[];
  rationale: string;
  risk: 'low' | 'med' | 'high';
}

export interface ChunkConfig {
  minBatchSize?: number;
  maxBatchSize?: number;
}

function stableHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = (hash * 33) ^ str.charCodeAt(i);
  return hash >>> 0;
}

// Phase detection keywords for meaningful titles
const PHASES = [
  { keywords: ['init', 'setup', 'config', 'install'], name: 'Setup', risk: 'low' as const },
  { keywords: ['database', 'schema', 'migration', 'model'], name: 'Database', risk: 'med' as const },
  { keywords: ['auth', 'login', 'password', 'jwt', 'session'], name: 'Auth', risk: 'high' as const },
  { keywords: ['api', 'endpoint', 'route', 'validation'], name: 'API', risk: 'med' as const },
  { keywords: ['frontend', 'component', 'ui', 'form', 'layout'], name: 'UI', risk: 'low' as const },
  { keywords: ['test', 'e2e', 'coverage', 'integration'], name: 'Testing', risk: 'low' as const },
  { keywords: ['deploy', 'docker', 'ci', 'cd', 'production', 'cloud'], name: 'Deploy', risk: 'high' as const },
];

function detectPhase(tasks: string[]): { name: string; risk: 'low' | 'med' | 'high' } {
  const text = tasks.join(' ').toLowerCase();
  for (const phase of PHASES) {
    if (phase.keywords.some((k) => text.includes(k))) {
      return { name: phase.name, risk: phase.risk };
    }
  }
  return { name: 'Core', risk: 'med' };
}

function generateBatchId(tasks: string[], index: number): string {
  const content = tasks.join('|') + `|batch${index}`;
  return `batch-${stableHash(content).toString(16).padStart(8, '0')}`;
}

function generateRationale(tasks: string[], phase: string): string {
  const first = tasks[0]?.split(' ').slice(0, 3).join(' ') || 'tasks';
  return `${phase} phase: ${first} and ${tasks.length - 1} related tasks`;
}

/**
 * Chunk backlog into PR-sized batches
 * @param steps - Array of task strings (30-200 typically)
 * @param config - Optional batch size config
 * @returns Array of Batch objects
 */
export function chunkBacklog(steps: string[], config?: ChunkConfig): Batch[] {
  const minSize = config?.minBatchSize ?? 8;
  const maxSize = config?.maxBatchSize ?? 12;

  // Clean and filter tasks
  const cleanTasks = steps.map((s) => s.trim()).filter((s) => s.length > 0);

  if (cleanTasks.length === 0) return [];

  // If fewer tasks than minSize, return single batch
  if (cleanTasks.length <= minSize) {
    const phase = detectPhase(cleanTasks);
    return [{
      batchId: generateBatchId(cleanTasks, 0),
      title: `feat: ${phase.name} foundation (batch 1/1)`,
      tasks: cleanTasks,
      rationale: generateRationale(cleanTasks, phase.name),
      risk: phase.risk,
    }];
  }

  // Calculate optimal batch count
  const targetSize = Math.floor((minSize + maxSize) / 2); // 10 by default
  const batchCount = Math.ceil(cleanTasks.length / targetSize);

  // Distribute tasks evenly
  const batches: Batch[] = [];
  let taskIndex = 0;

  for (let i = 0; i < batchCount; i++) {
    const remaining = cleanTasks.length - taskIndex;
    const remainingBatches = batchCount - i;
    const batchSize = Math.ceil(remaining / remainingBatches);

    const batchTasks = cleanTasks.slice(taskIndex, taskIndex + batchSize);
    taskIndex += batchSize;

    if (batchTasks.length === 0) continue;

    const phase = detectPhase(batchTasks);
    batches.push({
      batchId: generateBatchId(batchTasks, i),
      title: `feat: ${phase.name} (batch ${i + 1}/${batchCount})`,
      tasks: batchTasks,
      rationale: generateRationale(batchTasks, phase.name),
      risk: phase.risk,
    });
  }

  return batches;
}
