/**
 * AI Status Configuration (PR-121)
 *
 * Contains reason configs and severity styles for AiStatusUnified component.
 */

import { Settings, Key, DollarSign, FlaskConical } from "lucide-react";

export type AiStatusReason =
  | "FEATURE_REAL_AI_DISABLED"
  | "MISSING_API_KEY"
  | "TEST_MODE_FORCED_MOCK"
  | "BUDGET_LIMIT_EXCEEDED";

export interface ReasonConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
  severity: "error" | "warning" | "info";
}

export const REASON_CONFIG: Record<AiStatusReason, ReasonConfig> = {
  FEATURE_REAL_AI_DISABLED: {
    icon: <Settings className="h-5 w-5" />,
    title: "Real AI is disabled",
    description: "Set FEATURE_REAL_AI=1 in environment variables to enable AI execution.",
    action: {
      label: "Learn how to enable",
    },
    severity: "warning",
  },
  MISSING_API_KEY: {
    icon: <Key className="h-5 w-5" />,
    title: "API key not configured",
    description: "Add your Anthropic API key below or set ANTHROPIC_API_KEY environment variable.",
    severity: "error",
  },
  TEST_MODE_FORCED_MOCK: {
    icon: <FlaskConical className="h-5 w-5" />,
    title: "Test mode active",
    description: "AI is using mock responses because test mode is enabled.",
    severity: "info",
  },
  BUDGET_LIMIT_EXCEEDED: {
    icon: <DollarSign className="h-5 w-5" />,
    title: "Budget limit reached",
    description: "Monthly spending limit exceeded. Increase the limit or wait for reset.",
    severity: "error",
  },
};

export const SEVERITY_STYLES = {
  error: {
    border: "border-red-200 dark:border-red-800",
    bg: "bg-red-50 dark:bg-red-950/30",
    iconBg: "bg-red-100 dark:bg-red-900/50",
    iconColor: "text-red-600 dark:text-red-400",
    titleColor: "text-red-800 dark:text-red-200",
    textColor: "text-red-700 dark:text-red-300",
  },
  warning: {
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    titleColor: "text-amber-800 dark:text-amber-200",
    textColor: "text-amber-700 dark:text-amber-300",
  },
  info: {
    border: "border-blue-200 dark:border-blue-800",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    titleColor: "text-blue-800 dark:text-blue-200",
    textColor: "text-blue-700 dark:text-blue-300",
  },
};
