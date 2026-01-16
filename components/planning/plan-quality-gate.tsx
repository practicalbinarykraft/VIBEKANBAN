/**
 * PlanQualityGate - Shows validation status for plan quality
 *
 * Displays validation reasons when plan doesn't meet quality requirements.
 */

"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ValidationResult } from "@/lib/plan-validation";

interface PlanQualityGateProps {
  validation: ValidationResult;
}

export function PlanQualityGate({ validation }: PlanQualityGateProps) {
  if (validation.ok) {
    return (
      <div
        className="flex items-center gap-2 rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200"
        data-testid="plan-quality-gate"
      >
        <CheckCircle2 className="h-4 w-4" />
        <span>Plan meets quality requirements</span>
      </div>
    );
  }

  return (
    <div
      className="space-y-2 rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950"
      data-testid="plan-quality-gate"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
        <AlertCircle className="h-4 w-4" />
        <span>Plan needs improvement before approval</span>
      </div>
      <ul className="ml-6 list-disc space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
        {validation.reasons.map((reason, idx) => (
          <li key={reason.code} data-testid={`plan-quality-reason-${idx}`}>
            {reason.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
