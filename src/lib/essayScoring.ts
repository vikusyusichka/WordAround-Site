/* Deterministic essay scoring — pure port of iOS
   Features/Writing/Essays/Services/EssayScoringService.swift. Computes 6
   sub-scores (grammar / vocabulary / length / complexity / relevance /
   independence) + a weighted total + CEFR + quality label.
   No I/O; all inputs are explicit. The `grammarIssues` come from
   `grammarCheck.ts` (LanguageTool); `usedHints/Translations/Synonyms` come
   from the essay session state. */
import type {
  EssayCEFRLevel,
  EssayDifficulty,
  EssayQualityLabel,
  EssayScore,
  GrammarIssue,
} from '@/lib/essayTypes';

export interface EssayScoringInput {
  text: string;
  /** Task title — used for topic-keyword matching (via TOPIC_PROFILES). */
  topic: string;
  wordLimitMin: number;
  wordLimitMax: number;
  grammarIssues: GrammarIssue[];
  usedHints: number;
  usedTranslations: number;
  usedSynonyms: number;
  difficulty: EssayDifficulty;
}

/* Per-difficulty knobs (verbatim from iOS EssayDifficulty extension). */
const STRICTNESS_MULTIPLIER: Record<EssayDifficulty, number> = {
  A1: 0.7, A2: 0.85, B1: 1.0, B2: 1.15, C1: 1.3, Native: 1.5,
};

const TARGET_SENTENCE_LENGTH_RANGE: Record<EssayDifficulty, [number, number]> = {
  A1: [5, 11], A2: [7, 14], B1: [9, 18], B2: [11, 22], C1: [13, 26], Native: [15, 30],
};

/* Words that signal essay structure — iOS calculateConnectorScore. */
const CONNECTOR_WORDS = [
  'because', 'however', 'although', 'therefore',
  'first', 'second', 'finally', 'also',
  'for example', 'in my opinion', 'on the other hand',
  'after that', 'usually', 'sometimes',
];

/* MARK: - Topic profiles (iOS private TopicProfile.profile(for:)) */

interface TopicProfile {
  requiredKeywords: Set<string>;
  supportingKeywords: Set<string>;
  taskKeywords: Set<string>;
}

const KNOWN_TOPICS: Array<{ contains: string; profile: TopicProfile }> = [
  {
    contains: 'season',
    profile: {
      requiredKeywords: new Set(['season', 'spring', 'summer', 'autumn', 'fall', 'winter']),
      supportingKeywords: new Set(['weather', 'warm', 'cold', 'rainy', 'sunny', 'snow', 'wind', 'temperature']),
      taskKeywords: new Set(['favorite', 'like', 'prefer', 'activities', 'activity', 'because', 'outside']),
    },
  },
  {
    contains: 'routine',
    profile: {
      requiredKeywords: new Set(['routine', 'day', 'morning', 'afternoon', 'evening']),
      supportingKeywords: new Set(['wake', 'breakfast', 'study', 'work', 'lunch', 'dinner', 'sleep']),
      taskKeywords: new Set(['usually', 'always', 'sometimes', 'first', 'after', 'then']),
    },
  },
  {
    contains: 'day',
    profile: {
      requiredKeywords: new Set(['routine', 'day', 'morning', 'afternoon', 'evening']),
      supportingKeywords: new Set(['wake', 'breakfast', 'study', 'work', 'lunch', 'dinner', 'sleep']),
      taskKeywords: new Set(['usually', 'always', 'sometimes', 'first', 'after', 'then']),
    },
  },
  {
    contains: 'trip',
    profile: {
      requiredKeywords: new Set(['trip', 'travel', 'journey', 'went', 'visited']),
      supportingKeywords: new Set(['city', 'place', 'hotel', 'museum', 'beach', 'mountain', 'street']),
      taskKeywords: new Set(['remember', 'happened', 'special', 'because', 'experience']),
    },
  },
  {
    contains: 'travel',
    profile: {
      requiredKeywords: new Set(['trip', 'travel', 'journey', 'went', 'visited']),
      supportingKeywords: new Set(['city', 'place', 'hotel', 'museum', 'beach', 'mountain', 'street']),
      taskKeywords: new Set(['remember', 'happened', 'special', 'because', 'experience']),
    },
  },
  {
    contains: 'place',
    profile: {
      requiredKeywords: new Set(['place', 'city', 'street', 'park', 'building', 'area']),
      supportingKeywords: new Set(['beautiful', 'crowded', 'quiet', 'old', 'new', 'interesting']),
      taskKeywords: new Set(['see', 'feel', 'like', 'visit', 'describe']),
    },
  },
  {
    contains: 'city',
    profile: {
      requiredKeywords: new Set(['place', 'city', 'street', 'park', 'building', 'area']),
      supportingKeywords: new Set(['beautiful', 'crowded', 'quiet', 'old', 'new', 'interesting']),
      taskKeywords: new Set(['see', 'feel', 'like', 'visit', 'describe']),
    },
  },
  {
    contains: 'person',
    profile: {
      requiredKeywords: new Set(['person', 'mother', 'father', 'friend', 'teacher', 'sister', 'brother']),
      supportingKeywords: new Set(['kind', 'smart', 'strong', 'patient', 'helpful', 'honest']),
      taskKeywords: new Set(['admire', 'inspire', 'because', 'example', 'personality']),
    },
  },
  {
    contains: 'admire',
    profile: {
      requiredKeywords: new Set(['person', 'mother', 'father', 'friend', 'teacher', 'sister', 'brother']),
      supportingKeywords: new Set(['kind', 'smart', 'strong', 'patient', 'helpful', 'honest']),
      taskKeywords: new Set(['admire', 'inspire', 'because', 'example', 'personality']),
    },
  },
];

