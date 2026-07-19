/* AI text generation + Wikipedia explore — web port of
   MyTextsAIGenerationService (task `my_texts_generation`, prompt verbatim)
   and MyTextsExploreReadingService (Wikipedia REST summary; the placeholder
   sources are dropped on web). */
import { generateText } from '@/lib/aiClient';
import { findLanguage } from '@/lib/essayTypes';
import { normalizeReadingText } from '@/lib/readingTextAnalyzer';
import type { ReadingDifficulty, ReadingFocus } from '@/lib/models';

export type ReadingTextStyle = 'informative' | 'casual' | 'academic' | 'narrative';
export type ReadingTextLength = 'short' | 'medium' | 'long';

export const READING_TEXT_STYLES: ReadingTextStyle[] = [
  'informative', 'casual', 'academic', 'narrative',
];
export const READING_TEXT_LENGTHS: ReadingTextLength[] = ['short', 'medium', 'long'];

/* iOS MyTextsAIGenerationRequest.wordCountRange. */
export const LENGTH_WORD_RANGES: Record<ReadingTextLength, [number, number]> = {
  short: [120, 220],
  medium: [250, 400],
  long: [500, 800],
};

export const targetWordCountFor = (length: ReadingTextLength): number => {
  const [lo, hi] = LENGTH_WORD_RANGES[length];
  return Math.floor((lo + hi) / 2);
};

const STYLE_INSTRUCTION: Record<ReadingTextStyle, string> = {
  informative: 'clear, factual, educational — like a magazine explainer',
  casual: 'friendly and conversational — like a personal blog post',
  academic: 'more formal and precise — like a textbook excerpt',
  narrative: 'vivid storytelling with concrete scenes and characters',
};

const levelInstruction = (level: ReadingDifficulty): string => {
  switch (level) {
    case 'A1':
    case 'A2':
      return 'short simple sentences, very common everyday vocabulary';
    case 'B1':
      return 'medium sentences with common connectors and broader vocabulary';
    case 'B2':
      return 'natural sentence variety; introduce some abstract ideas';
    case 'C1':
      return 'complex sentence structures and advanced vocabulary; precise word choice';
    case 'Native':
      return 'advanced, idiomatic vocabulary; nuanced phrasing';
  }
};

const FOCUS_INSTRUCTION: Record<ReadingFocus, string> = {
  mainIdea: 'Structure the passage around one clear main idea so the reader can summarise it.',
  detailedComprehension:
    'Include several concrete details so the reader can answer specific questions.',
  vocabulary: 'Include several useful topic-specific words the reader can learn from context.',
  grammarAwareness: 'Include sentences that showcase common grammar patterns naturally.',
  speedFluency: 'Use steady rhythm and even sentence length so the reader can build pace.',
};

export interface GenerateReadingTextParams {
  topic: string;
  languageId: string;
  level: ReadingDifficulty;
  length: ReadingTextLength;
  style: ReadingTextStyle;
  focus: ReadingFocus;
}

export const buildMyTextsPrompt = (params: GenerateReadingTextParams): string => {
  const topic = params.topic.trim() || 'an interesting everyday topic';
  const [lo, hi] = LENGTH_WORD_RANGES[params.length];
  const language = findLanguage(params.languageId).title;
  return [
    `Write a self-contained reading passage in ${language} about: ${topic}.`,
    `Tone / style: ${STYLE_INSTRUCTION[params.style]}.`,
    `CEFR level ${params.level}: ${levelInstruction(params.level)}.`,
    `Target length: about ${targetWordCountFor(params.length)} words (between ${lo} and ${hi}).`,
    FOCUS_INSTRUCTION[params.focus],
    '',
    'Formatting rules — follow exactly:',
    '- Return only the passage.',
    '- No markdown, no bold, no italics, no headings, no bullet points.',
    '- Do not write a title.',
    '- Do not include intros, outros, or notes to the reader.',
  ].join('\n');
};

export interface GeneratedReadingText {
  title: string;
  body: string;
  topic: string;
}

export const generateReadingText = async (
  params: GenerateReadingTextParams,
  signal?: AbortSignal,
): Promise<GeneratedReadingText> => {
  const raw = await generateText(
    { prompt: buildMyTextsPrompt(params), task: 'my_texts_generation' },
    signal,
  );
  const body = normalizeReadingText(raw);
  if (body.trim().length === 0) throw new Error('Empty generation result');
  const topic = params.topic.trim();
  const title =
    topic.length > 0 ? topic.charAt(0).toUpperCase() + topic.slice(1) : 'Generated reading';
  return { title, body, topic };
};

/* --- Wikipedia explore (MyTextsExploreReadingService, .wikipedia source) --- */

export interface ExploredArticle {
  title: string;
  body: string;
  sourceURL: string;
  topic: string;
}

export class ExploreError extends Error {
  code: 'emptyTopic' | 'notFound' | 'network';
  constructor(code: 'emptyTopic' | 'notFound' | 'network', message: string) {
    super(message);
    this.code = code;
  }
}

const WIKIPEDIA_TIMEOUT_MS = 25_000;

export const exploreWikipedia = async (
  topic: string,
  languageId: string,
  signal?: AbortSignal,
): Promise<ExploredArticle> => {
  const trimmed = topic.trim();
  if (trimmed.length === 0) throw new ExploreError('emptyTopic', 'Topic is empty');

  const lang2 = findLanguage(languageId).shortTitle.toLowerCase() || 'en';
  const path = encodeURIComponent(trimmed.replace(/\s+/g, '_'));
  const url = `https://${lang2}.wikipedia.org/api/rest_v1/page/summary/${path}`;

  const controller = new AbortController();
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  const timeout = setTimeout(() => controller.abort(), WIKIPEDIA_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError' && signal?.aborted) throw e;
    throw new ExploreError('network', e instanceof Error ? e.message : 'Network error');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 404) throw new ExploreError('notFound', 'Article not found');
  if (!response.ok) throw new ExploreError('network', `Wikipedia returned ${response.status}`);

  const data = (await response.json()) as {
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  };
  const body = data.extract?.trim() ?? '';
  if (body.length === 0) throw new ExploreError('notFound', 'Article has no summary');

  return {
    title: data.title ?? trimmed,
    body,
    sourceURL: data.content_urls?.desktop?.page ?? url,
    topic: trimmed,
  };
};
