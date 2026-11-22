/* One question while taking a test. Unlike the grammar quiz, nothing is
   marked here — answers are revealed only at the end, as in an exam — so the
   learner can change their mind until they finish. */
import { useTranslation } from 'react-i18next';

import type { CustomQuestion } from '@/lib/customTests/model';

interface AnswerFieldProps {
  question: CustomQuestion;
  number: number;
  value: string;
  onChange: (value: string) => void;
}

const INPUT =
  'w-full rounded-2xl border border-(--color-surface-border) bg-(--color-surface) px-4 py-3 text-[15px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)';

export const AnswerField = ({ question, number, value, onChange }: AnswerFieldProps) => {
  const { t } = useTranslation();
  const labelId = `q-${question.id}`;
  const choices =
    question.type === 'trueFalse'
      ? [
          { value: 'True', label: t('writing.grammar.quiz.play.trueLabel') },
          { value: 'False', label: t('writing.grammar.quiz.play.falseLabel') },
        ]
      : question.type === 'multipleChoice'
        ? question.options.map((o) => ({ value: o, label: o }))
        : null;

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-(--color-surface-border) bg-(--color-surface-card) p-4">
      <p id={labelId} className="text-[16px] font-semibold break-words whitespace-pre-line text-(--color-primary-blue-dark)">
        <span className="mr-1.5 text-(--color-muted-text)">{number}.</span>
        {question.questionText}
      </p>
      {choices ? (
        <div role="radiogroup" aria-labelledby={labelId} className="flex flex-col gap-2">
          {choices.map((choice) => {
            const selected = value === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(selected ? '' : choice.value)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-left text-[15px] font-semibold text-(--color-primary-blue-dark) transition-colors focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none ${
                  selected
                    ? 'border-(--color-primary-blue) bg-(--color-primary-blue)/10'
                    : 'border-(--color-surface-border) bg-(--color-surface) hover:border-(--color-primary-blue)/40'
                }`}
              >
                <span
                  aria-hidden
                  className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                    selected ? 'border-(--color-primary-blue)' : 'border-(--color-surface-border)'
                  }`}
                >
                  {selected && <span className="size-2.5 rounded-full bg-(--color-primary-blue)" />}
                </span>
                {choice.label}
              </button>
            );
          })}
        </div>
      ) : question.type === 'shortAnswer' ? (
        <textarea
          aria-labelledby={labelId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('writing.grammar.quiz.play.typeAnswer')}
          rows={2}
          className={`${INPUT} resize-y`}
        />
      ) : (
        <input
          aria-labelledby={labelId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('writing.grammar.quiz.play.typeMissing')}
          className={INPUT}
        />
      )}
    </div>
  );
};
