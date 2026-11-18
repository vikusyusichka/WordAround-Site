/* Exam prep — AI marking of writing and speaking against the exam's rubric.

   The model rates each criterion of the task's rubric on the exam's own scale
   (IELTS 0–9, DELE 0–3) and explains each rating; the numbers then go through
   the same deterministic scoring as everything else (./scoring.ts). Comments
   come back in the learner's interface language, corrections and the improved
   version in the exam language. As with generation there is no local
   fallback: an invented score would teach the learner the wrong thing. */

import { generateJSON } from '@/lib/aiClient';

import { levelLine } from './generation';
import type { GeneratedSpeakingTask, GeneratedWritingTask, TaskRef } from './generation';
import type { RubricCriterion, SpeakingTaskSpec, WritingTaskSpec } from './types';

export interface CriterionRating {
  id: string;
  name: string;
  score: number;
  comment: string;
}

export interface RubricCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface RubricFeedback {
  criteria: CriterionRating[];
  summary: string;
  strengths: string[];
  improvements: string[];
  corrections: RubricCorrection[];
  /** A better version of the answer, in the exam language. */
  improvedVersion: string;
}

export class RubricScoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RubricScoringError';
  }
}

export const countWords = (text: string): number =>
  text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

/** Criterion scale of the section a rubric task belongs to. */
export const criterionMaxOf = (ref: TaskRef): number => {
  const { scoring } = ref.section;
  return scoring.kind === 'rubricBand' || scoring.kind === 'rubricScaled' ? scoring.criterionMax : 0;
};

type RubricRef = TaskRef & { task: WritingTaskSpec | SpeakingTaskSpec };

export interface RubricInput {
  ref: RubricRef;
  generated: GeneratedWritingTask | GeneratedSpeakingTask;
  /** The essay, or the speaking transcript. */
  response: string;
  /** Speaking only: how long the candidate actually spoke. */
  spokenSeconds?: number;
  /** English name of the learner's interface language, for the comments. */
  feedbackLanguage: string;
}

const describeTask = (generated: RubricInput['generated']): string[] => {
  if (generated.kind === 'writing') {
    return [
      `Task prompt: ${generated.prompt}`,
      ...(generated.context ? [`Task material: ${generated.context}`] : []),
      ...(generated.points.length ? [`Points to cover: ${generated.points.join(' | ')}`] : []),
      ...(generated.chart
        ? [
            `Chart data (${generated.chart.unit}): ${generated.chart.title}. Labels: ${generated.chart.labels.join(', ')}. ` +
              generated.chart.series.map((s) => `${s.name}: ${s.values.join(', ')}`).join('; '),
          ]
        : []),
    ];
  }
  return [
    `Instructions: ${generated.instructions}`,
    ...(generated.cueCard ? [`Cue card: ${generated.cueCard.topic} — ${generated.cueCard.points.join(' | ')}`] : []),
    ...(generated.material ? [`Material: ${generated.material}`] : []),
    ...(generated.questions.length ? [`Examiner questions: ${generated.questions.join(' | ')}`] : []),
  ];
};

const criteriaLines = (criteria: RubricCriterion[]): string[] =>
  criteria.map((c) => `- id "${c.id}" — ${c.name}: ${c.descriptor}`);

