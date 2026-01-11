"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface IdeaFormProps {
  ideaText: string;
  isAnalyzing: boolean;
  onIdeaChange: (text: string) => void;
  onAnalyze: () => void;
}

export function IdeaForm({ ideaText, isAnalyzing, onIdeaChange, onAnalyze }: IdeaFormProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <label htmlFor="idea-input" className="mb-2 block text-sm font-medium">
        Describe your project idea
      </label>
      <textarea
        id="idea-input"
        data-testid="idea-input"
        className="h-32 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        placeholder="Example: Build a task management app with real-time collaboration and AI-powered insights..."
        value={ideaText}
        onChange={(e) => onIdeaChange(e.target.value)}
      />
      <Button
        onClick={onAnalyze}
        disabled={isAnalyzing || !ideaText.trim()}
        className="mt-4"
        data-testid="analyze-button"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Analyze Project
          </>
        )}
      </Button>
    </div>
  );
}
