/* Exam prep — what the screens need to show an exam that the spec does not
   carry: card colours, skill icons and time totals. Colours are theme tokens
   only, so every exam card follows the light/dark theme like the practice
   cards do. */

import type { ExamAttempt } from './examStorage';
import { objectiveItemCount } from './scoring';
import type { ExamSkill, ExamVariant, SectionSpec, TaskSpec } from './types';

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

/** Time a single task gets when practised on its own: its share of the
    section clock. Speaking has no clock here — the recording sets the pace. */
export const practiceSeconds = (section: SectionSpec, task: TaskSpec): number | null => {
  if (task.kind === 'speaking') return null;
  if (task.kind === 'writing') {
    const writingTasks = section.tasks.filter((t) => t.kind === 'writing').length;
    return Math.round((task.suggestedMinutes ?? section.minutes / writingTasks) * 60);
  }
  return Math.round(((section.minutes * task.items) / objectiveItemCount(section)) * 60);
};

export const formatClock = (seconds: number): string => {
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const body = `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
  return seconds < 0 ? `+${body}` : body;
};

/** A "nice" axis maximum: 1, 2, 2.5 or 5 times a power of ten, at or above `value`. */
export const niceMax = (value: number): number => {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * power >= value) ?? 10;
  return step * power;
};

/** Whole days from today until `isoDate` (negative once it has passed). */
export const daysUntil = (isoDate: string, now = new Date()): number => {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
};

/** The number a mock attempt is plotted and compared by. */
export const mockScore = (attempt: ExamAttempt): number | null => {
  if (!attempt.result) return null;
  return attempt.result.kind === 'band' ? attempt.result.overall : attempt.result.total;
};

/** A section score as the exam prints it: bands with one decimal (6.0, 6.5),
    points as they are (18.75). */
export const formatSectionScore = (section: SectionSpec, score: number): string =>
  section.scoring.kind === 'objectiveTable' || section.scoring.kind === 'rubricBand' ? score.toFixed(1) : String(score);
