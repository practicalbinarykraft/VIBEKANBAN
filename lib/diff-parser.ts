import { DiffFile } from "@/types";

/**
 * Parses unified diff format into structured DiffFile objects
 * Supports multiple files and calculates real additions/deletions
 */
export function parseUnifiedDiff(diffContent: string): DiffFile[] {
  if (!diffContent || !diffContent.trim()) {
    return [];
  }

  try {
    const files: DiffFile[] = [];
    const lines = diffContent.split("\n");

    let currentFile: {
      path: string;
      additions: number;
      deletions: number;
      changes: string[];
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // New file starts with "diff --git"
      if (line.startsWith("diff --git ")) {
        // Save previous file if exists
        if (currentFile) {
          files.push({
            path: currentFile.path,
            additions: currentFile.additions,
            deletions: currentFile.deletions,
            changes: currentFile.changes.join("\n"),
          });
        }

        // Extract file path from "diff --git a/path/file.ts b/path/file.ts"
        const match = line.match(/diff --git a\/(.+?) b\/(.+?)$/);
        const filePath = match ? match[2] : "Unknown file";

        currentFile = {
          path: filePath,
          additions: 0,
          deletions: 0,
          changes: [],
        };
      }

      // Accumulate all lines for this file
      if (currentFile) {
        currentFile.changes.push(line);

        // Count additions (lines starting with +, but not +++)
        if (line.startsWith("+") && !line.startsWith("+++")) {
          currentFile.additions++;
        }

        // Count deletions (lines starting with -, but not ---)
        if (line.startsWith("-") && !line.startsWith("---")) {
          currentFile.deletions++;
        }
      }
    }

    // Save last file
    if (currentFile) {
      files.push({
        path: currentFile.path,
        additions: currentFile.additions,
        deletions: currentFile.deletions,
        changes: currentFile.changes.join("\n"),
      });
    }

    // If no files were parsed, return fallback
    if (files.length === 0) {
      return createFallbackDiff(diffContent);
    }

    return files;
  } catch (error) {
    console.error("Error parsing unified diff:", error);
    return createFallbackDiff(diffContent);
  }
}

/**
 * Creates fallback DiffFile when parsing fails
 */
function createFallbackDiff(content: string): DiffFile[] {
  // Count additions and deletions from raw content
  const lines = content.split("\n");
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      additions++;
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      deletions++;
    }
  }

  return [
    {
      path: "Changes",
      additions,
      deletions,
      changes: content,
    },
  ];
}
