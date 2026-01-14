/**
 * Task DB Mapper
 *
 * Pure function that maps TaskDefinition from plan-to-tasks
 * to the format needed for database insertion.
 *
 * Handles:
 * - Serializing tags array to JSON string
 * - Adding enrichment marker to description for UI visibility
 * - Setting default status to 'todo'
 */

import type { TaskDefinition } from './plan-to-tasks';

export interface DbTaskInsert {
  title: string;
  description: string;
  order: number;
  estimate: string;
  priority: string;
  tags: string;
  status: string;
}

/**
 * Creates enrichment marker string for description prefix
 * Format: [P1][M][backend,infra]
 */
function createEnrichmentMarker(def: TaskDefinition): string {
  const tagsStr = def.tags.join(',');
  return `[${def.priority}][${def.estimate}][${tagsStr}]`;
}

/**
 * Maps TaskDefinition to database insert format
 *
 * @param def - TaskDefinition from plan-to-tasks
 * @returns Object ready for database insertion
 */
export function toDbTaskInsert(def: TaskDefinition): DbTaskInsert {
  const marker = createEnrichmentMarker(def);
  const descriptionWithMarker = `${marker}\n\n${def.description}`;

  return {
    title: def.title,
    description: descriptionWithMarker,
    order: def.order,
    estimate: def.estimate,
    priority: def.priority,
    tags: JSON.stringify(def.tags),
    status: 'todo',
  };
}
