/* Inline "My topic" seed input — textarea (2-4 lines) + a primary "Generate
   task" button. Web port of CustomEssayTopicInputView. */
import { useTranslation } from 'react-i18next';

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
    <div className="flex flex-col gap-3 rounded-2xl border border-white bg-white/95 p-4 shadow-[0_4px_10px_rgba(0,0,0,0.045)] md:p-5">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('writing.essays.custom.placeholder')}
        rows={2}
        className="min-h-[64px] w-full resize-y rounded-xl border border-(--color-auth-field-border) bg-white px-3.5 py-2.5 text-[15px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-5 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none"
        >
          {isGenerating ? t('writing.essays.generating') : t('writing.essays.custom.generate')}
        </button>
      </div>
    </div>
  );
};
