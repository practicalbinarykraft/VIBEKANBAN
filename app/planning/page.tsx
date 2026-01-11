"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { IdeaForm } from "@/components/planning/idea-form";
import { PlanResults } from "@/components/planning/plan-results";

export default function PlanningPage() {
  const router = useRouter();
  const [ideaText, setIdeaText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'draft' | 'analyzing' | 'ready' | 'confirmed'>('draft');
  const [councilMessages, setCouncilMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState<any | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleAnalyze = async () => {
    if (!ideaText.trim()) return;

    setIsAnalyzing(true);
    try {
      // Create session
      const createRes = await fetch('/api/planning/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaText }),
      });

      if (!createRes.ok) throw new Error('Failed to create session');
      const session = await createRes.json();
      setSessionId(session.id);

      // Analyze session
      const analyzeRes = await fetch(`/api/planning/sessions/${session.id}/analyze`, {
        method: 'POST',
      });

      if (!analyzeRes.ok) throw new Error('Failed to analyze');

      // Fetch results
      const dataRes = await fetch(`/api/planning/sessions/${session.id}`);
      if (!dataRes.ok) throw new Error('Failed to fetch results');

      const data = await dataRes.json();
      setSessionStatus(data.status);
      setCouncilMessages(data.councilMessages || []);
      setDraft(data.draft);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze project idea');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!sessionId) return;

    setIsConfirming(true);
    try {
      const res = await fetch(`/api/planning/sessions/${sessionId}/confirm`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to confirm plan');

      const data = await res.json();
      // Redirect to created project
      router.push(`/projects/${data.projectId}`);
    } catch (error) {
      console.error('Confirm error:', error);
      alert('Failed to create project');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-3rem)] bg-muted/20">
        <div className="mx-auto max-w-full px-6 py-8">
          <div className="mb-6 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Planning</h1>
            {sessionStatus !== 'draft' && (
              <Badge
                variant="outline"
                className="ml-auto"
                data-testid="session-status"
              >
                {sessionStatus === 'ready' ? 'Ready' : sessionStatus}
              </Badge>
            )}
          </div>

          {sessionStatus === 'draft' ? (
            <IdeaForm
              ideaText={ideaText}
              isAnalyzing={isAnalyzing}
              onIdeaChange={setIdeaText}
              onAnalyze={handleAnalyze}
            />
          ) : (
            <PlanResults
              draft={draft}
              councilMessages={councilMessages}
              isConfirming={isConfirming}
              onConfirm={handleConfirm}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
