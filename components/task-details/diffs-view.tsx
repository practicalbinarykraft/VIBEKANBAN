"use client";

import { useState } from "react";
import { DiffFile } from "@/types";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";

interface DiffsViewProps {
  diffs: DiffFile[];
}

export function DiffsView({ diffs }: DiffsViewProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleFile = (path: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFiles(newExpanded);
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedFiles(new Set());
    } else {
      setExpandedFiles(new Set(diffs.map((d) => d.path)));
    }
    setAllExpanded(!allExpanded);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-1 py-1 shrink-0">
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={toggleAll}>
          {allExpanded ? "Collapse All" : "Expand All"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 px-1">
        {diffs.map((diff) => {
          const isExpanded = expandedFiles.has(diff.path);
          return (
            <div key={diff.path} className="rounded border border-border bg-background text-xs">
              <div
                className="flex cursor-pointer items-center justify-between px-2 py-1.5 hover:bg-muted/50"
                onClick={() => toggleFile(diff.path)}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  )}
                  <span className="font-mono text-xs truncate">{diff.path}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-green-600 font-mono">
                    +{diff.additions}
                  </span>
                  <span className="text-[10px] text-red-600 font-mono">
                    -{diff.deletions}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="rounded p-0.5 hover:bg-muted"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-muted/20 p-2">
                  <pre className="overflow-x-auto text-[10px] font-mono leading-tight">
                    <code className="text-muted-foreground">{diff.changes}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
