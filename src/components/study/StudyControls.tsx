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
    <div className="flex items-center justify-center gap-2.5">
      {/* Soft rounded pills matching the card's aesthetic — no hard borders. */}
      <button
        type="button"
        onClick={onUnknown}
        className="flex h-[54px] flex-1 max-w-[220px] items-center justify-center gap-2 rounded-full bg-(--color-cs-soft-red) text-[15px] font-bold text-(--color-cs-red) shadow-[0_4px_10px_rgba(255,87,89,0.14)] transition-transform hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none"
      >
        <span className="grid size-6 place-items-center rounded-full bg-(--color-cs-red)/12">
          <X size={14} weight="bold" />
        </span>
        {t('study.unknown')}
      </button>

      <button
        type="button"
        onClick={onFlip}
        aria-label={t('study.flip')}
        className="grid size-[54px] shrink-0 place-items-center rounded-full bg-white text-(--color-cs-text-muted) shadow-[0_4px_10px_rgba(0,0,0,0.06)] transition-transform hover:-translate-y-0.5 active:scale-[0.96] focus-visible:outline-none"
      >
        <ArrowsClockwise size={20} weight="bold" />
      </button>

      <button
        type="button"
        onClick={onKnown}
        className="flex h-[54px] flex-1 max-w-[220px] items-center justify-center gap-2 rounded-full bg-(--color-green-soft-bg) text-[15px] font-bold text-(--color-green-title) shadow-[0_4px_10px_rgba(41,186,102,0.14)] transition-transform hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none"
      >
        <span className="grid size-6 place-items-center rounded-full bg-(--color-green-accent)/15">
          <Check size={14} weight="bold" />
        </span>
        {t('study.known')}
      </button>
    </div>
  );
};
