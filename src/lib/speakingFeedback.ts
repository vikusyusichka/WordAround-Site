/* Speaking feedback — web port of SpeakingFeedbackService +
   GeminiSpeakingFeedbackAIClient. generateJSON task speaking_feedback (4
   metrics) or debate_feedback (7 metrics); prompt + schema iOS-verbatim; 2
   attempts then local fallback scoring. */
import { generateJSON } from '@/lib/aiClient';
import { findLanguage } from '@/lib/essayTypes';
import type {
  SpeakingContext,
  SpeakingCorrection,
  SpeakingFeedback,
  SpeakingFeedbackMetric,
  SpeakingMessage,
} from '@/lib/speakingTypes';
import { contextPromptContext, contextTitle } from '@/lib/speakingTypes';

interface MetricDTO {
  rating: string;
  score: number;
  explanation: string;
}
interface FeedbackDTO {
  overallScore: number;
  summary: string;
  grammar: MetricDTO;
  pronunciation: MetricDTO;
  vocabulary: MetricDTO;
  fluency: MetricDTO;
  argumentQuality?: MetricDTO;
  persuasiveness?: MetricDTO;
  structure?: MetricDTO;
  corrections?: {
    originalText: string;
    correctedText: string;
    explanation: string;
    category?: string;
  }[];
}

const clampScore = (s: number) => Math.max(0, Math.min(100, Math.round(s)));

export const buildFeedbackPrompt = (params: {
  languageId: string;
  level: string;
  scenarioOrTopicTitle: string;
  scenarioOrTopicContext: string;
  messages: SpeakingMessage[];
  includeDebateMetrics: boolean;
}): string => {
  const debate = params.includeDebateMetrics;
  const userTurns = params.messages
    .filter((m) => m.role === 'user')
    .map((m, i) => `U${i + 1}: ${m.text}`)
    .join('\n');
  const allTurns = params.messages
    .map((m) => `${m.role === 'ai' ? 'Tutor' : 'Learner'}: ${m.text}`)
    .join('\n');

  const intro = debate
    ? 'You are a debate-coach evaluator inside a language learning app. The learner debated an AI opponent.'
    : 'You are a speaking-practice evaluator inside a language learning app.';
  const metricCountLine = debate
    ? '3. Produce seven score blocks: grammar, pronunciation, vocabulary, fluency, argumentQuality, persuasiveness, structure.'
    : '3. Produce four score blocks: grammar, pronunciation, vocabulary, fluency.';

  const lines: string[] = [
    intro,
    '',
    `Selected language: ${findLanguage(params.languageId).title}`,
    `Learner level: ${params.level}`,
    `Scenario/Topic: ${params.scenarioOrTopicTitle}`,
    `Scenario context: ${params.scenarioOrTopicContext}`,
    '',
    'Full conversation (for context only — do NOT grade the opponent lines):',
    allTurns.length > 0 ? allTurns : '(no conversation)',
    '',
    'Learner messages to evaluate (analyze ONLY these):',
    userTurns.length > 0 ? userTurns : '(no user messages)',
    '',
    'Task:',
    `1. Read the learner messages and judge them against level ${params.level}.`,
    '2. Produce one short summary in English.',
    metricCountLine,
    '4. Produce zero or more concrete corrections drawn ONLY from the learner messages above.',
    '',
    'Rules — read carefully:',
    '- Analyze ONLY the learner messages. Never grade the opponent.',
    "- Corrections MUST quote the learner's actual wording in `originalText`. Never invent sentences the learner did not say.",
    '- If a learner message contains no clear mistake, do NOT add a correction for it.',
    '- If there are no mistakes at all, return an empty `corrections` array.',
    "- Pronunciation cannot be truly measured from text — set `rating` to something like 'Estimated' or 'Needs audio' and mention this in `explanation`.",
  ];
  if (debate) {
    lines.push(
      '- argumentQuality, persuasiveness and structure judge HOW the learner argued (logic, convincing reasons, clear organisation) — base them ONLY on the learner messages.',
    );
  }
  lines.push(
    '- If the transcript is very short (≤1 user message or very few words), reduce all scores and mention that more practice is needed in `summary`.',
    '- Keep `summary` and every `explanation` short (1-2 sentences).',
    '- All numeric scores MUST be integers in 0...100.',
    "- All ratings MUST be one of: 'Great', 'Good', 'Fair', 'Needs practice', or 'Estimated' (use exactly these spellings).",
    '- Output STRICT JSON only — no prose, no markdown, no commentary, no code fences.',
    '',
    'Return ONLY a JSON object matching this exact schema:',
    '{',
    '  "overallScore": <int 0-100>,',
    '  "summary": "<short English summary>",',
    '  "grammar":       {"rating":"<rating>","score":<int>,"explanation":"<short>"},',
    '  "pronunciation": {"rating":"<rating>","score":<int>,"explanation":"<short>"},',
    '  "vocabulary":    {"rating":"<rating>","score":<int>,"explanation":"<short>"},',
    '  "fluency":       {"rating":"<rating>","score":<int>,"explanation":"<short>"},',
  );
  if (debate) {
    lines.push(
      '  "argumentQuality": {"rating":"<rating>","score":<int>,"explanation":"<short>"},',
      '  "persuasiveness":  {"rating":"<rating>","score":<int>,"explanation":"<short>"},',
      '  "structure":       {"rating":"<rating>","score":<int>,"explanation":"<short>"},',
    );
  }
  lines.push(
    '  "corrections": [',
    '    {"originalText":"<exact learner words>","correctedText":"<better version>","explanation":"<short>","category":"grammar|vocabulary|style"}',
    '  ]',
    '}',
  );
  return lines.join('\n');
};

