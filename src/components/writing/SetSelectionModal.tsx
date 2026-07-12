/* Modal to pick a flashcard set for a writing exercise. Ports
   WritingSetSelectionView (SwiftUI half-sheet) to a web-native centered
   dialog: AnimatePresence + backdrop, click-outside/Esc closes. Filters out
   sets with 0 cards (mirrors WritingSetSelectionViewModel). Modelled on
   CardEditDialog.tsx (src/components/study/CardEditDialog.tsx). */
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { SetSelectionCard } from './SetSelectionCard';
import { Icon } from '@/components/primitives/Icon';
import { useSetsQuery } from '@/hooks/useSets';
import type { FlashcardSet } from '@/lib/models';
import { mapSetToPreview } from '@/lib/setPreview';

interface SetSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (set: FlashcardSet) => void;
}

export const SetSelectionModal = ({ open, onClose, onSelect }: SetSelectionModalProps) => {
  const { t } = useTranslation();
  const { data: sets, isLoading } = useSetsQuery();

  /* Esc to close, matches native dialog behavior. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const eligibleSets = (sets ?? []).filter((s) => s.cards.length > 0);

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
          aria-labelledby="set-selection-title"
        >
          <motion.div
            className="flex max-h-[85vh] w-full max-w-[720px] flex-col gap-4 rounded-t-3xl bg-(--color-app-bg) p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] md:rounded-3xl md:p-6"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center justify-center">
              <button
                type="button"
                onClick={onClose}
                aria-label={t('writing.setSelection.close')}
                className="absolute left-0 grid size-[46px] place-items-center rounded-full bg-white shadow-[0_4px_8px_rgba(0,0,0,0.06)] md:size-[52px]"
              >
                <Icon name="xmark" className="size-[18px] text-(--color-primary-blue-dark) md:size-[20px]" />
              </button>
              <h2
                id="set-selection-title"
                className="text-[20px] font-bold text-(--color-primary-blue-dark) md:text-[24px]"
              >
                {t('writing.setSelection.title')}
              </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {isLoading ? (
                <p className="py-8 text-center text-[15px] font-medium text-(--color-text-secondary)">
                  {t('writing.writeWords.loading')}
                </p>
              ) : eligibleSets.length === 0 ? (
                <div className="flex flex-col gap-2.5 rounded-3xl bg-white/95 p-6 text-left shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
                  <span className="text-[20px] font-bold text-(--color-primary-blue-dark)">
                    {t('writing.setSelection.empty.title')}
                  </span>
                  <span className="text-[15px] font-medium text-(--color-text-secondary)">
                    {t('writing.setSelection.empty.subtitle')}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 md:gap-3.5">
                  {eligibleSets.map((set) => (
                    <SetSelectionCard
                      key={set.id}
                      preview={mapSetToPreview(
                        set,
                        t('sets.cardCount', { count: set.cards.length }),
                      )}
                      wordsCountLabel={t('writing.setSelection.wordsCount', {
                        count: set.cards.length,
                      })}
                      onClick={() => {
                        onSelect(set);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
