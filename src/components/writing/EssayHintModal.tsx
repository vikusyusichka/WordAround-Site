/* "Writing hint" dialog — iOS opens the assistance modal in its .hint mode
   when Hint is tapped: it shows "Generating hint..." and then the hint
   (category + text), or the error. Nothing to type; the only action is to
   close it. The hint also stays in the "Your essay" card afterwards. */
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { EssayGeneratedHint } from '@/lib/essayTypes';

interface EssayHintModalProps {
  open: boolean;
  isLoading: boolean;
  hint: EssayGeneratedHint | null;
  error: string | null;
  remaining: number;
  onClose: () => void;
}

export const EssayHintModal = ({
  open,
  isLoading,
  hint,
  error,
  remaining,
  onClose,
}: EssayHintModalProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-0 backdrop-blur-sm md:items-center md:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="hint-title"
        >
          <motion.div
            className="flex w-full max-w-[520px] flex-col gap-4 rounded-t-3xl bg-(--color-app-bg) p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] md:rounded-[28px] md:p-6"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="grid size-[42px] place-items-center rounded-[15px] bg-(--color-primary-blue)/10 md:size-12">
                <Icon name="lightbulb.fill" className="size-[18px] text-(--color-primary-blue) md:size-[20px]" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <h2 id="hint-title" className="text-[19px] font-bold text-(--color-primary-blue-dark) md:text-[22px]">
                  {t('writing.essays.hint.modalTitle')}
                </h2>
                <span className="text-[11px] font-semibold text-(--color-text-secondary) md:text-[12px]">
                  {t('writing.essays.helper.remaining', { remaining })}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('writing.essays.assist.close')}
                className="grid size-8 place-items-center rounded-full bg-(--color-primary-blue)/6 md:size-9"
              >
                <Icon name="xmark" className="size-[13px] text-(--color-text-secondary)" />
              </button>
            </div>

            {isLoading ? (
              <p
                aria-busy="true"
                className="flex items-center gap-2.5 rounded-2xl bg-(--color-primary-blue)/6 px-4 py-3.5 text-[14px] font-semibold text-(--color-text-secondary)"
              >
                <Icon name="arrow.triangle.2.circlepath" className="size-[15px] animate-spin text-(--color-primary-blue)" />
                {t('writing.essays.hint.generating')}
              </p>
            ) : error ? (
              <p role="alert" className="rounded-2xl bg-(--color-cs-soft-red) px-4 py-3.5 text-[14px] font-semibold text-(--color-cs-dark-red)">
                {error}
              </p>
            ) : hint ? (
              <div className="flex flex-col gap-2 rounded-2xl bg-(--color-surface) p-3.5 md:p-4">
                <span className="w-fit rounded-full bg-(--color-primary-blue)/8 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-(--color-primary-blue) md:text-[12px]">
                  {t(`writing.essays.hint.category.${hint.category}`)}
                </span>
                <p className="text-[15px] font-semibold leading-relaxed text-(--color-primary-blue-dark) md:text-[16px]">
                  {hint.text}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-2xl bg-(--color-primary-blue-solid) text-[15px] font-bold text-white transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--color-home-brand)"
            >
              {t('writing.essays.hint.gotIt')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