/** Returns the topic profile whose keyword group matches `topic` (case-insensitive
    substring). Falls back to a profile built from the topic's own long words. */
export const topicProfileFor = (topic: string): TopicProfile => {
  const lower = topic.toLowerCase();
  for (const entry of KNOWN_TOPICS) {
    if (lower.includes(entry.contains)) return entry.profile;
  }
  const fallback = normalizedWords(topic).filter((w) => w.length > 3);
  return {
    requiredKeywords: new Set(fallback),
    supportingKeywords: new Set(),
    taskKeywords: new Set(),
  };
};

/* MARK: - Word normalization (iOS normalizedWords) */

/** Lowercased letter-only tokens. Any non-letter (digits, punctuation,
    whitespace) is a separator. */
export const normalizedWords = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((w) => w.length > 0);

const clamp = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));

/* MARK: - Sub-scores */

const calculateGrammarScore = (
  issues: GrammarIssue[],
  wordCount: number,
  difficulty: EssayDifficulty,
): number => {
  if (wordCount <= 0) return 0;
  const grammarCount = issues.filter((i) => i.category === 'grammar').length;
  const density = grammarCount / wordCount;
  const score = 100.0 - density * 720.0 * STRICTNESS_MULTIPLIER[difficulty];
  return clamp(score);
};

const calculateVocabularyScore = (
  issues: GrammarIssue[],
  words: string[],
): number => {
  if (words.length === 0) return 0;
  const vocabIssueCount = issues.filter(
    (i) => i.category === 'vocabulary' || i.category === 'style',
  ).length;
  const uniqueRatio = new Set(words).size / words.length;
  const longWordRatio = words.filter((w) => w.length >= 7).length / words.length;
  const richnessScore = Math.min(100, uniqueRatio * 130);
  const precisionScore = 100 - (vocabIssueCount / words.length) * 600;
  const advancedWordScore = Math.min(100, 45 + longWordRatio * 180);
  const score = richnessScore * 0.45 + precisionScore * 0.4 + advancedWordScore * 0.15;
  return clamp(score);
};

const calculateLengthScore = (
  wordCount: number,
  min: number,
  max: number,
): number => {
  if (wordCount <= 0) return 0;
  const ideal = (min + max) / 2;
  const halfRange = (max - min) / 2;

  if (wordCount < min) {
    return clamp((wordCount / min) * 72.0);
  }
  if (wordCount > max) {
    const excess = wordCount - max;
    const penalty = Math.min(55, excess * 1.6);
    return clamp(78 - penalty);
  }
  const distanceFromIdeal = Math.abs(wordCount - ideal);
  const normalizedDistance = halfRange === 0 ? 0 : distanceFromIdeal / halfRange;
  return clamp(96 - normalizedDistance * 18);
};

const scoreSentenceLength = (
  average: number,
  difficulty: EssayDifficulty,
): number => {
  const [lo, hi] = TARGET_SENTENCE_LENGTH_RANGE[difficulty];
  if (average >= lo && average <= hi) return 92;
  if (average < lo) return Math.max(25, (average / lo) * 85);
  const overflow = average - hi;
  return Math.max(35, 90 - overflow * 5);
};

const calculateConnectorScore = (text: string): number => {
  const lower = text.toLowerCase();
  const matches = CONNECTOR_WORDS.filter((c) => lower.includes(c)).length;
  return Math.min(100, 35 + matches * 10);
};

const calculateStructureScore = (text: string): number => {
  const paragraphs = text
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const sentenceCount = text
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;

  let score = 35;
  if (sentenceCount >= 4) score += 25;
  if (paragraphs.length >= 2) score += 20;
  if (text.includes(',')) score += 10;
  if (text.includes('.')) score += 10;
  return Math.min(100, score);
};

