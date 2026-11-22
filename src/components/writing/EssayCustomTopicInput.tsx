/* "My topic" mode — port of CustomEssayTopicInputView + the
   customTopicGenerationButton under it: a translucent card with a
   "Your topic" header and a white text field, followed by a full-width
   "Generate essay task" button. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';

interface EssayCustomTopicInputProps {
  value: string;
  onChange: (text: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const EssayCustomTopicInput = ({
  value,
  onChange,
  onGenerate,
  isGenerating,
}: EssayCustomTopicInputProps) => {
  const { t } = useTranslation();
  const canGenerate = value.trim().length > 0 && !isGenerating;

  return (
    <>
      <div className="flex flex-col gap-2.5 rounded-3xl bg-(--color-surface)/70 p-[18px] shadow-[0_8px_14px_rgba(0,0,0,0.035)] md:gap-3 md:p-[22px]">
        <div className="flex items-center gap-2">
          <Icon name="pencil.line" className="size-[14px] text-(--color-primary-blue) md:size-[16px]" />
          <span className="text-[16px] font-bold text-(--color-primary-blue-dark) md:text-[18px]">
            {t('writing.essays.custom.title')}
          </span>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('writing.essays.custom.placeholder')}
          rows={2}
          className="min-h-[76px] w-full resize-y rounded-[18px] border border-(--color-primary-blue)/8 bg-(--color-surface)/92 p-3.5 text-[14px] font-semibold text-(--color-primary-blue-dark) outline-none placeholder:font-medium placeholder:text-(--color-text-secondary)/65 focus-visible:border-(--color-primary-blue)/28 md:min-h-[92px] md:p-4 md:text-[16px]"
        />
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-(--color-primary-blue-solid) py-[13px] text-[14px] font-bold text-white transition-[filter,transform] hover:brightness-105 active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--color-home-brand) md:py-3.5 md:text-[15px]"
      >
        <Icon
          name={isGenerating ? 'arrow.triangle.2.circlepath' : 'sparkles'}
          className={`size-[14px] ${isGenerating ? 'animate-spin' : ''}`}
        />
        {isGenerating ? t('writing.essays.generating') : t('writing.essays.custom.generate')}
      </button>
    </>
  );
};
