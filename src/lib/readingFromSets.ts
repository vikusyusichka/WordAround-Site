/* Reading From Sets — web port of ReadingFromSetVocabularyExtractor,
   ReadingFromSetPromptBuilder, ReadingFromSetGenerationService and the
   session mapper. A flashcard set becomes an AI reading text that must
   contain every vocabulary word; the saved item runs through the shared
   5B session engine with vocab-term highlighting. */
import { generateText } from '@/lib/aiClient';
import { findLanguage } from '@/lib/essayTypes';
import {
  detectLevel,
  estimatedReadingMinutes,
  normalizeReadingText,
  readingPreview,
  readingWordCount,
} from '@/lib/readingTextAnalyzer';
import { assistanceToToggles, DEFAULT_ASSISTANCE, DEFAULT_QUESTION_TYPES } from '@/lib/readingTypes';
import type { FlashcardSet, ReadingDifficulty, ReadingFocus, ReadingLibraryItem } from '@/lib/models';

export interface ReadingFromSetWord {
  term: string;
  translation?: string;
}

export interface ReadingFromSetVocabulary {
  setId: string;
  setTitle: string;
  words: ReadingFromSetWord[];
}

/** iOS minimumWords = 5. */
export const FROM_SET_MIN_WORDS = 5;

export class FromSetError extends Error {
  code: 'tooFewWords';
  constructor(message: string) {
    super(message);
    this.code = 'tooFewWords';
  }
}

/** Dedup case-insensitively on the term; keep non-empty translations. */
export const extractVocabulary = (set: FlashcardSet): ReadingFromSetVocabulary => {
  const seen = new Set<string>();
  const words: ReadingFromSetWord[] = [];
  for (const card of set.cards) {
    const term = card.word.trim();
    if (term.length === 0) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const translation = card.translation.trim();
    words.push({ term, translation: translation.length > 0 ? translation : undefined });
  }
  if (words.length < FROM_SET_MIN_WORDS) {
    throw new FromSetError(
      `This set needs at least ${FROM_SET_MIN_WORDS} words to create a reading.`,
    );
  }
  return { setId: set.id, setTitle: set.title, words };
};

export type ReadingGenerationStyle = 'natural' | 'strict' | 'mixed';
export const GENERATION_STYLES: ReadingGenerationStyle[] = ['natural', 'strict', 'mixed'];

export type FromSetLength = 'short' | 'medium' | 'long';
export const FROM_SET_LENGTHS: FromSetLength[] = ['short', 'medium', 'long'];

/* iOS ReadingLength.targetWordCount (from-sets variant — differs from
   the MyTexts generation ranges). */
const FROM_SET_TARGETS: Record<FromSetLength, number> = { short: 120, medium: 220, long: 340 };

