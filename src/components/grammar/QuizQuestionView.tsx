/* One quiz question — web port of GrammarNoteQuizView's question card +
   answer area. MC/TF submit on tap; fillGap/shortAnswer via input + Submit.
   Post-submit shows feedback + Next/Finish. Keyed by question id in the
   parent so local input state resets per question. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { QUIZ_TYPE_ICON } from '@/lib/grammarMeta';
import { isAnswerCorrect } from '@/lib/grammarQuizSession';
import type { GrammarQuizQuestion } from '@/lib/models';

interface QuizQuestionViewProps {
  question: GrammarQuizQuestion;
  isLast: boolean;
  onSubmit: (answer: string) => void;
  onAdvance: () => void;
}

export const QuizQuestionView = ({ question, isLast, onSubmit, onAdvance }: QuizQuestionViewProps) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);

  const submit = (answer: string) => {
    if (submitted !== null) return;
    setSubmitted(answer);
    onSubmit(answer);
  };

  const correct = submitted !== null && isAnswerCorrect(question, submitted);
  const isTapType = question.type === 'multipleChoice' || question.type === 'trueFalse';
  const tapOptions =
    question.type === 'trueFalse' ? ['True', 'False'] : question.options;

  return (
    <div className="flex flex-col gap-4">
      {/* Question card */}
      <div className="rounded-3xl border border-(--color-auth-field-border) bg-white p-5">
        <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-(--color-muted-text)">
          <Icon name={QUIZ_TYPE_ICON[question.type]} className="size-[13px]" />
          {t(`writing.grammar.quiz.type.${question.type}`)}
        </span>
        <p className="mt-2 text-[17px] font-semibold text-(--color-primary-blue-dark) md:text-[18px]">
          {question.questionText}
        </p>
      </div>

      {/* Answer area */}
      {isTapType ? (
        <div className="flex flex-col gap-2">
          {tapOptions.map((option) => {
            const isSelected = submitted === option;
            const isCorrectOption =
              submitted !== null &&
              option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
            const stateClasses =
              submitted === null
                ? 'border-(--color-auth-field-border) bg-white hover:border-(--color-primary-blue)/35'
                : isCorrectOption
                  ? 'border-(--color-cs-green,#22C55E) bg-[#22C55E]/8'
                  : isSelected
                    ? 'border-(--color-cs-red) bg-(--color-cs-red)/8'
                    : 'border-(--color-auth-field-border) bg-white opacity-60';
            return (
              <button
                key={option}
                type="button"
                onClick={() => submit(option)}
                disabled={submitted !== null}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-[15px] font-semibold text-(--color-primary-blue-dark) transition-colors ${stateClasses}`}
              >
                <span>
                  {question.type === 'trueFalse'
                    ? t(`writing.grammar.quiz.play.${option === 'True' ? 'trueLabel' : 'falseLabel'}`)
                    : option}
                </span>
                {submitted !== null && isCorrectOption && (
                  <Icon name="checkmark" className="size-[16px] text-[#22C55E]" />
                )}
                {submitted !== null && isSelected && !isCorrectOption && (
                  <Icon name="xmark" className="size-[16px] text-(--color-cs-red)" />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {question.type === 'shortAnswer' ? (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('writing.grammar.quiz.play.typeAnswer')}
              rows={3}
              disabled={submitted !== null}
              className="w-full resize-none rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand) disabled:opacity-70"
            />
          ) : (
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim().length > 0) submit(input);
              }}
              placeholder={t('writing.grammar.quiz.play.typeMissing')}
              disabled={submitted !== null}
              autoFocus
              className="w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand) disabled:opacity-70"
            />
          )}
          {submitted === null && (
            <button
              type="button"
              onClick={() => submit(input)}
              disabled={input.trim().length === 0}
              className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              {t('writing.grammar.quiz.play.submit')}
            </button>
          )}
        </div>
      )}

      {/* Feedback + advance */}
      {submitted !== null && (
        <div className="flex flex-col gap-3">
          <div
            role="status"
            className={`rounded-2xl border px-4 py-3 ${
              correct
                ? 'border-[#22C55E]/40 bg-[#22C55E]/8'
                : 'border-(--color-cs-red)/40 bg-(--color-cs-red)/8'
            }`}
          >
            <p
              className={`text-[15px] font-bold ${
                correct ? 'text-[#15803D]' : 'text-(--color-cs-red)'
              }`}
            >
              {correct
                ? t('writing.grammar.quiz.play.correct')
                : t('writing.grammar.quiz.play.incorrect')}
            </p>
            {!correct && (
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
          <button
            type="button"
            onClick={onAdvance}
            className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
          >
            {isLast
              ? t('writing.grammar.quiz.play.finish')
              : t('writing.grammar.quiz.play.next')}
          </button>
        </div>
      )}
    </div>
  );
};
