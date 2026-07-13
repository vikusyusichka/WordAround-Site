/* Controls row under the WriteWords answer input. Hint + Skip are shown only
   when the current difficulty allows them (hard hides both); medium shows a
   "N skips left" caption. Check is always present. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';

interface WriteWordsControlsProps {
  showHint: boolean;
  isHintAvailable: boolean;
  showSkip: boolean;
  canSkip: boolean;
  /** Medium-only "N skips left" caption; null hides it. */
  skipsRemainingText: string | null;
  canSubmit: boolean;
  onHint: () => void;
  onSkip: () => void;
  onSubmit: () => void;
}

export const WriteWordsControls = ({
  showHint,
  isHintAvailable,
  showSkip,
  canSkip,
  skipsRemainingText,
  canSubmit,
  onHint,
  onSkip,
  onSubmit,
}: WriteWordsControlsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {showHint && (
          <button
            type="button"
            onClick={onHint}
            disabled={!isHintAvailable}
            className="flex h-12 items-center gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-cs-text-muted) transition-transform hover:-translate-y-0.5 disabled:opacity-60 focus-visible:outline-none"
          >
            <Icon name="lightbulb" className="size-[18px]" />
            {t('writing.writeWords.hint')}
          </button>
        )}

        {showSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={!canSkip}
            className="flex h-12 items-center gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-cs-text-muted) transition-transform hover:-translate-y-0.5 disabled:opacity-60 focus-visible:outline-none"
          >
            <Icon name="arrow.right" className="size-[18px]" />
            {t('writing.writeWords.skip')}
          </button>
        )}

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

      {skipsRemainingText && (
        <span className="text-[12px] font-medium text-(--color-text-secondary) md:text-[13px]">
          {skipsRemainingText}
        </span>
      )}
    </div>
  );
};