export const buildTranscript = (messages: SpeakingMessage[]): string =>
  messages.map((m) => `${m.role === 'ai' ? 'Tutor' : 'You'}: ${m.text}`).join('\n');

const metricFrom = (title: string, icon: string, dto: MetricDTO): SpeakingFeedbackMetric => ({
  title,
  rating: dto.rating.trim(),
  score: clampScore(dto.score),
  explanation: dto.explanation.trim(),
  iconName: icon,
});

const validate = (dto: FeedbackDTO): void => {
  const inRange = (s: number) => Number.isFinite(s) && s >= 0 && s <= 100;
  if (!inRange(dto.overallScore)) throw new Error('overallScore out of range');
  for (const block of [dto.grammar, dto.pronunciation, dto.vocabulary, dto.fluency]) {
    if (!block || !inRange(block.score)) throw new Error('metric score out of range');
    if (!block.rating || block.rating.trim().length === 0) throw new Error('metric rating empty');
  }
  if (!dto.summary || dto.summary.trim().length === 0) throw new Error('summary empty');
};

const feedbackFromDTO = (dto: FeedbackDTO, transcript: string): SpeakingFeedback => {
  const extra: SpeakingFeedbackMetric[] = [];
  if (dto.argumentQuality) extra.push(metricFrom('Argument Quality', 'megaphone.fill', dto.argumentQuality));
  if (dto.persuasiveness) extra.push(metricFrom('Persuasiveness', 'megaphone.fill', dto.persuasiveness));
  if (dto.structure) extra.push(metricFrom('Structure', 'list.bullet.rectangle.fill', dto.structure));

  const corrections: SpeakingCorrection[] = (dto.corrections ?? [])
    .map((c) => ({
      originalText: c.originalText.trim(),
      correctedText: c.correctedText.trim(),
      explanation: c.explanation.trim(),
      category: (c.category ?? 'grammar').trim(),
    }))
    .filter((c) => c.originalText.length > 0 && c.correctedText.length > 0);

  return {
    overallScore: clampScore(dto.overallScore),
    summary: dto.summary.trim(),
    grammar: metricFrom('Grammar', 'checkmark.circle.fill', dto.grammar),
    pronunciation: metricFrom('Pronunciation', 'mic.fill', dto.pronunciation),
    vocabulary: metricFrom('Vocabulary', 'text.book.closed.fill', dto.vocabulary),
    fluency: metricFrom('Fluency', 'waveform', dto.fluency),
    corrections,
    extraMetrics: extra,
    transcript,
    isFallback: false,
  };
};

/* --- Local fallback scoring (iOS formulas) --- */

const wordCount = (text: string) => text.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 0).length;

const uniqueWordCount = (messages: SpeakingMessage[]): number => {
  const seen = new Set<string>();
  for (const m of messages) {
    for (const token of m.text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (token.length >= 2) seen.add(token);
    }
  }
  return seen.size;
};

const ratingForScore = (score: number, allowsZero: boolean): string => {
  if (!allowsZero && score === 0) return '—';
  if (score < 40) return 'Needs practice';
  if (score < 65) return 'Fair';
  if (score < 80) return 'Good';
  return 'Great';
};

const debateFallbackMetrics = (
  userCount: number,
  totalWords: number,
  hasUser: boolean,
): SpeakingFeedbackMetric[] => {
  if (!hasUser) {
    return [
      { title: 'Argument Quality', rating: '—', score: 0, explanation: 'No arguments to evaluate.', iconName: 'megaphone.fill' },
      { title: 'Persuasiveness', rating: '—', score: 0, explanation: 'No arguments to evaluate.', iconName: 'megaphone.fill' },
      { title: 'Structure', rating: '—', score: 0, explanation: 'No arguments to evaluate.', iconName: 'list.bullet.rectangle.fill' },
    ];
  }
  const argument = Math.min(95, 30 + totalWords * 2);
  const persuasive = Math.min(95, 25 + userCount * 8 + totalWords);
  const structure = Math.min(95, 35 + userCount * 6);
  return [
    { title: 'Argument Quality', rating: ratingForScore(argument, true), score: argument, explanation: 'Estimated from how much reasoning you gave. Full AI review needed.', iconName: 'megaphone.fill' },
    { title: 'Persuasiveness', rating: ratingForScore(persuasive, true), score: persuasive, explanation: 'Estimated from how actively you argued your case.', iconName: 'megaphone.fill' },
    { title: 'Structure', rating: ratingForScore(structure, true), score: structure, explanation: 'Estimated from how many turns you organised your points across.', iconName: 'list.bullet.rectangle.fill' },
  ];
};

