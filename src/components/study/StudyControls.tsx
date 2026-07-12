/* Known / Unknown / Flip controls for the study card. Keyboard: ← unknown,
   → known, Space flips. */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowsClockwise, Check, X } from '@phosphor-icons/react';

interface StudyControlsProps {
  onKnown: () => void;
  onUnknown: () => void;
  onFlip: () => void;
}

export const StudyControls = ({ onKnown, onUnknown, onFlip }: StudyControlsProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onKnown();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onUnknown();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        onFlip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKnown, onUnknown, onFlip]);

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={onUnknown}
        className="flex h-14 flex-1 max-w-[220px] items-center justify-center gap-2 rounded-2xl border border-(--color-cs-border-red) bg-(--color-cs-soft-red) text-[16px] font-bold text-(--color-cs-red) transition-transform hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none"
      >
        <X size={20} weight="bold" />
        {t('study.unknown')}
      </button>

      <button
        type="button"
        onClick={onFlip}
        aria-label={t('study.flip')}
        className="grid size-12 place-items-center rounded-2xl border border-(--color-auth-field-border) bg-white text-(--color-cs-text-muted) transition-transform hover:-translate-y-0.5 focus-visible:outline-none"
      >
        <ArrowsClockwise size={20} weight="bold" />
      </button>

      <button
        type="button"
        onClick={onKnown}
        className="flex h-14 flex-1 max-w-[220px] items-center justify-center gap-2 rounded-2xl border border-(--color-green-accent)/30 bg-(--color-green-soft-bg) text-[16px] font-bold text-(--color-green-title) transition-transform hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none"
      >
        <Check size={20} weight="bold" />
        {t('study.known')}
      </button>
    </div>
  );
};
