/* "Your essay" card — port of iOS EssayInputSectionView: header with a
   word-count capsule, the helper toolbar + hints (passed as children), the
   white editor, a validation line with an info icon, and the action row
   (passed as footer). Controlled — reads text/count/validation from props,
   dispatches SET_ESSAY_TEXT through onChange. */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { EssayValidation, GeneratedEssayTask } from '@/lib/essayTypes';

interface EssayEditorProps {
  task: GeneratedEssayTask;
  text: string;
  wordCount: number;
  validation: EssayValidation;
  onChange: (text: string) => void;
  /** Rendered between the header and the editor (toolbar, hints). */
  children?: ReactNode;
  /** Rendered under the editor (Reset / Check). */
  footer?: ReactNode;
}

/* iOS wordCountTint: blue in range, grey when empty, amber outside it. */
const TINT: Record<EssayValidation, { text: string; bg: string }> = {
  empty: { text: 'text-(--color-text-secondary)', bg: 'bg-(--color-text-secondary)/8' },
  belowMinimum: { text: 'text-[#c78c42]', bg: 'bg-[#c78c42]/8' },
  aboveMaximum: { text: 'text-[#c78c42]', bg: 'bg-[#c78c42]/8' },
  valid: { text: 'text-(--color-primary-blue)', bg: 'bg-(--color-primary-blue)/8' },
};

export const EssayEditor = ({
  task,
  text,
  wordCount,
  validation,
  onChange,
  children,
  footer,
}: EssayEditorProps) => {
  const { t } = useTranslation();
  const tint = TINT[validation];

  let hint: string | null = null;
  if (validation === 'belowMinimum') {
    hint = t('writing.essays.editor.validation.belowMinimum', { min: task.wordLimitMin });
  } else if (validation === 'aboveMaximum') {
    hint = t('writing.essays.editor.validation.aboveMaximum');
  } else if (validation === 'valid') {
    hint = t('writing.essays.editor.validation.valid');
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-(--color-surface)/72 p-[18px] shadow-[0_9px_16px_rgba(0,0,0,0.04)] md:gap-3.5 md:p-[22px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold text-(--color-primary-blue-dark) md:text-[20px]">
          {t('writing.essays.editor.title')}
        </h2>
        <span
          className={`rounded-full px-[11px] py-[7px] text-[12px] font-bold leading-none md:text-[13px] ${tint.text} ${tint.bg}`}
        >
          {t('writing.essays.editor.wordCount', {
            count: wordCount,
            min: task.wordLimitMin,
            max: task.wordLimitMax,
          })}
        </span>
      </div>

      {children}

      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('writing.essays.editor.placeholder')}
        rows={10}
        className="min-h-[220px] w-full resize-y rounded-[20px] border-2 border-transparent bg-(--color-surface)/94 px-4 py-3.5 text-[15px] font-medium leading-relaxed text-(--color-primary-blue-dark) shadow-[0_8px_14px_rgba(0,0,0,0.045)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-(--color-text-secondary)/65 focus-visible:border-(--color-primary-blue)/28 focus-visible:shadow-[0_8px_18px_rgba(0,0,0,0.08)] md:min-h-[260px] md:text-[17px]"
      />

      {hint && (
        <span
          className={`flex items-center gap-2 text-[12px] font-semibold md:text-[13px] ${tint.text}`}
        >
          <Icon name="info.circle.fill" className="size-[13px] shrink-0" />
          {hint}
        </span>
      )}

      {footer}
    </section>
  );
};
