/* Story Mode — web port of the StoryMode submodule: models, the verbatim
   prompt builder (first chapter / continuation with story memory / choices),
   generation via worker tasks `story_generation` + `story_choices`, choice
   parsing with fallbacks, per-length progress rules, and readingItems
   serialization (chapters as JSON in fullText). */
import { generateText } from '@/lib/aiClient';
import { findLanguage } from '@/lib/essayTypes';
import {
  normalizeReadingText,
  readingPreview,
  readingWordCount,
} from '@/lib/readingTextAnalyzer';
import { assistanceToToggles, DEFAULT_ASSISTANCE, DEFAULT_QUESTION_TYPES } from '@/lib/readingTypes';
import type { ReadingDifficulty, ReadingLibraryItem } from '@/lib/models';

/* --- Configuration --- */

export type StoryType = 'adventure' | 'fantasy' | 'mystery' | 'romance' | 'dailyLife';
export type StoryLength = 'shortStory' | 'multiChapter' | 'infinite';

export const STORY_TYPES: StoryType[] = ['adventure', 'fantasy', 'mystery', 'romance', 'dailyLife'];
export const STORY_LENGTHS: StoryLength[] = ['shortStory', 'multiChapter', 'infinite'];
export const STORY_DIFFICULTIES: ReadingDifficulty[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

const STORY_TYPE_TITLES: Record<StoryType, string> = {
  adventure: 'Adventure',
  fantasy: 'Fantasy',
  mystery: 'Mystery',
  romance: 'Romance',
  dailyLife: 'Daily Life',
};

/** iOS: multiChapter targets 5 chapters; infinite has no target; short = 1. */
export const chaptersTargetFor = (length: StoryLength): number =>
  length === 'multiChapter' ? 5 : length === 'shortStory' ? 1 : 0;

export const estimatedMinutesFor = (length: StoryLength): number =>
  length === 'shortStory' ? 5 : length === 'multiChapter' ? 15 : 10;

export interface StoryConfiguration {
  languageId: string;
  storyType: StoryType;
  storyLength: StoryLength;
  difficulty: ReadingDifficulty;
}

export interface StoryChoice {
  id: string;
  label: string;
}

export interface StoryChapter {
  id: string;
  chapterIndex: number;
  text: string;
  choices: StoryChoice[];
  madeChoiceLabel?: string;
  isCompleted: boolean;
  scorePercent?: number;
  readingTimeSeconds?: number;
}

export const chapterSummary = (chapter: StoryChapter): string =>
  chapter.text.length > 200 ? `${chapter.text.slice(0, 200)}…` : chapter.text;

/* --- Prompts (StoryPromptBuilder, verbatim) --- */

const FORMATTING_RULES = [
  'Formatting rules — follow exactly:',
  '- Return only the story text.',
  '- Do not use Markdown, bold, italics, headings, or bullet points.',
  '- Do not write a title or chapter heading.',
  '- Do not list the choices — only write the narrative.',
  '- Write normal paragraphs separated by a blank line.',
  '- Do not include intros, outros, or notes to the reader.',
].join('\n');

const unitNoun = (length: StoryLength): string =>
  length === 'shortStory' ? 'short story' : length === 'multiChapter' ? 'chapter' : 'episode';

const lengthInstruction = (length: StoryLength): string => {
  switch (length) {
    case 'shortStory':
      return 'Target length: about 250-350 words — a single, complete short story with a satisfying ending.';
    case 'multiChapter':
      return 'Target length: about 180-260 words for this chapter — part of a longer, continuing story.';
    case 'infinite':
      return 'Target length: about 160-240 words for this episode — part of an open-ended, continuing story.';
  }
};

const difficultyInstruction = (level: ReadingDifficulty): string => {
  switch (level) {
    case 'A1':
    case 'A2':
      return `CEFR level ${level}: use short sentences, common everyday vocabulary, and the present tense where possible.`;
    case 'B1':
    case 'B2':
      return `CEFR level ${level}: use medium-length sentences, common connectors, and a broader everyday vocabulary.`;
    default:
      return `CEFR level ${level}: use natural, varied sentence structures and advanced vocabulary.`;
  }
};

export const buildFirstChapterPrompt = (config: StoryConfiguration): string => {
  const language = findLanguage(config.languageId).title;
  return [
    `Write the opening ${unitNoun(config.storyLength)} of an interactive ${STORY_TYPE_TITLES[config.storyType].toLowerCase()} story in ${language}.`,
    lengthInstruction(config.storyLength),
    difficultyInstruction(config.difficulty),
    'Introduce a main character and a clear situation. End at a natural decision point so the reader can choose what happens next.',
    '',
    FORMATTING_RULES,
  ].join('\n');
};

/** Story memory = the last 3 chapters as "Chapter N: summary (reader chose: …)". */
export const buildStoryMemory = (chapters: StoryChapter[]): string => {
  const recent = chapters.slice(-3);
  if (recent.length === 0) return '(no previous chapters)';
  return recent
    .map((ch) => {
      const choice = ch.madeChoiceLabel ? ` (reader chose: ${ch.madeChoiceLabel})` : '';
      return `Chapter ${ch.chapterIndex}: ${chapterSummary(ch)}${choice}`;
    })
    .join('\n');
};

export const buildNextChapterPrompt = (
  config: StoryConfiguration,
  chapters: StoryChapter[],
  choiceLabel: string,
): string => {
  const language = findLanguage(config.languageId).title;
  return [
    `Continue an interactive ${STORY_TYPE_TITLES[config.storyType].toLowerCase()} story in ${language}.`,
    lengthInstruction(config.storyLength),
    difficultyInstruction(config.difficulty),
    '',
    'Story so far:',
    buildStoryMemory(chapters),
    '',
    `The reader chose: "${choiceLabel}".`,
    `Write the next ${unitNoun(config.storyLength)} that follows naturally from this choice, keeping characters and tone consistent. End at a new decision point.`,
    '',
    FORMATTING_RULES,
  ].join('\n');
};

export const buildChoicesPrompt = (
  config: StoryConfiguration,
  chapterText: string,
  count = 3,
): string => {
  const language = findLanguage(config.languageId).title;
  return [
    `Based on the ${STORY_TYPE_TITLES[config.storyType].toLowerCase()} story passage below, suggest exactly ${count} distinct things the main character could do next.`,
    `Write each option in ${language}, as a short action phrase (3 to 8 words).`,
    'Return only the options, one per line. No numbering, no bullets, no extra text.',
    '',
    'Passage:',
    chapterText,
  ].join('\n');
};

/* --- Choice parsing (StoryGenerationService.parseChoices) --- */

export const FALLBACK_CHOICES = ['Move forward carefully', 'Take a bold risk', 'Look for another way'];

export const parseChoices = (raw: string, max = 3): string[] => {
  const seen = new Set<string>();
  const parsed: string[] = [];
  for (const line of raw.split('\n')) {
    let cleaned = line.replace(/^\s*(\d+[.)]|[-*•])\s+/, '').trim();
    cleaned = cleaned.replace(/^["'«»]+|["'«»]+$/g, '').trim();
    if (cleaned.length < 2 || cleaned.length > 90) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.push(cleaned);
    if (parsed.length >= max) break;
  }
  return parsed.length >= 2 ? parsed : FALLBACK_CHOICES.slice(0, max);
};

/* --- Generation --- */

export const generateChapter = async (
  config: StoryConfiguration,
  chapters: StoryChapter[],
  choiceLabel: string | null,
  signal?: AbortSignal,
): Promise<StoryChapter> => {
  const prompt =
    choiceLabel === null
      ? buildFirstChapterPrompt(config)
      : buildNextChapterPrompt(config, chapters, choiceLabel);
  const raw = await generateText({ prompt, task: 'story_generation' }, signal);
  const text = normalizeReadingText(raw);
  if (text.trim().length === 0) throw new Error('Empty chapter');

  let choices: StoryChoice[] = [];
  if (config.storyLength !== 'shortStory') {
    try {
      const choicesRaw = await generateText(
        { prompt: buildChoicesPrompt(config, text), task: 'story_choices' },
        signal,
      );
      choices = parseChoices(choicesRaw).map((label) => ({ id: crypto.randomUUID(), label }));
    } catch {
      choices = FALLBACK_CHOICES.map((label) => ({ id: crypto.randomUUID(), label }));
    }
  }

  return {
    id: crypto.randomUUID(),
    chapterIndex: chapters.length + 1,
    text,
    choices,
    isCompleted: false,
  };
};

/* --- Progress rules (StorySessionViewModel.applyProgressMetrics) --- */

export interface StoryProgressInfo {
  completedChapters: number;
  totalChaptersTarget: number;
  overallProgress: number;
  isStoryComplete: boolean;
}

export const storyProgress = (
  chapters: StoryChapter[],
  length: StoryLength,
  endedByUser = false,
): StoryProgressInfo => {
  const completed = chapters.filter((c) => c.isCompleted).length;
  const target = chaptersTargetFor(length);
  if (length === 'shortStory') {
    const done = completed >= 1;
    return {
      completedChapters: completed,
      totalChaptersTarget: 1,
      overallProgress: done ? 1 : 0,
      isStoryComplete: done,
    };
  }
  if (length === 'multiChapter') {
    const progress = completed / Math.max(target, chapters.length);
    return {
      completedChapters: completed,
      totalChaptersTarget: target,
      overallProgress: Math.min(progress, 1),
      isStoryComplete: progress >= 1,
    };
  }
  /* infinite: never auto-completes; user taps End Story. */
  return {
    completedChapters: completed,
    totalChaptersTarget: 0,
    overallProgress: endedByUser ? 1 : Math.min(0.95, completed / (completed + 1)),
    isStoryComplete: endedByUser,
  };
};

/* --- readingItems serialization --- */

export const storyItemFromSession = (params: {
  existingItem?: ReadingLibraryItem;
  ownerUID: string;
  config: StoryConfiguration;
  chapters: StoryChapter[];
  endedByUser?: boolean;
}): ReadingLibraryItem => {
  const { config, chapters } = params;
  const now = Date.now();
  const progress = storyProgress(chapters, config.storyLength, params.endedByUser ?? false);
  const fullPlainText = chapters.map((c) => c.text).join('\n\n');
  const wordCount = readingWordCount(fullPlainText);
  const scored = chapters.filter((c) => c.scorePercent !== undefined);
  const avgScore =
    scored.length > 0
      ? scored.reduce((sum, c) => sum + (c.scorePercent ?? 0), 0) / scored.length / 100
      : undefined;

  return {
    id: params.existingItem?.id ?? crypto.randomUUID(),
    ownerUID: params.ownerUID,
    modeID: 'story-mode',
    title:
      params.existingItem?.title ??
      `${STORY_TYPE_TITLES[config.storyType]} — ${config.storyLength === 'shortStory' ? 'Short Story' : config.storyLength === 'multiChapter' ? 'Multi Chapter' : 'Infinite Story'}`,
    preview: readingPreview(chapters[0]?.text ?? '', 120),
    fullText: JSON.stringify({ chapters }),
    difficulty: config.difficulty,
    estimatedMinutes: estimatedMinutesFor(config.storyLength),
    createdAt: params.existingItem?.createdAt ?? now,
    updatedAt: now,
    lastOpenedAt: now,
    progress: progress.overallProgress,
    comprehensionScore: avgScore,
    tags: [STORY_TYPE_TITLES[config.storyType], config.difficulty],
    sourceType: 'story',
    status: progress.isStoryComplete ? 'completed' : 'inProgress',
    selections: {
      storyType: config.storyType,
      storyLength: config.storyLength,
      difficulty: config.difficulty,
      currentChapterIndex: String(chapters.length),
      completedChapters: String(progress.completedChapters),
      totalChapters: String(progress.totalChaptersTarget),
    },
    toggles: assistanceToToggles(DEFAULT_ASSISTANCE),
    languageCode: config.languageId,
    wordCount,
    characterCount: fullPlainText.length,
    detectedDifficulty: config.difficulty,
    readingFocus: 'mainIdea',
    enabledQuestionTypes: DEFAULT_QUESTION_TYPES,
    readingTimeSeconds: chapters.reduce((sum, c) => sum + (c.readingTimeSeconds ?? 0), 0),
    lastReadCharacterIndex: 0,
  };
};

export const storySessionFromItem = (
  item: ReadingLibraryItem,
): { config: StoryConfiguration; chapters: StoryChapter[] } => {
  let chapters: StoryChapter[] = [];
  try {
    const parsed = JSON.parse(item.fullText) as { chapters?: unknown };
    if (Array.isArray(parsed.chapters)) {
      chapters = (parsed.chapters as StoryChapter[]).map((c, i) => ({
        id: String(c.id ?? crypto.randomUUID()),
        chapterIndex: typeof c.chapterIndex === 'number' ? c.chapterIndex : i + 1,
        text: String(c.text ?? ''),
        choices: Array.isArray(c.choices)
          ? c.choices.map((ch) => ({ id: String(ch.id ?? crypto.randomUUID()), label: String(ch.label ?? '') }))
          : [],
        madeChoiceLabel: c.madeChoiceLabel ? String(c.madeChoiceLabel) : undefined,
        isCompleted: Boolean(c.isCompleted),
        scorePercent: typeof c.scorePercent === 'number' ? c.scorePercent : undefined,
        readingTimeSeconds:
          typeof c.readingTimeSeconds === 'number' ? c.readingTimeSeconds : undefined,
      }));
    }
  } catch {
    chapters = [];
  }
  const config: StoryConfiguration = {
    languageId: item.languageCode,
    storyType: (STORY_TYPES as string[]).includes(item.selections.storyType)
      ? (item.selections.storyType as StoryType)
      : 'adventure',
    storyLength: (STORY_LENGTHS as string[]).includes(item.selections.storyLength)
      ? (item.selections.storyLength as StoryLength)
      : 'shortStory',
    difficulty: item.difficulty,
  };
  return { config, chapters };
};
