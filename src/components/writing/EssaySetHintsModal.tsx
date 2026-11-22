/* "Choose words" dialog — port of iOS EssaySetHintsSelectionView. Opens
   after a set is picked in SetSelectionModal and lists its cards; each row
   toggles the word in or out of the essay's word list. A badge counts the
   picks and Done closes. */
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { EssaySetHint } from '@/lib/essaySession';
import type { FlashcardSet } from '@/lib/models';

interface EssaySetHintsModalProps {
  set: FlashcardSet | null;
  selected: EssaySetHint[];
  onToggle: (hint: EssaySetHint) => void;
  onBack: () => void;
  onDone: () => void;
}

const hintFromCard = (card: FlashcardSet['cards'][number]): EssaySetHint => ({
  id: card.id,
  word: card.word,
  translation: card.translation,
  example: card.example?.trim() || undefined,
});

export const EssaySetHintsModal = ({
  set,
  selected,
  onToggle,
  onBack,
  onDone,
}: EssaySetHintsModalProps) => {
  const { t } = useTranslation();
  const open = set !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDone]);

  return (
    <AnimatePresence>
      {set && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm md:items-center md:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDone}
          role="dialog"
          aria-modal="true"
          aria-labelledby="set-hints-title"
        >
          <motion.div
            className="flex max-h-[85vh] w-full max-w-[720px] flex-col gap-4 rounded-t-3xl bg-(--color-app-bg) p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] md:rounded-3xl md:p-6"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-2.5">
              <div className="relative flex w-full items-center justify-center">
                <button
                  type="button"
                  onClick={onBack}
                  aria-label={t('writing.essays.setHints.back')}
                  className="absolute left-0 grid size-[42px] place-items-center rounded-full bg-(--color-surface)/86 shadow-[0_4px_8px_rgba(0,0,0,0.06)] md:size-[46px]"
                >
                  <Icon name="chevron.left" className="size-[16px] text-(--color-primary-blue-dark)" />
                </button>
                <h2
                  id="set-hints-title"
                  className="max-w-[60%] truncate text-[20px] font-bold text-(--color-primary-blue-dark) md:text-[24px]"
                >
                  {set.title}
                </h2>
                <button
                  type="button"
                  onClick={onDone}
                  className="absolute right-0 rounded-full bg-(--color-primary-blue-solid) px-4 py-2 text-[14px] font-bold text-white md:text-[15px]"
                >
                  {t('writing.essays.setHints.done')}
                </button>
              </div>
              <span className="rounded-full bg-(--color-primary-blue)/8 px-3 py-1.5 text-[12px] font-bold text-(--color-primary-blue) md:text-[13px]">
                {t('writing.essays.helper.selected', { n: selected.length })}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {set.cards.length === 0 ? (
                <div className="flex flex-col gap-2.5 rounded-3xl bg-(--color-surface)/92 p-6">
                  <span className="text-[20px] font-bold text-(--color-primary-blue-dark)">
                    {t('writing.essays.setHints.emptyTitle')}
                  </span>
                  <span className="text-[15px] font-medium text-(--color-text-secondary)">
                    {t('writing.essays.setHints.emptySubtitle')}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {set.cards.map((card) => {
                    const isSelected = selected.some((h) => h.id === card.id);
                    const example = card.example?.trim();
                    return (
                      <button
                        key={card.id}
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        onClick={() => onToggle(hintFromCard(card))}
                        className={`flex w-full items-center gap-3 rounded-[20px] border bg-(--color-surface) px-4 py-3 text-left shadow-[0_4px_10px_rgba(0,0,0,0.04)] transition-colors md:px-5 md:py-3.5 ${
                          isSelected ? 'border-(--color-primary-blue)/30' : 'border-transparent hover:border-(--color-primary-blue)/12'
                        }`}
                      >
                        {card.imageURL && (
                          <img
                            src={card.imageURL}
                            alt=""
                            className="size-12 shrink-0 rounded-xl object-cover"
                          />
                        )}
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="truncate text-[16px] font-bold text-(--color-primary-blue-dark) md:text-[17px]">
                            {card.word}
                          </span>
                          <span className="truncate text-[14px] font-semibold text-(--color-primary-blue)">
                            {card.translation}
                          </span>
                          {example && (
                            <span className="truncate text-[13px] font-medium text-(--color-text-secondary)">
                              {example}
                            </span>
                          )}
                        </span>
                        <Icon
                          name={isSelected ? 'checkmark.circle.fill' : 'circle'}
                          className={`size-[22px] shrink-0 ${
                            isSelected ? 'text-(--color-primary-blue)' : 'text-(--color-text-secondary)/45'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
