/* One saved quiz in the note's quiz list: title + meta pills + delete +
   Start button. Web port of GrammarNoteQuizListView.quizCard. */
import { useTranslation } from 'react-i18next';
import { Trash } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import type { GrammarNoteQuiz } from '@/lib/models';

interface QuizCardProps {
  quiz: GrammarNoteQuiz;
  onStart: () => void;
  onDelete: () => void;
}

export const QuizCard = ({ quiz, onStart, onDelete }: QuizCardProps) => {
  const { t } = useTranslation();
  return (
    <div className="group relative flex flex-col gap-3 rounded-2xl border border-white bg-white/95 p-4 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-(--color-primary-blue)/10">
          <Icon
            name="questionmark.circle.fill"
            className="size-[18px] text-(--color-primary-blue)"
          />
        </span>
        <div className="flex min-w-0 flex-col gap-1 pr-6">
          <span className="truncate text-[16px] font-bold text-(--color-primary-blue-dark)">
            {quiz.title}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-(--color-goal-bg) px-2 py-0.5 text-[11px] font-bold text-(--color-text-secondary)">
              {t('writing.grammar.quiz.questionsCount', { count: quiz.questions.length })}
            </span>
            <span className="rounded-full bg-(--color-goal-bg) px-2 py-0.5 text-[11px] font-bold text-(--color-text-secondary)">
              {t('writing.grammar.updated', {
                date: new Date(quiz.updatedAt).toLocaleDateString(),
              })}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={quiz.questions.length === 0}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[14px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
      >
        <Icon name="play.fill" className="size-[14px]" />
        {t('writing.grammar.quiz.start')}
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label={t('writing.grammar.quiz.delete')}
        className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-(--color-cs-text-muted) opacity-0 transition-opacity hover:bg-black/[0.04] hover:text-(--color-cs-red) focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash size={16} weight="bold" />
      </button>
    </div>
  );
};
