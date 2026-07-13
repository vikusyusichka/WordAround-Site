/* Feature-layer service that composes the AI client + prompt builders +
   sanitization. All AI I/O for Essays goes through here. */
import * as aiClient from '@/lib/aiClient';
import {
  buildCustomTopicPrompt,
  buildHintPrompt,
  buildSuggestedTopicPrompt,
} from '@/lib/essayPrompts';
import {
  sanitizeHint,
  sanitizeTask,
  type EssayDifficulty,
  type EssayGeneratedHint,
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

/** iOS-verbatim fallback used when the AI returns a duplicate of a previous
    hint (matches EssayPracticeViewModel.preventDuplicateHint). */
const DUPLICATE_FALLBACK: EssayGeneratedHint = {
  id: 'fallback-duplicate',
  text: 'Add one clear supporting example.',
  category: 'structure',
};

/** Replace `hint` with the fallback if its text case-insensitively matches
    any string in `previousHints`. */
const dedupeHint = (hint: EssayGeneratedHint, previousHints: string[]): EssayGeneratedHint => {
  const normalized = hint.text.trim().toLowerCase();
  const isDup = previousHints.some((p) => p.trim().toLowerCase() === normalized);
  if (!isDup) return hint;
  return { ...DUPLICATE_FALLBACK, id: crypto.randomUUID() };
};

export interface GenerateHintArgs {
  language: GrammarLanguage;
  level: EssayDifficulty;
  topicTitle: string;
  task: string;
  essayText: string;
  previousHints: string[];
}

/** Ask the AI for one short writing hint. Sanitizes the response (12-word cap,
    category validation) and de-duplicates against `previousHints`. */
export const generateHint = async (
  args: GenerateHintArgs,
  signal?: AbortSignal,
): Promise<EssayGeneratedHint> => {
  const prompt = buildHintPrompt(
    args.language,
    args.level,
    args.topicTitle,
    args.task,
    args.essayText,
    args.previousHints,
  );
  const raw = await aiClient.generateJSON<Partial<EssayGeneratedHint>>(
    { prompt, task: 'essay_hints' },
    signal,
  );
  return dedupeHint(sanitizeHint(raw), args.previousHints);
};