export const buildRubricPrompt = (input: RubricInput): string => {
  const { ref, response, generated } = input;
  const { exam, variant, task } = ref;
  const max = criterionMaxOf(ref);
  const words = countWords(response);
  const speaking = task.kind === 'speaking';
  const lengthLine =
    task.kind === 'writing'
      ? `Required length: ${task.words.max ? `${task.words.min}–${task.words.max}` : `at least ${task.words.min}`} words. The answer has ${words} words. Apply the exam's penalties for answers that are too short or off-topic.`
      : `Expected speaking time: about ${Math.round(task.speakSeconds / 60)} min. The candidate spoke for ${Math.round((input.spokenSeconds ?? 0) / 60 * 10) / 10} min (${words} words transcribed).`;
  return [
    `You are an experienced, strict ${exam.name} examiner marking a practice answer (${variant.title}).`,
    levelLine(exam, variant),
    `Task: ${ref.section.title} — ${task.title}. ${task.description}`,
    ...describeTask(generated),
    lengthLine,
    '',
    `Rate EVERY criterion below as a whole number from 0 to ${max}, exactly as an official ${exam.name} examiner would on this scale:`,
    ...criteriaLines(task.criteria),
    '',
    speaking
      ? 'The answer is an automatic transcript of speech: ignore punctuation and capitalisation, and judge pronunciation only from what the transcript allows (rate it conservatively and say so).'
      : 'Judge spelling and punctuation as written.',
    `Write "summary", every "comment", "strengths", "improvements" and every correction "explanation" in ${input.feedbackLanguage}.`,
    `Write "corrected" and "improvedVersion" in the exam language. "improvedVersion" is the candidate's own answer rewritten to a clearly higher level, keeping their ideas${speaking ? ' (as a spoken answer)' : ''}.`,
    '"corrections": up to 8 of the most important mistakes; "original" must quote the answer exactly. Empty array if there are none.',
    '"strengths" and "improvements": 2–4 short items each.',
    'If the answer is empty, off-topic or far too short, give low scores and say why.',
    'Output STRICT JSON only — no prose, no markdown, no code fences.',
    'Schema: {"criteria":[{"id":"…","score":0,"comment":"…"}],"summary":"…","strengths":["…"],"improvements":["…"],"corrections":[{"original":"…","corrected":"…","explanation":"…"}],"improvedVersion":"…"}',
    '',
    `Candidate's answer:\n"""\n${response.trim() || '(empty)'}\n"""`,
  ].join('\n');
};

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const strList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(str).filter((item) => item.length > 0) : [];

export const parseRubricFeedback = (raw: unknown, ref: RubricRef, response: string): RubricFeedback => {
  const data = (raw ?? {}) as Record<string, unknown>;
  const max = criterionMaxOf(ref);
  const rated = new Map<string, { score: number; comment: string }>();
  for (const entry of Array.isArray(data.criteria) ? data.criteria : []) {
    const c = (entry ?? {}) as Record<string, unknown>;
    const score = Number(c.score);
    if (typeof c.id === 'string' && Number.isFinite(score)) {
      rated.set(c.id, { score, comment: str(c.comment) });
    }
  }
  const criteria = ref.task.criteria.map((criterion) => {
    const rating = rated.get(criterion.id);
    if (!rating) throw new RubricScoringError(`missing rating for ${criterion.id}`);
    if (rating.score < 0 || rating.score > max) throw new RubricScoringError(`rating for ${criterion.id} out of range`);
    return { id: criterion.id, name: criterion.name, score: Math.round(rating.score), comment: rating.comment };
  });
  const summary = str(data.summary);
  if (!summary) throw new RubricScoringError('feedback has no summary');

  /* A "correction" that does not quote the answer is invented — drop it. */
  const haystack = response.toLowerCase();
  const corrections = (Array.isArray(data.corrections) ? data.corrections : [])
    .map((entry) => {
      const c = (entry ?? {}) as Record<string, unknown>;
      return { original: str(c.original), corrected: str(c.corrected), explanation: str(c.explanation) };
    })
    .filter((c) => c.original && c.corrected && haystack.includes(c.original.toLowerCase()));

  return {
    criteria,
    summary,
    strengths: strList(data.strengths),
    improvements: strList(data.improvements),
    corrections,
    improvedVersion: str(data.improvedVersion),
  };
};

/** Ratings in the shape ./scoring.ts expects: taskId → criterionId → score. */
export const ratingsOf = (taskId: string, feedback: RubricFeedback): Record<string, Record<string, number>> => ({
  [taskId]: Object.fromEntries(feedback.criteria.map((c) => [c.id, c.score])),
});

const ATTEMPTS = 2;

export const scoreRubricTask = async (input: RubricInput, signal?: AbortSignal): Promise<RubricFeedback> => {
  const prompt = buildRubricPrompt(input);
  const task = input.ref.task.kind === 'writing' ? 'exam_writing_scoring' : 'exam_speaking_scoring';
  let lastError: unknown;
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const raw = await generateJSON<unknown>({ prompt, task }, signal);
      return parseRubricFeedback(raw, input.ref, input.response);
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new RubricScoringError('Could not mark the answer');
};
