/**
 * Planning logic - pure functions for planning feature
 *
 * Deterministic mode selection based on ideaText content
 */

export type ProductMode = 'QUESTIONS' | 'PLAN';

/**
 * Determines the product result mode based on idea text
 *
 * Rules (deterministic, no randomness):
 * - If ideaText contains "MVP" (case insensitive) → PLAN
 * - If ideaText contains "быстро" (case insensitive) → PLAN
 * - Otherwise → QUESTIONS
 */
export function determineProductMode(ideaText: string): ProductMode {
  const lowerText = ideaText.toLowerCase();

  if (lowerText.includes('mvp') || lowerText.includes('быстро')) {
    return 'PLAN';
  }

  return 'QUESTIONS';
}

/**
 * Mock questions for QUESTIONS mode
 */
export const MOCK_QUESTIONS = [
  'Кто целевая аудитория вашего приложения?',
  'Какие основные функции должны быть в первой версии?',
  'Есть ли бюджетные ограничения для проекта?',
  'Какие платформы вы хотите поддерживать (веб, мобильные)?',
];

/**
 * Mock plan steps for PLAN mode
 */
export const MOCK_PLAN_STEPS = [
  {
    title: 'Этап 1: Настройка проекта',
    tasks: [
      'Инициализировать репозиторий',
      'Настроить CI/CD',
      'Создать базовую структуру',
    ],
  },
  {
    title: 'Этап 2: Базовый функционал',
    tasks: [
      'Реализовать аутентификацию',
      'Создать основные компоненты UI',
      'Настроить API endpoints',
    ],
  },
  {
    title: 'Этап 3: MVP релиз',
    tasks: [
      'Провести тестирование',
      'Исправить критические баги',
      'Подготовить документацию',
    ],
  },
];
