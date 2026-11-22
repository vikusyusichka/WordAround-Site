/* One review card: question → result (feedback, the part of the note it came
   from, and the rating). The reducer owns the state; this component renders
   the current phase, collects the answer, and listens for the keyboard:
   1–4 pick an option or a rating, Enter accepts the suggested rating. */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { QUIZ_TYPE_ICON } from '@/lib/grammarMeta';
import { REVIEW_RESULTS } from '@/lib/grammarReview';
import { formatReviewInterval, isTypingTarget } from '@/lib/grammarReviewFormat';
import type { GrammarReviewCard } from '@/lib/grammarReviewQueue';
import { suggestedRating, type ReviewAnswer, type ReviewPhase } from '@/lib/grammarReviewSession';
import type { GrammarReviewResult } from '@/lib/models';

interface ReviewSessionScreenProps {
  card: GrammarReviewCard;
  phase: ReviewPhase;
  lastAnswer: ReviewAnswer | null;
  /** Next interval (ms) each rating would give this card. */
  intervals: Record<GrammarReviewResult, number>;
  /** The card came back after "Forgot" earlier in this session. */
  isRelearn: boolean;
  onSubmit: (answer: string) => void;
  onRate: (result: GrammarReviewResult) => void;
  onOpenNote: () => void;
}

const RESULT_ICON: Record<GrammarReviewResult, string> = {
  forgot: 'xmark.circle.fill',
  hard: 'exclamationmark.triangle.fill',
  good: 'checkmark.circle.fill',
  easy: 'sparkles',
};

const RESULT_COLOR: Record<GrammarReviewResult, string> = {
  forgot: 'var(--color-cs-red)',
  hard: 'var(--color-accent-amber)',
  good: 'var(--color-primary-blue)',
  easy: 'var(--color-accent-green)',
};

const Kbd = ({ children }: { children: string }) => (
  <kbd className="hidden rounded-md border border-(--color-auth-field-border) px-1.5 font-sans text-[10px] font-bold text-(--color-muted-text) md:inline">
    {children}
  </kbd>
);

