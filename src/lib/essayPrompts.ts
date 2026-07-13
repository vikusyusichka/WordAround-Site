/* Prompt builders for the Essays feature. Kept separate from essayService so
   they stay pure + snapshot-testable. Language is baked into the prompt (the
   AI produces title/task text IN the target language). Response contracts are
   verbatim from iOS GeminiEssayAPIClient.essayTaskResponseContract so
   sanitizeTask decodes exactly what iOS decodes. */
import type { EssayDifficulty, GrammarLanguage } from '@/lib/essayTypes';

const ESSAY_TASK_RESPONSE_CONTRACT = `Return ONLY a JSON object that matches:
{"title":"<short topic title in target language>","task":"<one-paragraph essay prompt in target language>","detectedLevel":"A1|A2|B1|B2|C1|Native","estimatedTimeMinutes":12,"wordLimitMin":90,"wordLimitMax":150,"quickTips":["<2-5 word tip>","<2-5 word tip>","<2-5 word tip>"]}
Rules: estimatedTimeMinutes, wordLimitMin and wordLimitMax MUST be integers (not strings). quickTips MUST be an array of exactly 3 strings. Do not wrap the JSON in markdown or prose.`;

/** Prompt for the "Suggested" mode — the AI invents a topic. Passing recent
    `avoidTitles` reduces duplicates within a session. */
export const buildSuggestedTopicPrompt = (
  language: GrammarLanguage,
  avoidTitles: string[],
): string => {
  const lines = [
    'You generate one short essay-practice topic for a language learner.',
    `Write the topic title and the task entirely in ${language.title}.`,
    'Auto-detect the most suitable CEFR level (A1, A2, B1, B2, C1, or Native) based on topic complexity.',
    avoidTitles.length > 0
      ? `Do not reuse any of these titles: ${avoidTitles.join(' | ')}.`
      : '',
    'Avoid sensitive, medical, legal, violent, or sexual topics.',
    '',
    ESSAY_TASK_RESPONSE_CONTRACT,
  ];
  return lines.filter((l) => l.length > 0).join('\n');
};

/** Prompt for the "My topic" mode — the user seeds a keyword/phrase and the
    AI generates a proper practice task around it. */
export const buildCustomTopicPrompt = (
  topic: string,
  language: GrammarLanguage,
): string => {
  const lines = [
    'You generate one short essay-practice topic for a language learner.',
    `Write the topic title and the task entirely in ${language.title}.`,
    `Base the topic on the learner's idea: "${topic.trim()}".`,
    'Auto-detect the most suitable CEFR level (A1, A2, B1, B2, C1, or Native).',
    'Avoid sensitive, medical, legal, violent, or sexual topics.',
    '',
    ESSAY_TASK_RESPONSE_CONTRACT,
  ];
  return lines.join('\n');
};

/* MARK: - Hint prompt (essay_hints task) */

const HINT_RESPONSE_CONTRACT = `Return ONLY a JSON object that matches:
{"text":"<<=12 word hint in target language>","category":"content|grammar|vocabulary|structure"}
Do not wrap the JSON in markdown or prose.`;

/** Prompt for one short writing hint. Verbatim from iOS GeminiEssayAPIClient.generateHint.
    Essay text is truncated to 600 characters (iOS parity) to keep the prompt small. */
export const buildHintPrompt = (
  language: GrammarLanguage,
  level: EssayDifficulty,
  topicTitle: string,
  task: string,
  essayText: string,
  previousHints: string[],
): string => {
  const essayPreview = essayText.slice(0, 600);
  const lines = [
    'You give one short writing hint to a language learner.',
    `Writing language: ${language.title}. Learner CEFR level: ${level}.`,
    `Essay title: ${topicTitle}.`,
    `Essay task: ${task}.`,
    `Learner's draft so far: "${essayPreview}".`,
    previousHints.length > 0
      ? `Avoid repeating these earlier hints: ${previousHints.join(' | ')}.`
      : '',
    'The hint must be at most 12 words, must not write the essay for them, must match the learner\'s level, and must be actionable.',
    '',
    HINT_RESPONSE_CONTRACT,
  ];
  return lines.filter((l) => l.length > 0).join('\n');
};
