/* One question at a time — web port of ReadingQuestionSectionView: type
   label, prompt, optional explanation hint, options labeled A–F. */
import { useTranslation } from 'react-i18next';

import type { ReadingQuestion } from '@/lib/readingQuestionService';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface ReadingQuestionSectionProps {
  question: ReadingQuestion;
  index: number;
  total: number;
  selectedAnswer: string | undefined;
  showHints: boolean;
  onSelect: (answer: string) => void;
}

export const ReadingQuestionSection = ({
  question,
  index,
  total,
  selectedAnswer,
  showHints,
  onSelect,
}: ReadingQuestionSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl border border-(--color-auth-field-border) bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#21A8BD]">
            {t(`reading.questionType.${question.type}`)}
          </span>
          <span className="text-[12px] font-semibold text-(--color-muted-text)">
            {t('reading.session.questionOf', { current: index + 1, total })}
          </span>
        </div>
        <p className="mt-2 whitespace-pre-line text-[16px] font-semibold text-(--color-primary-blue-dark) md:text-[17px]">
          {question.prompt}
        </p>
        {showHints && question.explanation && selectedAnswer !== undefined && (
          <p className="mt-2 text-[13px] font-medium text-(--color-text-secondary)">
            {question.explanation}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {question.options.map((option, i) => {
          const selected = selectedAnswer === option;
          return (
            <button
              key={`${i}-${option.slice(0, 20)}`}
              type="button"
              onClick={() => onSelect(option)}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                selected
                  ? 'border-[#21A8BD]/50 bg-[#21A8BD]/8'
                  : 'border-(--color-auth-field-border) bg-white hover:border-[#21A8BD]/30'
              }`}
            >
              <span
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                  selected ? 'bg-[#21A8BD] text-white' : 'bg-(--color-goal-bg) text-(--color-text-secondary)'
                }`}
              >
                {OPTION_LETTERS[Math.min(i, 5)]}
              </span>
              <span className="whitespace-pre-line text-[14px] font-medium text-(--color-primary-blue-dark)">
                {option}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
