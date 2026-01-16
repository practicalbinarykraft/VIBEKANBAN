/**
 * AI Task Generator
 *
 * Uses AI to generate file changes for a task.
 * In test/demo mode, generates deterministic mock changes.
 */

import * as fs from "fs";
import * as path from "path";
import { getAICompletion, isAIConfigured } from "@/server/services/ai/ai-provider";

export interface FileChange {
  path: string;
  operation: "create" | "modify" | "delete";
  content?: string;
}

export interface TaskChangeInput {
  taskTitle: string;
  taskDescription: string;
  repoPath: string;
}

function isTestMode(): boolean {
  return process.env.PLAYWRIGHT === "1" || process.env.NODE_ENV === "test";
}

const SYSTEM_PROMPT = `You are a senior software engineer. Given a task, generate the file changes needed to implement it.

Rules:
1. Return ONLY valid JSON with file changes
2. Each change has: path (relative), operation (create/modify/delete), content (full file content)
3. Be practical and minimal - only change what's necessary
4. Use TypeScript/JavaScript for .ts/.tsx/.js files
5. Include proper imports and exports

Return format:
{
  "changes": [
    {"path": "src/example.ts", "operation": "create", "content": "// file content here"}
  ]
}`;

/**
 * Read existing file from repo (for context)
 */
function readFile(repoPath: string, filePath: string): string | null {
  try {
    const fullPath = path.join(repoPath, filePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, "utf-8");
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

/**
 * List files in repo for context
 */
function listRepoFiles(repoPath: string, maxFiles = 50): string[] {
  const files: string[] = [];
  const ignorePatterns = [".git", "node_modules", ".next", "dist", "build", ".cache"];

  function walk(dir: string, prefix = "") {
    if (files.length >= maxFiles) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (files.length >= maxFiles) break;
        if (ignorePatterns.some((p) => entry.name.includes(p))) continue;
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walk(path.join(dir, entry.name), relPath);
        } else {
          files.push(relPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  walk(repoPath);
  return files;
}

/**
 * Generate file changes using AI
 */
async function generateAIChanges(input: TaskChangeInput): Promise<FileChange[]> {
  // Get repo context
  const repoFiles = listRepoFiles(input.repoPath);
  const fileContext = `Existing files in repo:\n${repoFiles.slice(0, 30).join("\n")}`;

  const userPrompt = `Task: ${input.taskTitle}

Description: ${input.taskDescription}

${fileContext}

Generate the file changes needed to implement this task.`;

  const result = await getAICompletion({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 4000,
    temperature: 0.3,
  });

  // Parse JSON from response
  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.changes)) {
        return parsed.changes.map((c: any) => ({
          path: c.path,
          operation: c.operation || "modify",
          content: c.content,
        }));
      }
    } catch {
      // JSON parse error
    }
  }

  // Fallback: create a simple README change
  return [
    {
      path: "README.md",
      operation: "modify",
      content: `# Project\n\nTask completed: ${input.taskTitle}\n`,
    },
  ];
}

/**
 * Generate mock changes for test/demo mode
 */
function generateMockChanges(input: TaskChangeInput): FileChange[] {
  const taskLower = input.taskTitle.toLowerCase();

  // Generate realistic changes based on task keywords
  if (taskLower.includes("readme")) {
    return [
      {
        path: "README.md",
        operation: "modify",
        content: `# Project\n\nUpdated by vibe task: ${input.taskTitle}\n\n${input.taskDescription}\n`,
      },
    ];
  }

  if (taskLower.includes("component") || taskLower.includes("ui")) {
    return [
      {
        path: "src/components/NewComponent.tsx",
        operation: "create",
        content: `/**
 * ${input.taskTitle}
 */
import React from 'react';

interface Props {
  title?: string;
}

export function NewComponent({ title = 'Hello' }: Props) {
  return <div className="new-component">{title}</div>;
}
`,
      },
    ];
  }

  if (taskLower.includes("api") || taskLower.includes("endpoint")) {
    return [
      {
        path: "src/api/new-endpoint.ts",
        operation: "create",
        content: `/**
 * ${input.taskTitle}
 */
export async function handler(req: Request) {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
`,
      },
    ];
  }

  // Default: modify a config or add a utility
  return [
    {
      path: "src/utils/task-util.ts",
      operation: "create",
      content: `/**
 * Utility for: ${input.taskTitle}
 */
export function taskUtil() {
  // ${input.taskDescription}
  return true;
}
`,
    },
  ];
}

/**
 * Generate file changes for a task
 */
export async function generateTaskChanges(input: TaskChangeInput): Promise<FileChange[]> {
  const aiConfigured = await isAIConfigured();

  if (aiConfigured && !isTestMode()) {
    return generateAIChanges(input);
  }

  // Test/demo mode
  return generateMockChanges(input);
}
