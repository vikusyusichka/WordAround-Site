/* One review card through its three phases (source → question → result with
   rating) — web port of GrammarReviewSessionView. The reducer owns all state;
   this component only renders the current phase and collects the answer. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { QUIZ_TYPE_ICON } from '@/lib/grammarMeta';
import { REVIEW_RESULTS } from '@/lib/grammarReview';
import type { GrammarReviewCard } from '@/lib/grammarReviewQueue';
import type { ReviewAnswer, ReviewPhase } from '@/lib/grammarReviewSession';
import type { GrammarReviewResult } from '@/lib/models';

interface ReviewSessionScreenProps {
  card: GrammarReviewCard;
  phase: ReviewPhase;
  lastAnswer: ReviewAnswer | null;
  onContinue: () => void;
  onSubmit: (answer: string) => void;
  onRate: (result: GrammarReviewResult) => void;
  onOpenNote: () => void;
}

const RESULT_META: Record<GrammarReviewResult, { icon: string; intervalKey: string }> = {
  forgot: { icon: 'xmark.circle.fill', intervalKey: 'plus4h' },
  hard: { icon: 'exclamationmark.triangle.fill', intervalKey: 'plus1d' },
  good: { icon: 'checkmark.circle.fill', intervalKey: 'plus3d' },
  easy: { icon: 'sparkles', intervalKey: 'plus7d' },
};

const RESULT_COLOR: Record<GrammarReviewResult, string> = {
  forgot: 'var(--color-cs-red)',
  hard: '#F59E0B',
  good: 'var(--color-primary-blue)',
  easy: '#22C55E',
};

export const ReviewSessionScreen = ({
  card,
  phase,
  lastAnswer,
  onContinue,
  onSubmit,
  onRate,
  onOpenNote,
}: ReviewSessionScreenProps) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const question = card.question;
  const isTapType = question.type === 'multipleChoice' || question.type === 'trueFalse';
  const tapOptions = question.type === 'trueFalse' ? ['True', 'False'] : question.options;

  /* --- Source phase --- */
  if (phase === 'source') {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[#7C5CFF]/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#7C5CFF]">
              {t(`writing.grammar.review.sourceType.${card.reviewItem.sourceType}`)}
            </span>
            {card.sourceBlockType && (
              <span className="rounded-full bg-(--color-goal-bg) px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                {t(`writing.grammar.block.${card.sourceBlockType}`)}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-[18px] font-bold text-(--color-primary-blue-dark)">
            {card.note.title || t('writing.grammar.review.untitled')}
          </h3>
          <p className="mt-2 text-[15px] font-medium text-(--color-primary-blue-dark)">
            {card.sourceText}
          </p>
          {card.sourceSecondaryText && (
            <p className="mt-1 text-[14px] font-medium text-(--color-text-secondary)">
              {card.sourceSecondaryText}
            </p>
          )}
          {card.reviewItem.reviewCount > 0 && (
            <p className="mt-3 text-[12px] font-semibold text-(--color-muted-text)">
              {t('writing.grammar.review.stats', {
                count: card.reviewItem.reviewCount,
                streak: card.reviewItem.correctStreak,
              })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
        >
          {t('writing.grammar.review.continueToQuestion')}
        </button>
      </div>
    );
  }

  /* --- Question phase --- */
  if (phase === 'question') {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-3xl border border-(--color-auth-field-border) bg-white p-5">
          <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-(--color-muted-text)">
            <Icon name={QUIZ_TYPE_ICON[question.type]} className="size-[13px]" />
            {t(`writing.grammar.quiz.type.${question.type}`)}
          </span>
          <p className="mt-2 text-[17px] font-semibold text-(--color-primary-blue-dark)">
            {question.questionText}
          </p>
        </div>

        {isTapType ? (
          <div className="flex flex-col gap-2">
            {tapOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onSubmit(option)}
                className="rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-left text-[15px] font-semibold text-(--color-primary-blue-dark) transition-colors hover:border-(--color-primary-blue)/35"
              >
                {question.type === 'trueFalse'
                  ? t(`writing.grammar.quiz.play.${option === 'True' ? 'trueLabel' : 'falseLabel'}`)
                  : option}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                question.type === 'fillGap'
                  ? t('writing.grammar.quiz.play.typeMissing')
                  : t('writing.grammar.quiz.play.typeAnswer')
              }
              rows={question.type === 'fillGap' ? 1 : 3}
              className="w-full resize-none rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
            />
            <button
              type="button"
              onClick={() => onSubmit(input)}
              disabled={question.type === 'fillGap' && input.trim().length === 0}
              className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              {question.type === 'shortAnswer'
                ? t('writing.grammar.review.showAnswer')
                : t('writing.grammar.quiz.play.submit')}
            </button>
          </div>
        )}
      </div>
    );
  }

  /* --- Result phase (feedback + rating) --- */
  return (
    <div className="flex flex-col gap-4">
      {lastAnswer?.autoGraded ? (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 ${
            lastAnswer.correct
              ? 'border-[#22C55E]/40 bg-[#22C55E]/8'
              : 'border-(--color-cs-red)/40 bg-(--color-cs-red)/8'
          }`}
        >
          <p
            className={`text-[15px] font-bold ${
              lastAnswer.correct ? 'text-[#15803D]' : 'text-(--color-cs-red)'
            }`}
          >
            {lastAnswer.correct
              ? t('writing.grammar.quiz.play.correct')
              : t('writing.grammar.quiz.play.incorrect')}
          </p>
          {!lastAnswer.correct && (
            <p className="mt-1 text-[14px] font-medium text-(--color-primary-blue-dark)">
              {t('writing.grammar.quiz.play.correctAnswer', { answer: question.correctAnswer })}
            </p>
          )}
          {question.explanation && (
            <p className="mt-1 text-[13px] font-medium text-(--color-text-secondary)">
              {question.explanation}
            </p>
          )}
        </div>
      ) : (
        <div role="status" className="rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3">
          <p className="text-[13px] font-bold uppercase tracking-wide text-(--color-muted-text)">
            {t('writing.grammar.review.compareTitle')}
          </p>
          {lastAnswer && lastAnswer.answer.trim().length > 0 && (
            <p className="mt-1.5 text-[14px] font-medium text-(--color-primary-blue-dark)">
              {t('writing.grammar.quiz.result.yourAnswer', { answer: lastAnswer.answer })}
            </p>
          )}
          <p className="mt-1 text-[14px] font-medium text-[#15803D]">
            {t('writing.grammar.review.referenceAnswer', { answer: question.correctAnswer })}
          </p>
          {question.explanation && (
            <p className="mt-1 text-[13px] font-medium text-(--color-text-secondary)">
              {question.explanation}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onOpenNote}
        className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline"
      >
        {t('writing.grammar.review.openNote')}
      </button>

      {/* Rating 2×2: forgot / hard / good / easy with next intervals. */}
      <div className="grid grid-cols-2 gap-2">
        {REVIEW_RESULTS.map((result) => (
          <button
            key={result}
            type="button"
            onClick={() => onRate(result)}
            className="flex flex-col items-center gap-1 rounded-2xl border border-(--color-auth-field-border) bg-white px-3 py-3 transition-colors hover:bg-black/[0.02]"
          >
            <span className="flex items-center gap-1.5 text-[14px] font-bold" style={{ color: RESULT_COLOR[result] }}>
              <Icon name={RESULT_META[result].icon} className="size-[15px]" />
              {t(`writing.grammar.review.rating.${result}`)}
            </span>
            <span className="text-[11px] font-semibold text-(--color-muted-text)">
              {t(`writing.grammar.review.interval.${RESULT_META[result].intervalKey}`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
