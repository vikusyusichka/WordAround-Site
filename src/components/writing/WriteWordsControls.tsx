/* Controls under the WriteWords answer input — port of the button stack in
   WriteWordsExerciseCardView.

   iOS shapes this as one full-width primary with the two helpers on a row of
   their own beneath it. The web had all three as equal pills in a single row,
   which made Check look like a third option rather than the thing you press
   after every word. The label follows iOS too: the button advances the
   exercise, so it says Next, not Check.

   Hint and Skip are shown only when the difficulty allows them (hard hides
   both); medium adds an "N skips left" caption. */
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

const secondary =
  'flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-(--color-auth-field-border) bg-(--color-surface) px-4 text-[14px] font-bold text-(--color-text-secondary) transition-transform hover:-translate-y-0.5 disabled:opacity-[0.58] disabled:hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none';

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
    <div className="flex flex-col gap-3">
      {/* iOS runs primaryBlue → #7363ff across this button. The solid brand
          blue rather than the plain one, because white sits on it. */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="h-14 w-full rounded-2xl bg-linear-to-r from-(--color-primary-blue-solid) to-(--color-primary-gradient-end) text-[16px] font-bold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.99] disabled:opacity-[0.58] disabled:hover:brightness-100 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {t('writing.writeWords.next')}
      </button>

      {(showHint || showSkip) && (
        <div className="flex items-center gap-3">
          {showHint && (
            <button type="button" onClick={onHint} disabled={!isHintAvailable} className={secondary}>
              <Icon name="lightbulb" className="size-[18px]" />
              {t('writing.writeWords.hint')}
            </button>
          )}

          {showSkip && (
            <button type="button" onClick={onSkip} disabled={!canSkip} className={secondary}>
              <Icon name="arrow.right" className="size-[18px]" />
              {t('writing.writeWords.skip')}
            </button>
          )}
        </div>
      )}

      {skipsRemainingText && (
        <span className="text-center text-[12px] font-medium text-(--color-text-secondary) md:text-[13px]">
          {skipsRemainingText}
        </span>
      )}
    </div>
  );
};
