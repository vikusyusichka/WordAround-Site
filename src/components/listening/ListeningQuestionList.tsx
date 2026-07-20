/* Question list with A/B/C options and post-check ✓/✕ marks — shared by all
   listening session screens. */
import { useTranslation } from 'react-i18next';

import type { ListeningQuestion } from '@/lib/listeningTypes';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface ListeningQuestionListProps {
  questions: ListeningQuestion[];
  selectedAnswers: Record<string, number>;
  hasChecked: boolean;
  accentColor: string;
  onSelect: (questionId: string, optionIndex: number) => void;
}

export const ListeningQuestionList = ({
  questions,
  selectedAnswers,
  hasChecked,
  accentColor,
  onSelect,
}: ListeningQuestionListProps) => {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[16px] font-bold text-(--color-primary-blue-dark)">
        {t('listening.session.questionsTitle')}
      </h3>
      {questions.map((q, qi) => {
        const selected = selectedAnswers[q.id];
        return (
          <div
            key={q.id}
            className="flex flex-col gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white p-4"
          >
            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: accentColor }}>
              {t(`listening.questionType.${q.type}`)} · {qi + 1}/{questions.length}
            </span>
            <p className="text-[15px] font-semibold text-(--color-primary-blue-dark)">{q.prompt}</p>
            <div className="flex flex-col gap-1.5">
              {q.options.map((option, oi) => {
                const isSelected = selected === oi;
                const isCorrect = hasChecked && oi === q.correctIndex;
                const isWrong = hasChecked && isSelected && oi !== q.correctIndex;
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={hasChecked}
                    onClick={() => onSelect(q.id, oi)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[14px] font-medium transition-colors disabled:cursor-default ${
                      isCorrect
                        ? 'border-[#22C55E]/50 bg-[#22C55E]/8 text-[#15803D]'
                        : isWrong
                          ? 'border-(--color-cs-red)/50 bg-(--color-cs-red)/8 text-(--color-cs-red)'
                          : isSelected
                            ? 'bg-black/[0.02] text-(--color-primary-blue-dark)'
                            : 'border-(--color-auth-field-border) bg-white text-(--color-primary-blue-dark)'
                    }`}
                    style={
                      isSelected && !hasChecked
                        ? { borderColor: `${accentColor}80`, background: `${accentColor}14` }
                        : undefined
                    }
                  >
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold"
                      style={
                        isSelected || isCorrect
                          ? { background: accentColor, color: '#fff' }
                          : { background: 'var(--color-goal-bg)', color: 'var(--color-text-secondary)' }
                      }
                    >
                      {OPTION_LETTERS[Math.min(oi, 5)]}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
};
