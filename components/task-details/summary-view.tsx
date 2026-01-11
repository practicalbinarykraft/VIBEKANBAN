import { Artifact } from "@/types";

interface SummaryViewProps {
  artifacts: Artifact[];
}

export function SummaryView({ artifacts }: SummaryViewProps) {
  const summaryArtifact = artifacts.find((a) => a.type === "summary");

  if (!summaryArtifact) {
    return (
      <div className="h-full rounded border border-border bg-muted/10 flex items-center justify-center">
        <p className="text-xs text-muted-foreground/50">No summary available</p>
      </div>
    );
  }

  // Simple markdown-like rendering (basic for now)
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith("# ")) {
        return (
          <h1 key={index} className="text-lg font-bold mb-3 mt-2">
            {line.slice(2)}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={index} className="text-sm font-semibold mb-2 mt-3">
            {line.slice(3)}
          </h2>
        );
      }
      // Bold
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p key={index} className="text-xs mb-1">
            <strong>{line.slice(2, -2)}</strong>
          </p>
        );
      }
      // List items
      if (line.startsWith("- ")) {
        return (
          <li key={index} className="text-xs text-muted-foreground/80 ml-4 mb-1">
            {line.slice(2)}
          </li>
        );
      }
      // Empty line
      if (line.trim() === "") {
        return <div key={index} className="h-2" />;
      }
      // Regular text
      return (
        <p key={index} className="text-xs text-muted-foreground/80 mb-1">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="h-full rounded border border-border bg-muted/10 overflow-y-auto p-4">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        {renderContent(summaryArtifact.content)}
      </div>
    </div>
  );
}
