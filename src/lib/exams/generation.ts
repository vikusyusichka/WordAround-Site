/* Exam prep — AI generation of exam tasks, one task at a time.

   Every task is generated from its TaskSpec, so the prompt always carries the
   real format (item count, question types, word limits, timing). What comes
   back is validated strictly — a question with no correct answer, a gap whose
   answer is not in the text, the wrong number of items — and a bad answer is
   retried once, then reported. There is deliberately no local fallback: a
   made-up exam task is worse than an honest "try again". */

import { generateJSON } from '@/lib/aiClient';
import { findLanguage } from '@/lib/essayTypes';

import type {
  ExamSpec,
  ExamVariant,
  ObjectiveQuestionType,
  ObjectiveTaskSpec,
  SectionSpec,
  SpeakingTaskSpec,
  TaskSpec,
  WritingTaskSpec,
} from './types';

export interface ChartData {
  kind: 'bar' | 'line';
  title: string;
  unit: string;
  labels: string[];
  series: { name: string; values: number[] }[];
}

export interface GeneratedWritingTask {
  kind: 'writing';
  title: string;
  /** The task as the candidate reads it, in the exam's language. */
  prompt: string;
  /** Extra material the task refers to (e.g. what the recording said). */
  context?: string;
  /** Points the answer must cover, if the task lists any. */
  points: string[];
  chart?: ChartData;
}

export interface GeneratedSpeakingTask {
  kind: 'speaking';
  title: string;
  instructions: string;
  /** Examiner questions, asked in order. */
  questions: string[];
  cueCard?: { topic: string; points: string[] };
  /** Material to talk about: proposals, survey data, a situation. */
  material?: string;
  /** True when the task is built around a photo. */
  usesPicture: boolean;
}

export type ObjectiveQuestion =
  | {
      kind: 'choice';
      id: string;
      prompt: string;
      options: string[];
      answerIndex: number;
      explanation: string;
    }
  | {
      kind: 'text';
      id: string;
      prompt: string;
      /** Accepted answers; marking ignores case and punctuation. */
      answers: string[];
      maxWords: number;
      explanation: string;
    };

export interface GeneratedObjectiveTask {
  kind: 'objective';
  title: string;
  instructions: string;
  /** Reading text (several labelled texts are separated by blank lines). */
  passage?: string;
  /** Listening script, one line per turn. Hidden until the task is marked. */
  script?: { speaker: string; text: string }[];
  questions: ObjectiveQuestion[];
}

export type GeneratedTask = GeneratedWritingTask | GeneratedSpeakingTask | GeneratedObjectiveTask;

export class TaskGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskGenerationError';
  }
}

export interface TaskRef {
  exam: ExamSpec;
  variant: ExamVariant;
  section: SectionSpec;
  task: TaskSpec;
}

/* ---------- shared prompt pieces ---------- */

export const levelLine = (exam: ExamSpec, variant: ExamVariant): string =>
  variant.level
    ? `Target level: CEFR ${variant.level} (${exam.name} ${variant.title}).`
    : `Target level: ${variant.difficultyHint ?? 'as in the real exam'}.`;

const header = ({ exam, variant, section, task }: TaskRef): string[] => [
  `You write original practice material for the ${exam.name} exam (${exam.fullName}), ${variant.title}.`,
  `Exam language: ${findLanguage(exam.languageId).title}. Everything the candidate reads or hears is in this language.`,
  levelLine(exam, variant),
  `Section: ${section.title} (${section.skill}). Task: ${task.title}.`,
  `What this task is in the real exam: ${task.description}`,
  'The material must be ORIGINAL — never reproduce real past papers or copyrighted texts.',
];

const avoidLine = (avoidTitles: string[]): string[] =>
  avoidTitles.length > 0 ? [`Do not reuse these topics: ${avoidTitles.slice(-12).join('; ')}.`] : [];

const JSON_ONLY = 'Output STRICT JSON only — no prose, no markdown, no code fences.';

/* ---------- writing ---------- */

