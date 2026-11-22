/* Own tests ("Власні тести") — tests a learner or a teacher writes in the
   constructor and then takes, or shares by link. Free-form: any number of
   sections, any question types, nothing tied to an exam's format.

   This file is pure (no Firebase): the shapes, the rules a test must meet
   before it can be saved, and the marking. Answers are revealed only at the
   end, so marking runs once, over the whole attempt.

   Phase 1 has reading and listening sections; writing and speaking come next
   and slot into `CustomSection` as further kinds. */
import { isAnswerCorrect } from '@/lib/grammarQuizSession';
import type { GrammarQuizQuestion } from '@/lib/models';

/** Same question shape (and the same question form) as grammar quizzes. */
export type CustomQuestion = GrammarQuizQuestion;

export type ListeningAudio =
  | { source: 'tts'; text: string }
  | { source: 'file'; url: string; path: string; name: string };

export interface ReadingSection {
  id: string;
  kind: 'reading';
  title: string;
  text: string;
  questions: CustomQuestion[];
}

export interface ListeningSection {
  id: string;
  kind: 'listening';
  title: string;
  audio: ListeningAudio;
  /** How many times the audio may be played; null = as often as you like. */
  maxPlays: number | null;
  questions: CustomQuestion[];
}

export type CustomSection = ReadingSection | ListeningSection;
export type CustomSectionKind = CustomSection['kind'];

export const SECTION_KINDS: CustomSectionKind[] = ['reading', 'listening'];

export interface CustomTest {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  /** An ESSAY_LANGUAGES id — picks the voice that reads listening texts. */
  languageId: string;
  /** Whole-test time limit; null = no timer. */
  timeLimitMinutes: number | null;
  sections: CustomSection[];
  createdAt: number;
  updatedAt: number;
}

export const MAX_TIME_LIMIT_MINUTES = 300;

export const newSection = (kind: CustomSectionKind): CustomSection =>
  kind === 'reading'
    ? { id: crypto.randomUUID(), kind, title: '', text: '', questions: [] }
    : { id: crypto.randomUUID(), kind, title: '', audio: { source: 'tts', text: '' }, maxPlays: null, questions: [] };

/* ── Validation ────────────────────────────────────────────────────────── */

export type TestProblem =
  | { code: 'titleRequired' }
  | { code: 'sectionsRequired' }
  | { code: 'timeLimitInvalid' }
  | { code: 'readingTextRequired'; section: number }
  | { code: 'audioRequired'; section: number }
  | { code: 'questionsRequired'; section: number };

/** Every problem, in reading order, so the editor can point at each one. */
export const testProblems = (
  test: Pick<CustomTest, 'title' | 'timeLimitMinutes' | 'sections'>,
): TestProblem[] => {
  const problems: TestProblem[] = [];
  if (test.title.trim().length === 0) problems.push({ code: 'titleRequired' });
  if (
    test.timeLimitMinutes !== null &&
    (!Number.isInteger(test.timeLimitMinutes) ||
      test.timeLimitMinutes < 1 ||
      test.timeLimitMinutes > MAX_TIME_LIMIT_MINUTES)
  ) {
    problems.push({ code: 'timeLimitInvalid' });
  }
  if (test.sections.length === 0) problems.push({ code: 'sectionsRequired' });
  test.sections.forEach((section, i) => {
    const number = i + 1;
    if (section.kind === 'reading' && section.text.trim().length === 0) {
      problems.push({ code: 'readingTextRequired', section: number });
    }
    if (section.kind === 'listening') {
      const { audio } = section;
      const empty = audio.source === 'tts' ? audio.text.trim().length === 0 : audio.url.length === 0;
      if (empty) problems.push({ code: 'audioRequired', section: number });
    }
    if (section.questions.length === 0) problems.push({ code: 'questionsRequired', section: number });
  });
  return problems;
};

export const questionCount = (test: Pick<CustomTest, 'sections'>): number =>
  test.sections.reduce((sum, s) => sum + s.questions.length, 0);

/* ── Marking ───────────────────────────────────────────────────────────── */

export interface ReviewItem {
  questionText: string;
  type: CustomQuestion['type'];
  /** What the learner gave ('' when they left it). */
  given: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface SectionResult {
  sectionId: string;
  kind: CustomSectionKind;
  title: string;
  correct: number;
  total: number;
  items: ReviewItem[];
}

export interface TestResult {
  correct: number;
  total: number;
  /** 0–100, rounded. */
  percent: number;
  sections: SectionResult[];
}

/** answers: question id → what the learner gave. */
export const markTest = (
  test: Pick<CustomTest, 'sections'>,
  answers: Record<string, string>,
): TestResult => {
  const sections = test.sections.map((section): SectionResult => {
    const items = section.questions.map((q): ReviewItem => {
      const given = (answers[q.id] ?? '').trim();
      return {
        questionText: q.questionText,
        type: q.type,
        given,
        correctAnswer: q.correctAnswer,
        isCorrect: given.length > 0 && isAnswerCorrect(q, given),
        ...(q.explanation ? { explanation: q.explanation } : {}),
      };
    });
    return {
      sectionId: section.id,
      kind: section.kind,
      title: section.title,
      correct: items.filter((item) => item.isCorrect).length,
      total: items.length,
      items,
    };
  });
  const correct = sections.reduce((sum, s) => sum + s.correct, 0);
  const total = sections.reduce((sum, s) => sum + s.total, 0);
  return { correct, total, percent: total === 0 ? 0 : Math.round((correct / total) * 100), sections };
};

/** Seconds left on the clock; null when the test has no timer. Never negative. */
export const secondsLeft = (
  timeLimitMinutes: number | null,
  startedAt: number,
  now: number,
): number | null =>
  timeLimitMinutes === null
    ? null
    : Math.max(0, Math.ceil((startedAt + timeLimitMinutes * 60_000 - now) / 1000));

export const formatClock = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
};
