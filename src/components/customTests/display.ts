import type { TFunction } from 'i18next';

import type { CustomQuestion, CustomSectionKind } from '@/lib/customTests/model';

export const SECTION_ICONS: Record<CustomSectionKind, string> = {
  reading: 'book.fill',
  listening: 'headphones',
};

/** Same colour steps the score uses everywhere: green / amber / red. */
export const percentColor = (percent: number): string =>
  percent >= 70 ? 'var(--color-accent-green-text)' : percent >= 50 ? 'var(--color-orange-accent)' : 'var(--color-cs-red)';

/** A question's answer as the learner reads it ("True" → the localised word). */
export const answerLabel = (
  question: Pick<CustomQuestion, 'type' | 'correctAnswer'>,
  t: TFunction,
  value = question.correctAnswer,
): string =>
  question.type === 'trueFalse' && (value === 'True' || value === 'False')
    ? t(value === 'True' ? 'writing.grammar.quiz.play.trueLabel' : 'writing.grammar.quiz.play.falseLabel')
    : value;

export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};