export const buildWritingTaskPrompt = (ref: TaskRef & { task: WritingTaskSpec }, avoidTitles: string[] = []): string => {
  const { task } = ref;
  const words = task.words.max ? `${task.words.min}–${task.words.max}` : `at least ${task.words.min}`;
  const chart =
    task.format === 'chartReport'
      ? [
          'This task is built on a chart. Invent realistic data and return it in "chart":',
          '  kind "bar" or "line"; 3–8 labels (years, countries, categories); 1–4 series, each with exactly one numeric value per label; a unit such as "%" or "millions".',
          'The prompt must say what the chart shows and ask the candidate to summarise the main features and make comparisons where relevant.',
        ]
      : ['Do not include "chart".'];
  return [
    ...header(ref),
    `Required length of the candidate's answer: ${words} words.`,
    ...avoidLine(avoidTitles),
    '',
    'Write one task exactly as it would appear on the exam paper.',
    '- "title": a short topic name (2–6 words) in the exam language.',
    '- "prompt": the full instructions the candidate reads, in the exam language, including the word count.',
    '- "context": only if the task refers to material the candidate saw or heard (e.g. a recording) — summarise that material in the exam language; otherwise omit.',
    '- "points": the content points the answer must cover, if the task lists any (else an empty array).',
    ...chart,
    JSON_ONLY,
    'Schema: {"title":"…","prompt":"…","context":"…","points":["…"],"chart":{"kind":"bar","title":"…","unit":"…","labels":["…"],"series":[{"name":"…","values":[1]}]}}',
  ].join('\n');
};

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const strList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(str).filter((item) => item.length > 0) : [];

const parseChart = (raw: unknown): ChartData => {
  const data = (raw ?? {}) as Record<string, unknown>;
  const labels = strList(data.labels);
  const series = Array.isArray(data.series)
    ? data.series.map((s) => {
        const entry = (s ?? {}) as Record<string, unknown>;
        const values = Array.isArray(entry.values) ? entry.values.map(Number) : [];
        return { name: str(entry.name), values };
      })
    : [];
  if (labels.length < 2 || labels.length > 12) throw new TaskGenerationError('chart needs 2–12 labels');
  if (series.length === 0 || series.length > 5) throw new TaskGenerationError('chart needs 1–5 series');
  for (const s of series) {
    if (s.values.length !== labels.length || s.values.some((v) => !Number.isFinite(v))) {
      throw new TaskGenerationError('chart series does not match its labels');
    }
  }
  return {
    kind: data.kind === 'line' ? 'line' : 'bar',
    title: str(data.title),
    unit: str(data.unit),
    labels,
    series: series.map((s, i) => ({ ...s, name: s.name || `Series ${i + 1}` })),
  };
};

export const parseWritingTask = (raw: unknown, task: WritingTaskSpec): GeneratedWritingTask => {
  const data = (raw ?? {}) as Record<string, unknown>;
  const title = str(data.title);
  const prompt = str(data.prompt);
  if (!title || !prompt) throw new TaskGenerationError('task is missing its title or prompt');
  const context = str(data.context);
  return {
    kind: 'writing',
    title,
    prompt,
    ...(context ? { context } : {}),
    points: strList(data.points),
    ...(task.format === 'chartReport' ? { chart: parseChart(data.chart) } : {}),
  };
};

/* ---------- speaking ---------- */

