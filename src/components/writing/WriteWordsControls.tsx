/* Three-button row under the WriteWords answer input: Hint, Skip, Check. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';

interface WriteWordsControlsProps {
  isHintAvailable: boolean;
  canSubmit: boolean;
  onHint: () => void;
  onSkip: () => void;
  onSubmit: () => void;
}

export const WriteWordsControls = ({
  isHintAvailable,
  canSubmit,
  onHint,
  onSkip,
  onSubmit,
}: WriteWordsControlsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={onHint}
        disabled={!isHintAvailable}
        className="flex h-12 items-center gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-cs-text-muted) transition-transform hover:-translate-y-0.5 disabled:opacity-60 focus-visible:outline-none"
      >
        <Icon name="lightbulb" className="size-[18px]" />
        {t('writing.writeWords.hint')}
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="flex h-12 items-center gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-cs-text-muted) transition-transform hover:-translate-y-0.5 focus-visible:outline-none"
      >
        <Icon name="arrow.right" className="size-[18px]" />
        {t('writing.writeWords.skip')}
      </button>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="flex h-12 items-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-6 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none"
      >
        <Icon name="checkmark" className="size-[18px]" />
        {t('writing.writeWords.submit')}
      </button>
    </div>
  );
};
