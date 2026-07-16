/* Quiz result — web port of GrammarNoteQuizResultView: animated score ring,
   grade label (bands 90/70/50), Incorrect-then-Correct breakdown, and
   Try Again / Review note / Done actions. */
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { gradeForScore, type AnsweredQuestion } from '@/lib/grammarQuizSession';

interface QuizResultViewProps {
  score: number;
  correct: number;
  total: number;
  answered: AnsweredQuestion[];
  onTryAgain: () => void;
  onReviewNote: () => void;
  onDone: () => void;
}

const GRADE_COLOR: Record<ReturnType<typeof gradeForScore>, string> = {
  excellent: '#22C55E',
  good: 'var(--color-primary-blue)',
  keepPracticing: '#F59E0B',
  reviewNote: 'var(--color-cs-red)',
};

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const QuizResultView = ({
  score,
  correct,
  total,
  answered,
  onTryAgain,
  onReviewNote,
  onDone,
}: QuizResultViewProps) => {
  const { t } = useTranslation();
  const grade = gradeForScore(score);
  const color = GRADE_COLOR[grade];
  const incorrect = answered.filter((a) => !a.isCorrect);
  const correctOnes = answered.filter((a) => a.isCorrect);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {/* Score ring */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative size-[128px]">
          <svg viewBox="0 0 128 128" className="size-full -rotate-90">
            <circle
              cx="64" cy="64" r={RING_RADIUS} fill="none" strokeWidth="10"
              className="stroke-(--color-goal-bg)"
            />
            <motion.circle
              cx="64" cy="64" r={RING_RADIUS} fill="none" strokeWidth="10"
              strokeLinecap="round" stroke={color}
              strokeDasharray={RING_CIRCUMFERENCE}
              initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
              animate={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - score / 100) }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-[28px] font-extrabold text-(--color-primary-blue-dark)">
              {score}%
            </span>
          </div>
        </div>
        <p className="text-[17px] font-bold" style={{ color }}>
          {t(`writing.grammar.quiz.result.grade.${grade}`)}
        </p>
        <p className="text-[14px] font-medium text-(--color-text-secondary)">
          {t('writing.grammar.quiz.result.scoreOf', { correct, total })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 md:flex-row">
        <button
          type="button"
          onClick={onTryAgain}
          className="h-12 flex-1 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
        >
          {t('writing.grammar.quiz.result.tryAgain')}
        </button>
        <button
          type="button"
          onClick={onReviewNote}
          className="h-12 flex-1 rounded-2xl border border-(--color-primary-blue)/35 bg-white text-[15px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/5"
        >
          {t('writing.grammar.quiz.result.reviewNote')}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-12 flex-1 rounded-2xl border border-(--color-auth-field-border) bg-white text-[15px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03]"
        >
          {t('writing.grammar.quiz.result.done')}
        </button>
      </div>

      {/* Breakdown — incorrect first, then correct (iOS order). */}
      {incorrect.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-(--color-cs-red)">
            {t('writing.grammar.quiz.result.incorrectSection')}
          </h3>
          {incorrect.map(({ question, userAnswer }) => (
            <div
              key={question.id}
              className="rounded-2xl border border-(--color-cs-red)/25 bg-white px-4 py-3"
            >
              <p className="text-[14px] font-semibold text-(--color-primary-blue-dark)">
                {question.questionText}
              </p>
              <p className="mt-1 text-[13px] font-medium text-(--color-cs-red)">
                {t('writing.grammar.quiz.result.yourAnswer', { answer: userAnswer ?? '—' })}
              </p>
              <p className="text-[13px] font-medium text-[#15803D]">
                {t('writing.grammar.quiz.play.correctAnswer', { answer: question.correctAnswer })}
              </p>
              {question.explanation && (
                <p className="mt-1 text-[12px] font-medium text-(--color-text-secondary)">
                  {question.explanation}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {correctOnes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#15803D]">
            {t('writing.grammar.quiz.result.correctSection')}
          </h3>
          {correctOnes.map(({ question }) => (
            <div
              key={question.id}
              className="flex items-start gap-2 rounded-2xl border border-[#22C55E]/25 bg-white px-4 py-3"
            >
              <Icon name="checkmark.circle.fill" className="mt-0.5 size-[16px] shrink-0 text-[#22C55E]" />
              <div>
                <p className="text-[14px] font-semibold text-(--color-primary-blue-dark)">
                  {question.questionText}
                </p>
                {question.explanation && (
                  <p className="mt-1 text-[12px] font-medium text-(--color-text-secondary)">
                    {question.explanation}
                  </p>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
