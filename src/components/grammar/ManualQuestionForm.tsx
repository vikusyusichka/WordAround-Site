/* Write one quiz question by hand — the form half of
   AddManualQuizQuestionSheet; the validation rules live in
   lib/grammarQuizManual. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { QUIZ_TYPE_ICON } from '@/lib/grammarMeta';
import { QUIZ_QUESTION_TYPES } from '@/lib/grammarQuizPrompts';
import {
  EMPTY_MANUAL_DRAFT,
  manualDraftToQuestion,
  validateManualQuestion,
  type ManualQuestionDraft,
} from '@/lib/grammarQuizManual';
import type { GrammarQuizQuestion } from '@/lib/models';

interface ManualQuestionFormProps {
  order: number;
  onAdd: (question: GrammarQuizQuestion) => void;
}

export const ManualQuestionForm = ({ order, onAdd }: ManualQuestionFormProps) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ManualQuestionDraft>(EMPTY_MANUAL_DRAFT);
  const [showError, setShowError] = useState(false);

  const error = validateManualQuestion(draft);
  const field =
    'w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-2.5 text-[14px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)';

  const patch = (values: Partial<ManualQuestionDraft>) =>
    setDraft((prev) => ({ ...prev, ...values }));

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-(--color-auth-field-border) bg-white/70 p-3.5">
      <div className="grid grid-cols-2 gap-2">
        {QUIZ_QUESTION_TYPES.map((type) => {
          const selected = type === draft.type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => patch({ type, correctAnswer: type === 'trueFalse' ? 'True' : '' })}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-colors ${
                selected
                  ? 'border-(--color-primary-blue)/35 bg-(--color-primary-blue)/8'
                  : 'border-(--color-auth-field-border) bg-white'
              }`}
            >
              <Icon
                name={QUIZ_TYPE_ICON[type]}
                className={`size-[15px] shrink-0 ${selected ? 'text-(--color-primary-blue)' : 'text-(--color-text-secondary)'}`}
              />
              <span
                className={`text-[13px] font-semibold ${selected ? 'text-(--color-primary-blue-dark)' : 'text-(--color-text-secondary)'}`}
              >
                {t(`writing.grammar.quiz.type.${type}`)}
              </span>
            </button>
          );
        })}
      </div>

      <textarea
        value={draft.questionText}
        onChange={(e) => patch({ questionText: e.target.value })}
        rows={2}
        placeholder={t(
          draft.type === 'fillGap'
            ? 'writing.grammar.quiz.manual.questionGapPlaceholder'
            : 'writing.grammar.quiz.manual.questionPlaceholder',
        )}
        className={`${field} resize-y`}
      />

      {draft.type === 'multipleChoice' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {draft.options.map((option, i) => (
            <input
              key={i}
              value={option}
              onChange={(e) =>
                patch({ options: draft.options.map((o, idx) => (idx === i ? e.target.value : o)) })
              }
              placeholder={t('writing.grammar.quiz.manual.optionPlaceholder', { index: i + 1 })}
              className={field}
            />
          ))}
        </div>
      )}

      {draft.type === 'trueFalse' ? (
        <div className="flex gap-2">
          {['True', 'False'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => patch({ correctAnswer: value })}
              className={`h-10 flex-1 rounded-2xl border text-[14px] font-semibold transition-colors ${
                (draft.correctAnswer || 'True') === value
                  ? 'border-(--color-primary-blue)/35 bg-(--color-primary-blue)/8 text-(--color-primary-blue-dark)'
                  : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
              }`}
            >
              {t(value === 'True' ? 'writing.grammar.quiz.play.trueLabel' : 'writing.grammar.quiz.play.falseLabel')}
            </button>
          ))}
        </div>
      ) : (
        <input
          value={draft.correctAnswer}
          onChange={(e) => patch({ correctAnswer: e.target.value })}
          placeholder={t('writing.grammar.quiz.manual.answerPlaceholder')}
          className={field}
        />
      )}

      <input
        value={draft.explanation}
        onChange={(e) => patch({ explanation: e.target.value })}
        placeholder={t('writing.grammar.quiz.manual.explanationPlaceholder')}
        className={field}
      />

      {showError && error && (
        <p role="alert" className="text-[13px] font-semibold text-(--color-cs-red)">
          {t(`writing.grammar.quiz.manual.error.${error}`)}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          if (error) {
            setShowError(true);
            return;
          }
          onAdd(manualDraftToQuestion(draft, order));
          setDraft(EMPTY_MANUAL_DRAFT);
          setShowError(false);
        }}
        className="h-10 w-fit rounded-2xl bg-(--color-primary-blue) px-4 text-[14px] font-semibold text-white transition-transform active:scale-[0.98] focus-visible:outline-none"
      >
        {t('writing.grammar.quiz.manual.add')}
      </button>
    </div>
  );
};
