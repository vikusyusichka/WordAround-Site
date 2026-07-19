/* Text analysis + normalization — web port of ReadingTextAnalyzerService,
   ReadingDifficultyDetector and ReadingTextNormalizationService. All magic
   numbers are iOS-verbatim. Two level estimators coexist on iOS (they can
   disagree): estimateLevel (save-time analysis) and detectLevel (the
   "Detected" chip + stored detectedDifficulty) — both are ported. */
import { normalizedText } from '@/lib/aiTextCleaner';
import type { ReadingDifficulty } from '@/lib/models';

const WORDS_PER_MINUTE = 180;

const isLetter = (ch: string) => /\p{L}/u.test(ch);

const letterWords = (text: string, minLength = 1): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((w) => w.length >= minLength);

export const readingWordCount = (text: string): number =>
  text.split(/\s+/).filter((w) => w.length > 0).length;

export const estimatedReadingMinutes = (wordCount: number): number =>
  Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));

export const readingPreview = (text: string, maxLength = 120): string => {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}…`;
};

/** Sentence split (approximates iOS enumerateSubstrings(.bySentences));
    keeps cleaned sentences of length ≥ 8, falls back to the whole text. */
export const readingSentences = (text: string): string[] => {
  const parts: string[] = [];
  let current = '';
  for (const ch of text) {
    current += ch;
    if (ch === '.' || ch === '!' || ch === '?' || ch === '…') {
      const cleaned = current.trim();
      if (cleaned.length >= 8) parts.push(cleaned);
      current = '';
    }
  }
  const tail = current.trim();
  if (tail.length >= 8) parts.push(tail);
  return parts.length > 0 ? parts : [text.trim()].filter((s) => s.length > 0);
};

/* --- estimateLevel (ReadingTextAnalyzerService.estimateLevel) --- */

export const estimateLevel = (content: string, wordCount: number): ReadingDifficulty => {
  const tokens = letterWords(content);
  if (tokens.length === 0 || wordCount === 0) return 'A1';

  const averageLength = tokens.reduce((sum, w) => sum + w.length, 0) / tokens.length;
  const longWordRatio = tokens.filter((w) => w.length >= 8).length / tokens.length;
  const sentences = readingSentences(content);
  const avgSentenceLength = wordCount / Math.max(sentences.length, 1);

  if (wordCount < 40) return averageLength < 4.8 ? 'A1' : 'A2';
  if (wordCount < 90) return avgSentenceLength < 12 ? 'A2' : 'B1';
  if (wordCount < 220) return longWordRatio > 0.18 || avgSentenceLength > 18 ? 'B2' : 'B1';
  if (wordCount < 450) return longWordRatio > 0.22 || averageLength > 6.2 ? 'C1' : 'B2';
  return longWordRatio > 0.28 || averageLength > 6.8 ? 'Native' : 'C1';
};

/* --- detectLevel (ReadingDifficultyDetector) --- */

export const detectLevel = (content: string): ReadingDifficulty => {
  const tokens = letterWords(content, 2);
  if (tokens.length === 0) return 'A1';

  const count = tokens.length;
  const avgWordLength = tokens.reduce((sum, w) => sum + w.length, 0) / count;
  const uniqueRatio = new Set(tokens).size / count;
  const longWordRatio = tokens.filter((w) => w.length >= 8).length / count;
  const complexPunct = [...content].filter((ch) => ',;:—–()'.includes(ch)).length;
  const punctuationComplexity = Math.min(complexPunct / 12, 1.2);
  const sentences = readingSentences(content);
  const avgSentenceLength = count / Math.max(sentences.length, 1);

  const score =
    Math.min(count / 120, 2.0) +
    Math.min(avgWordLength / 3.0, 1.5) +
    Math.min(avgSentenceLength / 8.0, 1.5) +
    Math.min(longWordRatio * 4.0, 1.5) +
    Math.min(uniqueRatio * 2.0, 1.0) +
    punctuationComplexity;

  if (score < 2.2) return 'A1';
  if (score < 3.4) return 'A2';
  if (score < 4.6) return 'B1';
  if (score < 5.8) return 'B2';
  return 'C1';
};

/* --- Normalization (ReadingTextNormalizationService) --- */

const AI_BOILERPLATE_PREFIXES = [
  'here is', "here's", 'sure, here', 'sure! here', 'below is',
  'here is the text', 'here is your', 'of course',
];

const removeAIBoilerplate = (text: string): string => {
  const lines = text.split('\n');
  const first = lines[0]?.trim().toLowerCase() ?? '';
  if (
    first.length < 80 &&
    AI_BOILERPLATE_PREFIXES.some((p) => first.startsWith(p))
  ) {
    lines.shift();
  }
  return lines.join('\n');
};

const removeMarkdown = (text: string): string =>
  text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/(?<!\w)_(.+?)_(?!\w)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*•]\s+/gm, '');

const removePlaceholders = (text: string): string =>
  text
    .replace(/\bword\s*\(\s*translate\s*\)/gi, '')
    .replace(/\[\s*word\s*\]/gi, '')
    .replace(/\[\s*translate\s*\]/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '');

const normalizeWhitespace = (text: string): string =>
  text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const splitIntoParagraphs = (text: string): string[] => {
  const byBlank = text
    .split('\n\n')
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0);
  if (byBlank.length > 1) return byBlank;

  const bySingle = text
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return bySingle.length > 0 ? bySingle : [text.trim()];
};

const splitSentencesRaw = (text: string): string[] => {
  const sentences: string[] = [];
  let current = '';
  for (const ch of text) {
    current += ch;
    if (ch === '.' || ch === '!' || ch === '?' || ch === '…') {
      const trimmed = current.trim();
      if (trimmed.length > 0) sentences.push(trimmed);
      current = '';
    }
  }
  const tail = current.trim();
  if (tail.length > 0) sentences.push(tail);
  return sentences;
};

const wrapLongParagraph = (paragraph: string, maxCharacters = 600): string[] => {
  if (paragraph.length <= maxCharacters) return [paragraph];
  const sentences = splitSentencesRaw(paragraph);
  if (sentences.length <= 1) return [paragraph];

  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current.length === 0) {
      current = sentence;
    } else if (current.length + sentence.length + 1 <= maxCharacters) {
      current += ` ${sentence}`;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
};

/** Cleaned paragraph list (AI boilerplate/markdown/placeholders stripped,
    whitespace normalized, >600-char paragraphs wrapped at sentences). */
export const readingParagraphs = (raw: string): string[] => {
  let text = normalizedText(raw);
  text = removeAIBoilerplate(text);
  text = removeMarkdown(text);
  text = removePlaceholders(text);
  text = normalizeWhitespace(text);
  const result = splitIntoParagraphs(text).flatMap((p) => wrapLongParagraph(p));
  return result.length > 0 ? result : [text.trim()].filter((p) => p.length > 0);
};

export const normalizeReadingText = (raw: string): string =>
  readingParagraphs(raw).join('\n\n');

/* --- Word-boundary helper shared with the tappable text (5B). --- */

export const isWordChar = (ch: string) => isLetter(ch) || /[0-9'-]/.test(ch);