export const buildSpeakingTaskPrompt = (ref: TaskRef & { task: SpeakingTaskSpec }, avoidTitles: string[] = []): string => {
  const { task } = ref;
  const minutes = Math.max(1, Math.round(task.speakSeconds / 60));
  const shape: Record<SpeakingTaskSpec['format'], string> = {
    interview: '"questions": 5–8 short examiner questions on 2–3 familiar topics. No "cueCard", no "material".',
    longTurn:
      'Either a "cueCard" (a topic plus 3–4 bullet prompts) for a monologue, or "material" describing the proposals/options the candidate must assess — whichever matches the real task. "questions": 2–4 follow-up questions the examiner asks afterwards.',
    discussion: '"material" if the task gives data or a news item to comment on (else omit). "questions": 4–6 discussion questions, more abstract than everyday small talk.',
    pictureDescription:
      'The candidate will see a random photo, so do not describe one. "instructions" tell them what to describe and imagine; "questions": 3–5 follow-up questions that work for any everyday photo.',
    roleplay: '"material" sets the situation and the candidate\'s role. "questions": 4–6 lines the examiner says in the role-play.',
  };
  return [
    ...header(ref),
    `The candidate speaks for about ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    ...avoidLine(avoidTitles),
    '',
    '- "title": a short topic name in the exam language.',
    '- "instructions": what the candidate must do, in the exam language, as the examiner would say it.',
    `- ${shape[task.format]}`,
    JSON_ONLY,
    'Schema: {"title":"…","instructions":"…","questions":["…"],"cueCard":{"topic":"…","points":["…"]},"material":"…"}',
  ].join('\n');
};

export const parseSpeakingTask = (raw: unknown, task: SpeakingTaskSpec): GeneratedSpeakingTask => {
  const data = (raw ?? {}) as Record<string, unknown>;
  const title = str(data.title);
  const instructions = str(data.instructions);
  const questions = strList(data.questions);
  if (!title || !instructions) throw new TaskGenerationError('task is missing its title or instructions');
  const card = (data.cueCard ?? null) as Record<string, unknown> | null;
  const cueTopic = card ? str(card.topic) : '';
  const material = str(data.material);
  if (questions.length === 0 && !cueTopic) throw new TaskGenerationError('task has nothing to answer');
  return {
    kind: 'speaking',
    title,
    instructions,
    questions,
    ...(cueTopic ? { cueCard: { topic: cueTopic, points: strList(card?.points) } } : {}),
    ...(material ? { material } : {}),
    usesPicture: task.format === 'pictureDescription',
  };
};

/* ---------- reading & listening ---------- */

const QUESTION_GUIDE: Record<ObjectiveQuestionType, string> = {
  multipleChoice: 'multiple choice → kind "choice", 3 or 4 options, one correct.',
  trueFalseNotGiven:
    'True/False/Not Given → kind "choice" with options exactly ["True","False","Not Given"] (or ["Yes","No","Not Given"] for the writer\'s views).',
  matching:
    'matching (statements to texts, speakers, headings or paragraphs) → kind "choice" whose options are the labels to match, e.g. ["A","B","C","D"] or the speaker names.',
  gapFill:
    'gap fill → put "____" in the prompt; if the exam gives options (fragments or words to choose from) use kind "choice", otherwise kind "text".',
  sentenceCompletion:
    'sentence completion → kind "text": a sentence with "____" to complete with words taken unchanged from the text/recording.',
  formCompletion:
    'form/note/table completion → kind "text": a labelled field with "____", answered with words or a number heard/read unchanged.',
  ordering: 'ordering → kind "choice" asking which item comes in a given position.',
};

/* Reading and listening are generated in two calls — first the text or
   recording, then the questions on it. One call asking for a 900-word passage
   plus 14 questions overruns the Worker's output limit and comes back cut off;
   two smaller answers fit, and the questions are written against the final
   text rather than alongside it. */

export const buildObjectiveStimulusPrompt = (
  ref: TaskRef & { task: ObjectiveTaskSpec },
  avoidTitles: string[] = [],
): string => {
  const { task, section } = ref;
  const listening = section.skill === 'listening';
  return [
    ...header(ref),
    ...avoidLine(avoidTitles),
    `${task.items} questions will be written on this material later, so it must contain enough distinct, testable details.`,
    '',
    listening
      ? `Write the recording as a script of about ${task.stimulusWords} words in "script": an array of turns {"speaker":"…","text":"…"}. Use 1 speaker for a monologue, 2–4 for a conversation; give speakers short names.`
      : `Write the reading text(s) of about ${task.stimulusWords} words in "passage". If the task has several short texts, label each ("A", "B"… or the author's name) at the start of its paragraph and separate texts with a blank line.`,
    '- "title": a short topic name in the exam language.',
    '- "instructions": the rubric line the candidate reads, in the exam language.',
    JSON_ONLY,
    listening
      ? 'Schema: {"title":"…","instructions":"…","script":[{"speaker":"…","text":"…"}]}'
      : 'Schema: {"title":"…","instructions":"…","passage":"…"}',
  ].join('\n');
};

export const buildObjectiveQuestionsPrompt = (
  ref: TaskRef & { task: ObjectiveTaskSpec },
  material: string,
): string => {
  const { task, section } = ref;
  const listening = section.skill === 'listening';
  return [
    ...header(ref),
    '',
    `${listening ? 'Recording script' : 'Reading text'}:`,
    '"""',
    material,
    '"""',
    '',
    `Write EXACTLY ${task.items} questions on this ${listening ? 'recording' : 'text'} in "questions", in the order the answers appear.`,
    'Allowed question formats for this task:',
    ...task.questionTypes.map((type) => `- ${QUESTION_GUIDE[type]}`),
    '- kind "choice": "options" array and the zero-based "answerIndex" of the single correct option.',
    `- kind "text": "answers" lists every acceptable answer (e.g. "15" and "fifteen"); "maxWords" is the word limit (1–3). Every answer must appear word-for-word in the ${listening ? 'script' : 'text'}.`,
    '- Every question has an "explanation" in English of at most 15 words saying why the answer is right.',
    '- Exactly one defensible answer per question; distractors must be plausible but clearly wrong.',
    '- Questions and options are in the exam language.',
    JSON_ONLY,
    'Schema: {"questions":[{"kind":"choice","prompt":"…","options":["…"],"answerIndex":0,"explanation":"…"},{"kind":"text","prompt":"… ____ …","answers":["…"],"maxWords":2,"explanation":"…"}]}',
  ].join('\n');
};

/** Lower-case, strip accents' case-insensitive noise and punctuation, collapse spaces. */
export const normalizeAnswer = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const parseObjectiveTask = (
  raw: unknown,
  task: ObjectiveTaskSpec,
  skill: SectionSpec['skill'],
): GeneratedObjectiveTask => {
  const data = (raw ?? {}) as Record<string, unknown>;
  const title = str(data.title);
  const instructions = str(data.instructions);
  if (!title || !instructions) throw new TaskGenerationError('task is missing its title or instructions');

  const passage = str(data.passage);
  const script = Array.isArray(data.script)
    ? data.script
        .map((turn) => {
          const t = (turn ?? {}) as Record<string, unknown>;
          return { speaker: str(t.speaker) || '—', text: str(t.text) };
        })
        .filter((turn) => turn.text.length > 0)
    : [];
  const listening = skill === 'listening';
  if (listening && script.length === 0) throw new TaskGenerationError('listening task has no script');
  if (!listening && passage.length === 0) throw new TaskGenerationError('reading task has no passage');
  const source = normalizeAnswer(listening ? script.map((turn) => turn.text).join(' ') : passage);

  const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
  if (rawQuestions.length < task.items) {
    throw new TaskGenerationError(`expected ${task.items} questions, got ${rawQuestions.length}`);
  }
  const questions = rawQuestions.slice(0, task.items).map((rawQuestion, index): ObjectiveQuestion => {
    const q = (rawQuestion ?? {}) as Record<string, unknown>;
    const id = `q${index + 1}`;
    const prompt = str(q.prompt);
    const explanation = str(q.explanation);
    if (!prompt) throw new TaskGenerationError(`question ${index + 1} has no prompt`);
    if (q.kind === 'text') {
      const answers = strList(q.answers);
      if (answers.length === 0) throw new TaskGenerationError(`question ${index + 1} has no answer`);
      if (!answers.some((answer) => source.includes(normalizeAnswer(answer)))) {
        throw new TaskGenerationError(`question ${index + 1}: answer is not in the text`);
      }
      const maxWords = Math.min(Math.max(Math.round(Number(q.maxWords) || 3), 1), 5);
      return { kind: 'text', id, prompt, answers, maxWords, explanation };
    }
    const options = strList(q.options);
    const answerIndex = Number(q.answerIndex);
    if (options.length < 2) throw new TaskGenerationError(`question ${index + 1} needs options`);
    if (new Set(options.map(normalizeAnswer)).size !== options.length) {
      throw new TaskGenerationError(`question ${index + 1} repeats an option`);
    }
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) {
      throw new TaskGenerationError(`question ${index + 1} has no valid answer`);
    }
    return { kind: 'choice', id, prompt, options, answerIndex, explanation };
  });

  return {
    kind: 'objective',
    title,
    instructions,
    ...(listening ? { script } : { passage }),
    questions,
  };
};

