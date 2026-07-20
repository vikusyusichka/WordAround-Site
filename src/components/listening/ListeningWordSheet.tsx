/* Word-translation bottom sheet — web port of
   ImportVideoWordTranslationSheet: translate the tapped word (MyMemory via
   essayAssistance), show the context sentence, then add it to a flashcard
   set (pick an existing set or create a new one). */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { translate } from '@/lib/essayAssistance';
import { ESSAY_LANGUAGES, findLanguage } from '@/lib/essayTypes';
import {
  addCardToSet,
  cardFromListening,
  createSetWithCard,
  fetchSets,
} from '@/lib/listeningSetSaving';
import { SET_COLOR_HEX, SET_COLOR_IDS } from '@/lib/setColors';
import type { FlashcardSet } from '@/lib/models';

type SheetMode = 'translation' | 'setPicker' | 'createSet';

interface ListeningWordSheetProps {
  open: boolean;
  word: string;
  contextSentence: string | null;
  sourceLanguageId: string;
  videoTitle: string;
  uid: string;
  email: string;
  onClose: () => void;
}

export const ListeningWordSheet = ({
  open,
  word,
  contextSentence,
  sourceLanguageId,
  videoTitle,
  uid,
  email,
  onClose,
}: ListeningWordSheetProps) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<SheetMode>('translation');
  const [targetId, setTargetId] = useState(() =>
    sourceLanguageId === 'english' ? 'ukrainian' : 'english',
  );
  const [translation, setTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(false);
  const [sets, setSets] = useState<FlashcardSet[] | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState(SET_COLOR_HEX.green);
  const [isSaving, setIsSaving] = useState(false);
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runTranslate = async (target: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsTranslating(true);
    setError(false);
    setTranslation(null);
    try {
      const result = await translate(
        word,
        findLanguage(sourceLanguageId),
        findLanguage(target),
        controller.signal,
      );
      setTranslation(result);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setError(true);
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setMode('translation');
    setSavedTo(null);
    void runTranslate(targetId);
    return () => abortRef.current?.abort();
  }, [open, word]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const openSetPicker = async () => {
    setMode('setPicker');
    if (sets === null) {
      const loaded = await fetchSets(uid).catch(() => []);
      setSets(loaded);
    }
  };

  const saveToSet = async (setId: string) => {
    if (!translation || isSaving) return;
    setIsSaving(true);
    try {
      const card = cardFromListening(
        { originalText: word, translatedText: translation, contextSentence: contextSentence ?? undefined },
        videoTitle,
      );
      await addCardToSet(uid, sets ?? [], setId, card);
      const target = (sets ?? []).find((s) => s.id === setId);
      setSavedTo(target?.title ?? '');
      setMode('translation');
    } catch {
      setError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const createAndSave = async () => {
    if (!translation || newTitle.trim().length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      const card = cardFromListening(
        { originalText: word, translatedText: translation, contextSentence: contextSentence ?? undefined },
        videoTitle,
      );
      const set = await createSetWithCard({
        uid,
        email,
        title: newTitle,
        description: newDescription,
        colorHex: newColor,
        firstCard: card,
      });
      setSets((prev) => (prev ? [set, ...prev] : [set]));
      setSavedTo(set.title);
      setMode('translation');
    } catch {
      setError(true);
    } finally {
      setIsSaving(false);
    }
  };

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
        >
          <motion.div
            className="flex max-h-[88vh] w-full max-w-[520px] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-(--color-app-bg) p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] md:rounded-3xl md:p-6"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[19px] font-bold text-(--color-primary-blue-dark)">
                {mode === 'setPicker'
                  ? t('listening.wordSheet.pickSet')
                  : mode === 'createSet'
                    ? t('listening.wordSheet.createSet')
                    : t('listening.wordSheet.title')}
              </h2>
              <button
                type="button"
                onClick={mode === 'translation' ? onClose : () => setMode('translation')}
                aria-label={t('reading.session.closeTranslation')}
                className="grid size-9 place-items-center rounded-full bg-(--color-primary-blue)/6"
              >
                <Icon name="xmark" className="size-[16px] text-(--color-text-secondary)" />
              </button>
            </div>

            {mode === 'translation' && (
              <>
                <span className="text-[26px] font-extrabold text-(--color-primary-blue-dark)">
                  {word}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ESSAY_LANGUAGES.filter((l) => l.id !== sourceLanguageId).map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => {
                        setTargetId(lang.id);
                        void runTranslate(lang.id);
                      }}
                      className={`h-8 rounded-full border px-3 text-[12px] font-semibold ${
                        targetId === lang.id
                          ? 'border-[#29A89E]/50 bg-[#29A89E]/12 text-(--color-primary-blue-dark)'
                          : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
                      }`}
                    >
                      {lang.shortTitle}
                    </button>
                  ))}
                </div>
                {isTranslating ? (
                  <p className="text-[14px] font-medium text-(--color-text-secondary)">
                    {t('reading.session.translating')}
                  </p>
                ) : error ? (
                  <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                    {t('reading.session.translationError')}
                  </p>
                ) : translation ? (
                  <p className="text-[20px] font-bold text-[#14736E]">{translation}</p>
                ) : null}
                {contextSentence && (
                  <p className="rounded-2xl bg-(--color-goal-bg) px-3 py-2 text-[13px] font-medium text-(--color-text-secondary)">
                    {contextSentence}
                  </p>
                )}
                {savedTo !== null && (
                  <p className="text-[13px] font-semibold text-[#15803D]">
                    {t('listening.wordSheet.saved', { set: savedTo })}
                  </p>
                )}
                <button
                  type="button"
                  disabled={!translation || isSaving}
                  onClick={() => void openSetPicker()}
                  className="h-11 w-full rounded-2xl bg-[#29A89E] text-[14px] font-semibold text-white disabled:opacity-50"
                >
                  {t('listening.wordSheet.addToSet')}
                </button>
              </>
            )}

            {mode === 'setPicker' && (
              <>
                {sets === null ? (
                  <p className="text-[14px] font-medium text-(--color-text-secondary)">
                    {t('reading.loading')}
                  </p>
                ) : sets.length === 0 ? (
                  <p className="text-[14px] font-medium text-(--color-text-secondary)">
                    {t('listening.wordSheet.noSets')}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sets.map((set) => (
                      <button
                        key={set.id}
                        type="button"
                        disabled={isSaving}
                        onClick={() => void saveToSet(set.id)}
                        className="flex items-center gap-3 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-left disabled:opacity-60"
                      >
                        <span
                          className="size-4 shrink-0 rounded-full"
                          style={{ background: set.colorHex }}
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-[14px] font-bold text-(--color-primary-blue-dark)">
                            {set.title}
                          </span>
                          <span className="text-[12px] font-medium text-(--color-text-secondary)">
                            {t('sets.cardCount', { count: set.cards.length })}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setMode('createSet')}
                  className="h-11 w-full rounded-2xl border border-[#29A89E]/50 bg-white text-[14px] font-semibold text-[#14736E]"
                >
                  + {t('listening.wordSheet.createSet')}
                </button>
              </>
            )}

            {mode === 'createSet' && (
              <>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t('listening.wordSheet.setNamePlaceholder')}
                  className="w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-semibold text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
                />
                <input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t('folders.descriptionPlaceholder')}
                  className="w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[14px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
                />
                <div className="flex flex-wrap gap-2">
                  {SET_COLOR_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-label={id}
                      onClick={() => setNewColor(SET_COLOR_HEX[id])}
                      className={`size-8 rounded-full border-2 ${
                        newColor === SET_COLOR_HEX[id]
                          ? 'border-(--color-primary-blue-dark)'
                          : 'border-transparent'
                      }`}
                      style={{ background: SET_COLOR_HEX[id] }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={newTitle.trim().length === 0 || isSaving}
                  onClick={() => void createAndSave()}
                  className="h-11 w-full rounded-2xl bg-[#29A89E] text-[14px] font-semibold text-white disabled:opacity-50"
                >
                  {isSaving ? t('folders.saving') : t('listening.wordSheet.createAndAdd')}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
