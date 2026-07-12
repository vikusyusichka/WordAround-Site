/* Modal to add or edit a card's text (word / translation / example). Image
   editing is create-only (wizard) for now. */
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import type { Flashcard } from '@/lib/models';

interface CardEditDialogProps {
  /** null = add a new card. */
  card: Flashcard | null;
  open: boolean;
  onSave: (card: Flashcard) => void;
  onClose: () => void;
}

export const CardEditDialog = ({ card, open, onSave, onClose }: CardEditDialogProps) => {
  const { t } = useTranslation();
  const [word, setWord] = useState(card?.word ?? '');
  const [translation, setTranslation] = useState(card?.translation ?? '');
  const [example, setExample] = useState(card?.example ?? '');

  const canSave = word.trim().length > 0 && translation.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: card?.id ?? crypto.randomUUID(),
      word: word.trim(),
      translation: translation.trim(),
      example: example.trim(),
      imageURL: card?.imageURL,
    });
  };

  const field =
    'h-11 rounded-xl border border-(--color-auth-field-border) bg-white px-3.5 text-[15px] font-medium text-(--color-cs-dark-text) outline-none focus-visible:border-(--color-home-brand)';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex w-full max-w-md flex-col gap-4 rounded-3xl bg-(--color-app-bg) p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[18px] font-bold text-(--color-cs-dark-text)">
              {card ? t('study.editCard') : t('study.addCard')}
            </h2>
            <input value={word} onChange={(e) => setWord(e.target.value)} placeholder={t('createSet.word')} autoFocus className={field} />
            <input value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder={t('createSet.translation')} className={field} />
            <input value={example} onChange={(e) => setExample(e.target.value)} placeholder={t('createSet.example')} className={field} />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="h-11 flex-1 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none"
              >
                {t('study.save')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-cs-text-muted) focus-visible:outline-none"
              >
                {t('study.cancel')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
