/* Bottom-sheet modal to pick training mode + difficulty. Selecting a row
   fires the callback (which resets the round in the reducer) and closes.
   Built on the CardEditDialog / SetSelectionModal pattern. Web port of
   WriteWordsSettingsSheet. */
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import {
  DIFFICULTY_ICON,
  WRITE_WORDS_DIFFICULTIES,
  WRITE_WORDS_TRAINING_MODES,
  type WriteWordsDifficulty,
  type WriteWordsTrainingMode,
} from '@/lib/writingTypes';

interface WriteWordsSettingsSheetProps {
  open: boolean;
  trainingMode: WriteWordsTrainingMode;
  difficulty: WriteWordsDifficulty;
  onSelectMode: (mode: WriteWordsTrainingMode) => void;
  onSelectDifficulty: (difficulty: WriteWordsDifficulty) => void;
  onClose: () => void;
}

const MODE_ICON: Record<WriteWordsTrainingMode, string> = {
  wordToTranslation: 'arrow.right',
  translationToWord: 'arrow.left',
};

export const WriteWordsSettingsSheet = ({
  open,
  trainingMode,
  difficulty,
  onSelectMode,
  onSelectDifficulty,
  onClose,
}: WriteWordsSettingsSheetProps) => {
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm md:items-center md:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ww-settings-title"
        >
          <motion.div
            className="flex max-h-[88vh] w-full max-w-[520px] flex-col gap-5 overflow-y-auto rounded-t-3xl bg-(--color-app-bg) p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] md:rounded-3xl md:p-6"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2
                id="ww-settings-title"
                className="text-[19px] font-bold text-(--color-primary-blue-dark) md:text-[22px]"
              >
                {t('writing.writeWords.settings.title')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('writing.writeWords.back')}
                className="grid size-9 place-items-center rounded-full bg-(--color-primary-blue)/6"
              >
                <Icon name="xmark" className="size-[16px] text-(--color-text-secondary)" />
              </button>
            </div>

            {/* Training mode */}
            <section className="flex flex-col gap-2.5">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                {t('writing.writeWords.settings.trainingMode')}
              </h3>
              {WRITE_WORDS_TRAINING_MODES.map((mode) => {
                const selected = mode === trainingMode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      onSelectMode(mode);
                      onClose();
                    }}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      selected
                        ? 'border-(--color-primary-blue)/35 bg-(--color-primary-blue)/8'
                        : 'border-(--color-auth-field-border) bg-white'
                    }`}
                  >
                    <span
                      className={`grid size-[30px] place-items-center rounded-full ${
                        selected ? 'bg-(--color-primary-blue) text-white' : 'bg-(--color-goal-bg) text-(--color-text-secondary)'
                      }`}
                    >
                      <Icon name={selected ? 'checkmark' : MODE_ICON[mode]} className="size-[13px]" />
                    </span>
                    <span
                      className={`text-[15px] font-semibold ${
                        selected ? 'text-(--color-primary-blue-dark)' : 'text-(--color-text-secondary)'
                      }`}
                    >
                      {t(`writing.writeWords.mode.${mode}`)}
                    </span>
                  </button>
                );
              })}
            </section>

            {/* Difficulty */}
            <section className="flex flex-col gap-2.5">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                {t('writing.writeWords.settings.difficulty')}
              </h3>
              {WRITE_WORDS_DIFFICULTIES.map((level) => {
                const selected = level === difficulty;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      onSelectDifficulty(level);
                      onClose();
                    }}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      selected
                        ? 'border-(--color-primary-blue)/35 bg-(--color-primary-blue)/8'
                        : 'border-(--color-auth-field-border) bg-white'
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid size-[30px] shrink-0 place-items-center rounded-full ${
                        selected ? 'bg-(--color-primary-blue) text-white' : 'bg-(--color-goal-bg) text-(--color-text-secondary)'
                      }`}
                    >
                      <Icon name={selected ? 'checkmark' : DIFFICULTY_ICON[level]} className="size-[13px]" />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-[15px] font-semibold ${
                          selected ? 'text-(--color-primary-blue-dark)' : 'text-(--color-text-secondary)'
                        }`}
                      >
                        {t(`writing.writeWords.difficulty.${level}`)}
                      </span>
                      <span className="text-[12px] font-medium text-(--color-muted-text) md:text-[13px]">
                        {t(`writing.writeWords.difficulty.${level}Desc`)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