export const FROM_SET_DIFFICULTIES: ReadingDifficulty[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export interface FromSetGenerationRequest {
  vocabulary: ReadingFromSetVocabulary;
  targetLanguageId: string;
  difficulty: ReadingDifficulty;
  length: FromSetLength;
  generationMode: ReadingGenerationStyle;
  readingFocus: ReadingFocus;
}

/** iOS effectiveTargetWordCount = max(length target, words*4). */
export const effectiveTargetWordCount = (req: FromSetGenerationRequest): number =>
  Math.max(FROM_SET_TARGETS[req.length], req.vocabulary.words.length * 4);

const MODE_INSTRUCTION: Record<ReadingGenerationStyle, string> = {
  strict:
    'Generation mode — Strict: use the listed vocabulary as the core of the text; every word must appear at least once.',
  natural:
    'Generation mode — Natural: weave every listed word into natural, flowing paragraphs.',
  mixed:
    'Generation mode — Mixed: balance natural flow with complete coverage — every listed word must appear at least once.',
};

const FOCUS_TITLES: Record<ReadingFocus, string> = {
  mainIdea: 'Main Idea',
  vocabulary: 'Vocabulary',
  detailedComprehension: 'Detailed Comprehension',
  grammarAwareness: 'Grammar Awareness',
  speedFluency: 'Speed / Fluency',
};

const LENGTH_TITLES: Record<FromSetLength, string> = {
  short: 'short', medium: 'medium', long: 'long',
};

export const buildFromSetPrompt = (req: FromSetGenerationRequest): string => {
  const { vocabulary } = req;
  const n = vocabulary.words.length;
  const language = findLanguage(req.targetLanguageId).title;
  const lines: string[] = [];
  lines.push(`Generate a ${req.difficulty} level reading text in ${language}.`);
  lines.push(
    `Target length: about ${effectiveTargetWordCount(req)} words (${LENGTH_TITLES[req.length]}), but write longer if needed to include every vocabulary word.`,
  );
  lines.push(`It is based on the user's flashcard set "${vocabulary.setTitle}" (${n} words).`);
  lines.push('');
  lines.push(`Use the following vocabulary from the set (${n} words — include ALL of them):`);
  for (const word of vocabulary.words) {
    lines.push(word.translation ? `- ${word.term} (${word.translation})` : `- ${word.term}`);
  }
  lines.push('');
  lines.push(
    'CRITICAL: Every vocabulary word listed above must appear at least once in the reading text. Do not skip any word.',
  );
  lines.push(MODE_INSTRUCTION[req.generationMode]);
  lines.push(`Reading focus: ${FOCUS_TITLES[req.readingFocus]}.`);
  lines.push('');
  lines.push('Formatting rules — follow exactly:');
  lines.push('- Return only the reading text.');
  lines.push('- Do not use Markdown.');
  lines.push('- Do not use bold, italics, headings, or bullet points.');
  lines.push('- Do not include vocabulary labels.');
  lines.push('- Do not write translations in parentheses.');
  lines.push('- Do not include placeholders such as "**Word (Translate)**" or "Word (Translate)".');
  lines.push('- Write normal paragraphs separated by a blank line.');
  lines.push('- The text must be readable, natural, and coherent.');
  lines.push('- Do not include comprehension questions, explanations, intros, or outros.');
  lines.push('');
  lines.push('Example of BAD output: "**Word (Translate)** Alex opened the app."');
  lines.push('Example of GOOD output: "Alex opened the app and looked at the first flashcard."');
  return lines.join('\n');
};

/** Generate + build the persisted item (iOS ReadingFromSetCreationViewModel). */
export const generateFromSetItem = async (
  req: FromSetGenerationRequest,
  ownerUID: string,
  signal?: AbortSignal,
): Promise<ReadingLibraryItem> => {
  const raw = await generateText(
    { prompt: buildFromSetPrompt(req), task: 'reading_from_set' },
    signal,
  );
  const body = normalizeReadingText(raw);
  if (body.trim().length === 0) throw new Error('Empty generation result');

  const now = Date.now();
  const wordCount = readingWordCount(body);
  const title = `${req.vocabulary.setTitle} — Reading`;
  return {
    id: crypto.randomUUID(),
    ownerUID,
    modeID: 'reading-from-sets',
    title,
    preview: readingPreview(body, 120),
    fullText: body,
    difficulty: req.difficulty,
    estimatedMinutes: estimatedReadingMinutes(wordCount),
    createdAt: now,
    updatedAt: now,
    progress: 0,
    tags: [req.vocabulary.setTitle, `${req.vocabulary.words.length} words`],
    sourceType: 'flashcardSet',
    sourceId: req.vocabulary.setId,
    status: 'new',
    selections: {
      setTitle: req.vocabulary.setTitle,
      length: req.length,
      style: req.generationMode,
      detectedDifficulty: detectLevel(body),
      'source.setId': req.vocabulary.setId,
      'source.setTitle': req.vocabulary.setTitle,
      'source.vocabularyTerms': JSON.stringify(req.vocabulary.words.map((w) => w.term)),
    },
    toggles: assistanceToToggles(DEFAULT_ASSISTANCE),
    languageCode: req.targetLanguageId,
    wordCount,
    characterCount: body.length,
    detectedDifficulty: detectLevel(body),
    readingFocus: req.readingFocus,
    enabledQuestionTypes: DEFAULT_QUESTION_TYPES,
    lastReadCharacterIndex: 0,
  };
};

/** Vocabulary terms for session highlighting (parsed from selections). */
export const vocabularyTermsFor = (item: ReadingLibraryItem): string[] => {
  const raw = item.selections['source.vocabularyTerms'];
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map((t) => String(t)) : [];
  } catch {
    return [];
  }
};
