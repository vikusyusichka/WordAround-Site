/* Feature-layer service that composes the AI client + prompt builders +
   sanitization. All AI I/O for Essays goes through here. */
import * as aiClient from '@/lib/aiClient';
import { buildCustomTopicPrompt, buildSuggestedTopicPrompt } from '@/lib/essayPrompts';
import {
  sanitizeTask,
  type GeneratedEssayTask,
  type GrammarLanguage,
} from '@/lib/essayTypes';

/** Generate an AI-suggested topic. Retries once if the returned title is in
    the avoid list (matches iOS generateSuggestedTaskAvoidingDuplicates). */
export const generateSuggestedTask = async (
  language: GrammarLanguage,
  avoidTitles: string[],
  signal?: AbortSignal,
): Promise<GeneratedEssayTask> => {
  const attempt = async (avoid: string[]): Promise<GeneratedEssayTask> => {
    const prompt = buildSuggestedTopicPrompt(language, avoid);
    const raw = await aiClient.generateJSON<Partial<GeneratedEssayTask>>(
      { prompt, task: 'essay_generation' },
      signal,
    );
    return sanitizeTask(raw);
  };

  const first = await attempt(avoidTitles);
  const isDuplicate = avoidTitles.some(
    (t) => t.trim().toLowerCase() === first.title.trim().toLowerCase(),
  );
  if (!isDuplicate) return first;
  // One retry with the newly-suggested title also on the avoid list.
  return attempt([...avoidTitles, first.title]);
};

/** Generate a topic seeded by the user's own keyword. No retry — the topic
    is inherently constrained to what the user asked for. */
export const generateCustomTopicTask = async (
  topic: string,
  language: GrammarLanguage,
  signal?: AbortSignal,
): Promise<GeneratedEssayTask> => {
  const prompt = buildCustomTopicPrompt(topic, language);
  const raw = await aiClient.generateJSON<Partial<GeneratedEssayTask>>(
    { prompt, task: 'essay_generation' },
    signal,
  );
  return sanitizeTask(raw);
};