export const localFallbackFeedback = (params: {
  messages: SpeakingMessage[];
  transcript: string;
  includeDebateMetrics: boolean;
}): SpeakingFeedback => {
  const userMessages = params.messages.filter((m) => m.role === 'user');
  const totalWords = userMessages.reduce((sum, m) => sum + wordCount(m.text), 0);
  const uniqueWords = uniqueWordCount(userMessages);
  const hasUser = userMessages.length > 0;

  const summary = !hasUser
    ? 'No speaking answers were recorded.'
    : totalWords < 12
      ? 'You answered briefly. Try giving longer answers next time.'
      : 'Good practice. You kept the conversation going.';

  const fluencyScore = hasUser ? Math.min(95, 10 + Math.min(60, totalWords * 3) + Math.min(30, userMessages.length * 6)) : 0;
  const vocabularyScore = hasUser ? Math.min(95, 30 + uniqueWords * 2) : 0;
  const grammarScore = hasUser ? 70 : 0;
  const pronunciationScore = hasUser ? 65 : 0;
  const overall = hasUser ? Math.min(95, Math.floor((grammarScore + pronunciationScore + vocabularyScore + fluencyScore) / 4)) : 0;

  return {
    overallScore: overall,
    summary,
    grammar: {
      title: 'Grammar',
      rating: ratingForScore(grammarScore, hasUser),
      score: grammarScore,
      explanation: hasUser ? 'Grammar needs full AI review. This is a neutral estimate.' : 'No user messages to evaluate.',
      iconName: 'checkmark.circle.fill',
    },
    pronunciation: {
      title: 'Pronunciation',
      rating: hasUser ? 'Estimated' : '—',
      score: pronunciationScore,
      explanation: 'Pronunciation needs audio analysis. This score is estimated.',
      iconName: 'mic.fill',
    },
    vocabulary: {
      title: 'Vocabulary',
      rating: ratingForScore(vocabularyScore, hasUser),
      score: vocabularyScore,
      explanation: hasUser ? 'Based on the variety of words you used.' : 'No user messages to evaluate.',
      iconName: 'text.book.closed.fill',
    },
    fluency: {
      title: 'Fluency',
      rating: ratingForScore(fluencyScore, hasUser),
      score: fluencyScore,
      explanation: hasUser ? 'Based on how many turns and words you produced.' : 'No user messages to evaluate.',
      iconName: 'waveform',
    },
    corrections: [],
    extraMetrics: params.includeDebateMetrics
      ? debateFallbackMetrics(userMessages.length, totalWords, hasUser)
      : [],
    transcript: params.transcript,
    isFallback: true,
  };
};

/** AI feedback with 2 attempts then local fallback. Returns the feedback plus
    an optional fallbackReason banner string. */
export const generateSpeakingFeedback = async (params: {
  languageId: string;
  level: string;
  context: SpeakingContext | null;
  messages: SpeakingMessage[];
  includeDebateMetrics?: boolean;
}): Promise<{ feedback: SpeakingFeedback; fallbackReason: string | null }> => {
  const includeDebateMetrics = params.includeDebateMetrics ?? false;
  const transcript = buildTranscript(params.messages);
  const userMessages = params.messages.filter((m) => m.role === 'user');

  if (userMessages.length === 0) {
    return {
      feedback: localFallbackFeedback({ messages: params.messages, transcript, includeDebateMetrics }),
      fallbackReason: 'No speaking answers were recorded.',
    };
  }

  const prompt = buildFeedbackPrompt({
    languageId: params.languageId,
    level: params.level,
    scenarioOrTopicTitle: params.context ? contextTitle(params.context) : 'Open conversation',
    scenarioOrTopicContext: params.context ? contextPromptContext(params.context) : 'Generic conversation practice.',
    messages: params.messages,
    includeDebateMetrics,
  });
  const task = includeDebateMetrics ? 'debate_feedback' : 'speaking_feedback';

  let lastError = 'unknown error';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const dto = await generateJSON<FeedbackDTO>({ prompt, task });
      validate(dto);
      return { feedback: feedbackFromDTO(dto, transcript), fallbackReason: null };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  return {
    feedback: localFallbackFeedback({ messages: params.messages, transcript, includeDebateMetrics }),
    fallbackReason: `AI feedback unavailable (${lastError}). Showing basic feedback.`,
  };
};

export { feedbackFromDTO as __feedbackFromDTO, validate as __validateFeedback };