export const ReviewSessionScreen = ({
  card,
  phase,
  lastAnswer,
  intervals,
  isRelearn,
  onSubmit,
  onRate,
  onOpenNote,
}: ReviewSessionScreenProps) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const question = card.question;
  const isTapType = question.type === 'multipleChoice' || question.type === 'trueFalse';
  const tapOptions = useMemo(
    () => (question.type === 'trueFalse' ? ['True', 'False'] : question.options),
    [question],
  );
  const suggested = phase === 'result' ? suggestedRating(lastAnswer) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const n = Number(e.key);
      if (phase === 'question' && isTapType && n >= 1 && n <= tapOptions.length) {
        e.preventDefault();
        onSubmit(tapOptions[n - 1]);
      } else if (phase === 'result' && n >= 1 && n <= 4) {
        e.preventDefault();
        onRate(REVIEW_RESULTS[n - 1]);
      } else if (phase === 'result' && e.key === 'Enter' && suggested) {
        e.preventDefault();
        onRate(suggested);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, isTapType, tapOptions, suggested, onSubmit, onRate]);

  /* --- Question phase --- */
  if (phase === 'question') {
    const canSubmit = question.type !== 'fillGap' || input.trim().length > 0;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-3xl border border-(--color-auth-field-border) bg-(--color-surface) p-5 md:gap-4 md:p-8 lg:min-h-[220px] lg:p-10">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-(--color-accent-violet)/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-(--color-accent-violet-text)">
              {t(`writing.grammar.review.sourceType.${card.reviewItem.sourceType}`)}
            </span>
            {isRelearn && (
              <span className="rounded-full bg-(--color-cs-red)/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-(--color-cs-red)">
                {t('writing.grammar.review.relearnBadge')}
              </span>
            )}
            <span className="min-w-0 truncate text-[12px] font-semibold text-(--color-muted-text) md:text-[13px]">
              {card.note.title || t('writing.grammar.review.untitled')}
            </span>
          </div>
          <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-(--color-muted-text)">
            <Icon name={QUIZ_TYPE_ICON[question.type]} className="size-[13px]" />
            {t(`writing.grammar.quiz.type.${question.type}`)}
          </span>
          <p className="text-[18px] leading-snug font-semibold text-(--color-primary-blue-dark) md:text-[22px] lg:text-[26px]">
            {question.questionText}
          </p>
        </div>

        {isTapType ? (
          <div className="grid gap-2 md:gap-3 lg:grid-cols-2">
            {tapOptions.map((option, index) => (
              <button
                key={option}
                type="button"
                onClick={() => onSubmit(option)}
                className="flex items-center gap-3 rounded-2xl border border-(--color-auth-field-border) bg-(--color-surface) px-4 py-3 text-left text-[15px] font-semibold md:px-6 md:py-4 md:text-[17px] text-(--color-primary-blue-dark) transition-colors hover:border-(--color-primary-blue)/35"
              >
                <span className="min-w-0 flex-1">
                  {question.type === 'trueFalse'
                    ? t(`writing.grammar.quiz.play.${option === 'True' ? 'trueLabel' : 'falseLabel'}`)
                    : option}
                </span>
                <Kbd>{String(index + 1)}</Kbd>
              </button>
            ))}
          </div>
        ) : (
          <form
            className="flex flex-col gap-2 md:gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) onSubmit(input);
            }}
          >
            <textarea
              value={input}
              autoFocus
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                /* Enter submits a one-word gap; a written answer needs
                   Ctrl/⌘+Enter so it can still have line breaks. */
                const submits =
                  e.key === 'Enter' &&
                  (question.type === 'fillGap' ? !e.shiftKey : e.ctrlKey || e.metaKey);
                if (submits) {
                  e.preventDefault();
                  if (canSubmit) onSubmit(input);
                }
              }}
              placeholder={
                question.type === 'fillGap'
                  ? t('writing.grammar.quiz.play.typeMissing')
                  : t('writing.grammar.quiz.play.typeAnswer')
              }
              rows={question.type === 'fillGap' ? 1 : 4}
              className={`w-full resize-none rounded-2xl border border-(--color-auth-field-border) bg-(--color-surface) px-4 py-3 text-[15px] font-medium md:px-6 md:py-4 md:text-[18px] text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand) ${
                question.type === 'fillGap' ? '' : 'lg:min-h-[160px]'
              }`}
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-12 w-full rounded-2xl bg-(--color-primary-blue-solid) text-[15px] font-semibold text-white transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50 md:h-14 md:text-[17px]"
            >
              {question.type === 'shortAnswer'
                ? t('writing.grammar.review.showAnswer')
                : t('writing.grammar.quiz.play.submit')}
            </button>
          </form>
        )}
      </div>
    );
  }

  /* --- Result phase (feedback, the note, rating) --- */
  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
      {lastAnswer?.autoGraded ? (
        <div
          role="status"
          className={`rounded-3xl border px-5 py-4 md:px-7 md:py-6 ${
            lastAnswer.correct
              ? 'border-(--color-accent-green)/40 bg-(--color-accent-green)/8'
              : 'border-(--color-cs-red)/40 bg-(--color-cs-red)/8'
          }`}
        >
          <p
            className={`text-[16px] font-bold md:text-[20px] ${
              lastAnswer.correct ? 'text-(--color-accent-green-text)' : 'text-(--color-cs-red)'
            }`}
          >
            {lastAnswer.correct
              ? t('writing.grammar.quiz.play.correct')
              : t('writing.grammar.quiz.play.incorrect')}
          </p>
          {!lastAnswer.correct && (
            <p className="mt-2 text-[15px] font-medium text-(--color-primary-blue-dark) md:text-[17px]">
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
        <div role="status" className="rounded-3xl border border-(--color-auth-field-border) bg-(--color-surface) px-5 py-4 md:px-7 md:py-6">
          <p className="text-[13px] font-bold uppercase tracking-wide text-(--color-muted-text)">
            {t('writing.grammar.review.compareTitle')}
          </p>
          {lastAnswer?.correct && (
            <p className="mt-2 text-[15px] font-bold text-(--color-accent-green-text) md:text-[17px]">
              {t('writing.grammar.review.matches')}
            </p>
          )}
          {lastAnswer && lastAnswer.answer.trim().length > 0 && (
            <p className="mt-2 text-[15px] font-medium text-(--color-primary-blue-dark) md:text-[17px]">
              {t('writing.grammar.quiz.result.yourAnswer', { answer: lastAnswer.answer })}
            </p>
          )}
          <p className="mt-2 text-[15px] font-semibold text-(--color-accent-green-text) md:text-[17px]">
            {t('writing.grammar.review.referenceAnswer', { answer: question.correctAnswer })}
          </p>
          {question.explanation && (
            <p className="mt-1 text-[13px] font-medium text-(--color-text-secondary)">
              {question.explanation}
            </p>
          )}
        </div>
      )}

      {/* The part of the note the question was about — shown only now. */}
      <div className="flex flex-col gap-2 rounded-3xl border border-(--color-surface) bg-(--color-surface)/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)] md:gap-3 md:p-7">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-(--color-muted-text)">
            {t('writing.grammar.review.fromNote')}
          </span>
          {card.sourceBlockType && (
            <span className="rounded-full bg-(--color-goal-bg) px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
              {t(`writing.grammar.block.${card.sourceBlockType}`)}
            </span>
          )}
        </div>
        <h3 className="text-[16px] font-bold text-(--color-primary-blue-dark) md:text-[19px]">
          {card.note.title || t('writing.grammar.review.untitled')}
        </h3>
        <p className="text-[15px] font-medium text-(--color-primary-blue-dark) md:text-[17px]">{card.sourceText}</p>
        {card.sourceSecondaryText && (
          <p className="text-[14px] font-medium text-(--color-text-secondary) md:text-[16px]">
            {card.sourceSecondaryText}
          </p>
        )}
        <button
          type="button"
          onClick={onOpenNote}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline"
        >
          {t('writing.grammar.review.openNote')}
        </button>
      </div>
      </div>

      {/* Rating with this card's real next intervals. */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {REVIEW_RESULTS.map((result, index) => {
          const isSuggested = suggested === result;
          return (
            <button
              key={result}
              type="button"
              onClick={() => onRate(result)}
              aria-describedby={isSuggested ? 'review-suggested' : undefined}
              className="relative flex flex-col items-center gap-1 rounded-2xl border bg-(--color-surface) px-3 py-3 transition-colors hover:bg-(--color-hover-wash) md:py-5"
              style={{
                borderColor: isSuggested ? RESULT_COLOR[result] : 'var(--color-auth-field-border)',
                boxShadow: isSuggested ? `inset 0 0 0 1px ${RESULT_COLOR[result]}` : undefined,
              }}
            >
              <span
                className="flex items-center gap-1.5 text-[14px] font-bold md:text-[17px]"
                style={{ color: RESULT_COLOR[result] }}
              >
                <Icon name={RESULT_ICON[result]} className="size-[15px]" />
                {t(`writing.grammar.review.rating.${result}`)}
              </span>
              <span className="text-[11px] font-semibold text-(--color-muted-text) md:text-[13px]">
                {formatReviewInterval(intervals[result], t)}
              </span>
              {isSuggested && (
                <span
                  id="review-suggested"
                  className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: RESULT_COLOR[result] }}
                >
                  {t('writing.grammar.review.suggested')}
                </span>
              )}
              <span className="absolute top-1.5 right-2">
                <Kbd>{String(index + 1)}</Kbd>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