/* ---------- running it ---------- */

const ATTEMPTS = 2;

/** One AI call, validated by `parse`; retried once on a bad answer. */
const askValidated = async <T>(
  prompt: string,
  parse: (raw: unknown) => T,
  signal?: AbortSignal,
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const raw = await generateJSON<unknown>({ prompt, task: 'exam_task_generation' }, signal);
      return parse(raw);
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new TaskGenerationError('Could not generate the task');
};

const materialText = (data: Record<string, unknown>, listening: boolean): string =>
  listening && Array.isArray(data.script)
    ? data.script
        .map((turn) => {
          const t = (turn ?? {}) as Record<string, unknown>;
          return `${str(t.speaker) || '—'}: ${str(t.text)}`;
        })
        .join('\n')
    : str(data.passage);

/** Generate and validate one task. */
export const generateTask = async (
  ref: TaskRef,
  options: { avoidTitles?: string[]; signal?: AbortSignal } = {},
): Promise<GeneratedTask> => {
  const { task, section } = ref;
  const { avoidTitles = [], signal } = options;
  if (task.kind === 'writing') {
    return askValidated(buildWritingTaskPrompt({ ...ref, task }, avoidTitles), (raw) => parseWritingTask(raw, task), signal);
  }
  if (task.kind === 'speaking') {
    return askValidated(buildSpeakingTaskPrompt({ ...ref, task }, avoidTitles), (raw) => parseSpeakingTask(raw, task), signal);
  }
  const objectiveRef = { ...ref, task };
  const listening = section.skill === 'listening';
  const stimulus = await askValidated(
    buildObjectiveStimulusPrompt(objectiveRef, avoidTitles),
    (raw) => {
      const data = (raw ?? {}) as Record<string, unknown>;
      if (!str(data.title) || !str(data.instructions)) throw new TaskGenerationError('material has no title');
      if (materialText(data, listening).length < 80) throw new TaskGenerationError('material is too short');
      return data;
    },
    signal,
  );
  return askValidated(
    buildObjectiveQuestionsPrompt(objectiveRef, materialText(stimulus, listening)),
    (raw) => parseObjectiveTask({ ...stimulus, questions: (raw as Record<string, unknown> | null)?.questions }, task, section.skill),
    signal,
  );
};
