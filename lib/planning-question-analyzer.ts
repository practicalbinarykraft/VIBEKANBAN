/**
 * Planning Question Analyzer
 *
 * Determines if a project idea needs clarifying questions before planning.
 * Uses deterministic rules - no AI calls.
 */

export interface AnalysisResult {
  needsQuestions: boolean;
  questions?: string[];
  reason: string;
}

// Key details that indicate a well-formed idea
const KEY_DETAIL_PATTERNS = [
  /\b(ios|android|mobile|web|desktop|cli)\b/i,           // platform
  /\b(react|vue|angular|node|python|java|typescript)\b/i, // stack
  /\b(user|admin|customer|client|employee)\b/i,          // user type
  /\b(mvp|prototype|production|demo)\b/i,                 // scope
  /\b(api|database|auth|payment|dashboard)\b/i,          // features
  /\b(e-commerce|cms|crm|erp|saas)\b/i,                  // domain
];

// Base questions pool
const QUESTION_POOL = [
  "What platform should this run on? (web, mobile, desktop, CLI)",
  "Who are the target users?",
  "What is the primary goal or problem this solves?",
  "What tech stack do you prefer? (React, Vue, Node, Python, etc.)",
  "What are the must-have features for the first version?",
  "Do you need user authentication?",
  "Will this integrate with any external services or APIs?",
  "What's the expected scale? (personal project, small team, enterprise)",
];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasKeyDetails(text: string): boolean {
  return KEY_DETAIL_PATTERNS.some((pattern) => pattern.test(text));
}

// Simple deterministic hash for question selection
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateQuestions(idea: string): string[] {
  const hash = simpleHash(idea.toLowerCase());
  const count = 3 + (hash % 4); // 3-6 questions

  // Shuffle pool deterministically based on hash, then take first `count` items
  const shuffled = [...QUESTION_POOL];
  let seed = hash;
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff; // LCG
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

export function analyzeIdeaForQuestions(idea: string): AnalysisResult {
  const wordCount = countWords(idea);
  const hasDetails = hasKeyDetails(idea);

  // Key details override length requirements
  if (hasDetails) {
    return {
      needsQuestions: false,
      reason: "Idea contains sufficient details",
    };
  }

  // Very short prompts without key details need questions
  if (wordCount < 6) {
    return {
      needsQuestions: true,
      questions: generateQuestions(idea),
      reason: "Idea is too short (less than 6 words)",
    };
  }

  // Medium prompts without key details need questions
  if (wordCount < 20) {
    return {
      needsQuestions: true,
      questions: generateQuestions(idea),
      reason: "Idea is missing key details (platform, stack, users, or goal)",
    };
  }

  // Longer prompts (20+ words) don't need questions
  return {
    needsQuestions: false,
    reason: "Idea is detailed enough (20+ words)",
  };
}