const calculateComplexityScore = (
  text: string,
  words: string[],
  difficulty: EssayDifficulty,
): number => {
  if (words.length <= 5) return 15;
  const sentences = text
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = Math.max(1, sentences.length);
  const averageSentenceLength = words.length / sentenceCount;

  const sentenceScore = scoreSentenceLength(averageSentenceLength, difficulty);
  const connectorScore = calculateConnectorScore(text);
  const structureScore = calculateStructureScore(text);

  const score = sentenceScore * 0.45 + connectorScore * 0.3 + structureScore * 0.25;
  return clamp(score);
};

const calculateRelevanceScore = (words: string[], topic: string): number => {
  if (words.length === 0) return 0;
  const wordSet = new Set(words);
  const profile = topicProfileFor(topic);

  const requiredMatches = [...profile.requiredKeywords].filter((w) => wordSet.has(w)).length;
  const supportingMatches = [...profile.supportingKeywords].filter((w) => wordSet.has(w)).length;
  const taskMatches = [...profile.taskKeywords].filter((w) => wordSet.has(w)).length;

  const requiredRatio = profile.requiredKeywords.size === 0
    ? 0 : requiredMatches / profile.requiredKeywords.size;
  const supportingRatio = profile.supportingKeywords.size === 0
    ? 0 : supportingMatches / profile.supportingKeywords.size;
  const taskRatio = profile.taskKeywords.size === 0
    ? 0 : taskMatches / profile.taskKeywords.size;

  let score = requiredRatio * 55 + supportingRatio * 25 + taskRatio * 20;
  if (requiredMatches === 0) score = Math.min(score, 28);
  if (requiredMatches === 0 && supportingMatches <= 1) score = Math.min(score, 18);
  return clamp(score);
};

const calculateIndependenceScore = (
  usedHints: number,
  usedTranslations: number,
  usedSynonyms: number,
  difficulty: EssayDifficulty,
): number => {
  const penalty = usedHints * 5 + usedTranslations * 9 + usedSynonyms * 7;
  return clamp(100 - penalty * STRICTNESS_MULTIPLIER[difficulty]);
};

const calculateIssuePenalty = (
  issues: GrammarIssue[],
  wordCount: number,
  difficulty: EssayDifficulty,
): number => {
  if (wordCount <= 0) return 0;
  const density = issues.length / wordCount;
  const penalty = issues.length * 1.7 + density * 110;
  return Math.min(38, penalty * STRICTNESS_MULTIPLIER[difficulty]);
};

const estimateCEFR = (
  total: number,
  complexity: number,
  grammar: number,
  relevance: number,
): EssayCEFRLevel => {
  if (relevance < 35) return 'A1';
  if (total >= 88 && complexity >= 80 && grammar >= 82) return 'C1';
  if (total >= 76) return 'B2';
  if (total >= 62) return 'B1';
  if (total >= 45) return 'A2';
  return 'A1';
};

const estimateQualityLabel = (total: number): EssayQualityLabel => {
  if (total >= 85) return 'Excellent';
  if (total >= 70) return 'Very good';
  if (total >= 50) return 'Good';
  return 'Needs work';
};

/* MARK: - Public API */

export const scoreEssay = (input: EssayScoringInput): EssayScore => {
  const words = normalizedWords(input.text);
  const wordCount = words.length;

  const grammar = calculateGrammarScore(input.grammarIssues, wordCount, input.difficulty);
  const vocabulary = calculateVocabularyScore(input.grammarIssues, words);
  const length = calculateLengthScore(wordCount, input.wordLimitMin, input.wordLimitMax);
  const complexity = calculateComplexityScore(input.text, words, input.difficulty);
  const relevance = calculateRelevanceScore(words, input.topic);
  const independence = calculateIndependenceScore(
    input.usedHints,
    input.usedTranslations,
    input.usedSynonyms,
    input.difficulty,
  );

  const weighted =
    grammar * 0.3 +
    vocabulary * 0.14 +
    length * 0.12 +
    complexity * 0.14 +
    relevance * 0.22 +
    independence * 0.08;

  const issuePenalty = calculateIssuePenalty(input.grammarIssues, wordCount, input.difficulty);

  let total = Math.round(weighted - issuePenalty);

  /* Relevance floor rules (iOS post-weight caps). */
  if (relevance < 25) total = Math.min(total, 42);
  else if (relevance < 45) total = Math.min(total, 58);
  else if (relevance < 60) total = Math.min(total, 72);

  total = clamp(total);

  return {
    total,
    grammar,
    vocabulary,
    length,
    complexity,
    relevance,
    independence,
    cefrLevel: estimateCEFR(total, complexity, grammar, relevance),
    qualityLabel: estimateQualityLabel(total),
  };
};
