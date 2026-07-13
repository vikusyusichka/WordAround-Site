/* Textarea + word count + validation. Controlled — reads text/count/validation
   from props, dispatches SET_ESSAY_TEXT through onChange. */
import { useTranslation } from 'react-i18next';

import type { EssayValidation, GeneratedEssayTask } from '@/lib/essayTypes';

interface EssayEditorProps {
  task: GeneratedEssayTask;
  text: string;
  wordCount: number;
  validation: EssayValidation;
  onChange: (text: string) => void;
  onReset: () => void;
}

const VALIDATION_COLOR: Record<EssayValidation, string> = {
  empty: 'text-(--color-text-secondary)',
  belowMinimum: 'text-(--color-cs-red)',
  aboveMaximum: 'text-(--color-cs-red)',
  valid: 'text-(--color-home-stat2-sub)', // green
};

export const EssayEditor = ({
  task,
  text,
  wordCount,
  validation,
  onChange,
  onReset,
}: EssayEditorProps) => {
  const { t } = useTranslation();

  let hint: string | null = null;
  if (validation === 'belowMinimum') {
    hint = t('writing.essays.editor.validation.belowMinimum', { min: task.wordLimitMin });
  } else if (validation === 'aboveMaximum') {
    hint = t('writing.essays.editor.validation.aboveMaximum');
  } else if (validation === 'valid') {
    hint = t('writing.essays.editor.validation.valid');
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('writing.essays.editor.placeholder')}
        rows={10}
        className="min-h-[220px] w-full resize-y rounded-2xl border border-white bg-white/95 px-4 py-3.5 text-[15px] leading-relaxed font-medium text-(--color-primary-blue-dark) shadow-[0_4px_10px_rgba(0,0,0,0.045)] outline-none focus-visible:border-(--color-home-brand) md:min-h-[280px] md:px-5 md:py-4 md:text-[16px]"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span
            className={`text-[13px] font-semibold md:text-[14px] ${VALIDATION_COLOR[validation]}`}
          >
            {t('writing.essays.editor.wordCount', {
              count: wordCount,
              min: task.wordLimitMin,
              max: task.wordLimitMax,
            })}
          </span>
          {hint && (
            <span className={`text-[12px] font-medium md:text-[13px] ${VALIDATION_COLOR[validation]}`}>
              {hint}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={wordCount === 0}
          className="h-10 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[14px] font-semibold text-(--color-cs-text-muted) transition-transform hover:-translate-y-0.5 disabled:opacity-60 focus-visible:outline-none md:h-11 md:px-5 md:text-[15px]"
        >
          {t('writing.essays.editor.reset')}
        </button>
      </div>
    </div>
  );
};
