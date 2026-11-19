/* Exam prep — what the screens need to show an exam that the spec does not
   carry: card colours, skill icons and time totals. Colours are theme tokens
   only, so every exam card follows the light/dark theme like the practice
   cards do. */

import type { ExamAttempt } from './examStorage';
import type { ExamSkill, ExamVariant, SectionSpec } from './types';

export interface ExamAccent {
  accent: string;
  blob: string;
}

const EXAM_ACCENTS: Record<string, ExamAccent> = {
  ielts: { accent: 'var(--color-primary-blue)', blob: 'var(--color-mode-blob-blue)' },
  dele: { accent: 'var(--color-accent-rose)', blob: 'var(--color-mode-blob-pink)' },
};

const DEFAULT_ACCENT: ExamAccent = {
  accent: 'var(--color-accent-indigo)',
  blob: 'var(--color-mode-blob-violet)',
};

export const examAccent = (examId: string): ExamAccent => EXAM_ACCENTS[examId] ?? DEFAULT_ACCENT;

/* Same icons and labels the sidebar uses for the four practice modes. */
export const SKILL_ICONS: Record<ExamSkill, string> = {
  reading: 'book',
  listening: 'headphones',
  writing: 'pencil.and.scribble',
  speaking: 'bubble.left.and.bubble.right',
};

export const SKILL_LABEL_KEYS: Record<ExamSkill, string> = {
  reading: 'nav.reading',
  listening: 'nav.listening',
  writing: 'nav.writing',
  speaking: 'nav.speaking',
};

/** Minutes a candidate spends on the whole exam, prep time included. */
export const variantMinutes = (variant: ExamVariant): number =>
  variant.sections.reduce((sum, section) => sum + section.minutes + (section.prepMinutes ?? 0), 0);

/** `{ hours, minutes }` for a duration label; hours is 0 under an hour. */
export const splitMinutes = (total: number): { hours: number; minutes: number } => ({
  hours: Math.floor(total / 60),
  minutes: total % 60,
});

/** How many times the section's recordings play, when every task agrees. */
export const sectionPlays = (section: SectionSpec): 1 | 2 | undefined => {
  const plays = new Set(section.tasks.map((task) => (task.kind === 'objective' ? task.plays : undefined)));
  if (plays.size !== 1) return undefined;
  return [...plays][0];
};

/** A section score as the exam prints it: bands with one decimal (6.0, 6.5),
    points as they are (18.75). */
export const formatSectionScore = (section: SectionSpec, score: number): string =>
  section.scoring.kind === 'objectiveTable' || section.scoring.kind === 'rubricBand' ? score.toFixed(1) : String(score);

/** The maximum a section can score, for "x / max" labels. */
export const sectionMax = (section: SectionSpec): number => {
  const { scoring } = section;
  if (scoring.kind === 'objectiveScaled' || scoring.kind === 'rubricScaled') return scoring.max;
  if (scoring.kind === 'rubricBand') return scoring.criterionMax;
  return Math.max(...scoring.table.map((row) => row.score));
};

/** Whole days from today until `isoDate` (negative once it has passed). */
export const daysUntil = (isoDate: string, now = new Date()): number => {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
};

/** The number an attempt with a full result is plotted by: the band, or the total. */
export const attemptScore = (attempt: ExamAttempt): number | null => {
  if (!attempt.result) return null;
  return attempt.result.kind === 'band' ? attempt.result.overall : attempt.result.total;
};
