/* Quick-mistake bottom sheet — web port of QuickGrammarMistakeSheet: original
   sentence (required) + correction (required) + optional explanation, saved
   into the auto-provisioned Common Mistakes topic. */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { MistakeSaveState } from '@/hooks/useSaveMistake';

interface QuickMistakeSheetProps {
  open: boolean;
  saveState: MistakeSaveState;
  onSave: (values: { original: string; corrected: string; explanation: string }) => void;
  onOpenMistakesTopic: () => void;
  onClose: () => void;
}

export const QuickMistakeSheet = ({
  open,
  saveState,
  onSave,
  onOpenMistakesTopic,
  onClose,
}: QuickMistakeSheetProps) => {
  const { t } = useTranslation();
  const [original, setOriginal] = useState('');
  const [corrected, setCorrected] = useState('');
  const [explanation, setExplanation] = useState('');
  const [validation, setValidation] = useState<'original' | 'corrected' | null>(null);

  useEffect(() => {
    if (!open) return;
    setOriginal('');
    setCorrected('');
    setExplanation('');
    setValidation(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSave = () => {
    if (original.trim().length === 0) {
      setValidation('original');
      return;
    }
    if (corrected.trim().length === 0) {
      setValidation('corrected');
      return;
    }
    setValidation(null);
    onSave({ original: original.trim(), corrected: corrected.trim(), explanation: explanation.trim() });
  };

  const isBusy = saveState === 'saving';
  const isDone = saveState === 'saved' || saveState === 'duplicate';

  const fieldClass =
    'w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand) disabled:opacity-70';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm md:items-center md:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-mistake-title"
        >
          <motion.div
            className="flex max-h-[88vh] w-full max-w-[520px] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-(--color-app-bg) p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] md:rounded-3xl md:p-6"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2
                id="quick-mistake-title"
                className="text-[19px] font-bold text-(--color-primary-blue-dark) md:text-[22px]"
              >
                {t('writing.grammar.quickMistake.title')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('writing.grammar.form.cancel')}
                className="grid size-9 place-items-center rounded-full bg-(--color-primary-blue)/6"
              >
                <Icon name="xmark" className="size-[16px] text-(--color-text-secondary)" />
              </button>
            </div>

            {/* Original */}
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-(--color-cs-red)">
                <Icon name="exclamationmark.circle.fill" className="size-[14px]" />
                {t('writing.grammar.quickMistake.original')}
              </span>
              <input
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
                placeholder={t('writing.grammar.quickMistake.originalPlaceholder')}
                disabled={isBusy || isDone}
                className={fieldClass}
              />
            </label>

            {/* Correction */}
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-[#15803D]">
                <Icon name="checkmark.circle.fill" className="size-[14px]" />
                {t('writing.grammar.quickMistake.corrected')}
              </span>
              <input
                value={corrected}
                onChange={(e) => setCorrected(e.target.value)}
                placeholder={t('writing.grammar.quickMistake.correctedPlaceholder')}
                disabled={isBusy || isDone}
                className={fieldClass}
              />
            </label>

            {/* Explanation */}
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                <Icon name="lightbulb.fill" className="size-[14px]" />
                {t('writing.grammar.quickMistake.explanation')}
              </span>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder={t('writing.grammar.quickMistake.explanationPlaceholder')}
                rows={2}
                disabled={isBusy || isDone}
                className={`${fieldClass} resize-none`}
              />
            </label>

            {validation && (
              <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                {t(`writing.grammar.quickMistake.validation.${validation}`)}
              </p>
            )}
            {saveState === 'failed' && (
              <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                {t('writing.grammar.quickMistake.failed')}
              </p>
            )}
            {isDone && (
              <div className="flex flex-col gap-1.5 rounded-2xl border border-[#22C55E]/40 bg-[#22C55E]/8 px-4 py-3">
                <p className="text-[14px] font-bold text-[#15803D]">
                  {t(`writing.grammar.quickMistake.${saveState}`)}
                </p>
                <button
                  type="button"
                  onClick={onOpenMistakesTopic}
                  className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline"
                >
                  {t('writing.grammar.quickMistake.openTopic')}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={isDone ? onClose : handleSave}
              disabled={isBusy}
              className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
            >
              {isBusy
                ? t('writing.grammar.quickMistake.saving')
                : isDone
                  ? t('writing.grammar.quickMistake.done')
                  : t('writing.grammar.quickMistake.save')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
