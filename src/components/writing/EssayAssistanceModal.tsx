/* Shared translate / synonym modal. Manages its own request lifecycle
   (source language, input, loading, results, error) + AbortController; calls
   the essayAssistance service directly and reports a successful use via
   onRecord so the reducer can bump the usage counter + re-score.
   Built on the CardEditDialog / SetSelectionModal pattern. */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { EssayAssistanceResultList } from './EssayAssistanceResultList';
import { Icon } from '@/components/primitives/Icon';
import * as essayAssistance from '@/lib/essayAssistance';
import type { AssistanceError } from '@/lib/essayAssistance';
import {
  ESSAY_LANGUAGES,
  type EssayAssistanceItem,
  type GrammarLanguage,
} from '@/lib/essayTypes';

export type AssistanceModalType = 'translate' | 'synonym';

interface EssayAssistanceModalProps {
  open: boolean;
  type: AssistanceModalType;
  targetLanguage: GrammarLanguage;
  remaining: number;
  onRecord: () => void;
  onClose: () => void;
}

const firstSourceFor = (target: GrammarLanguage): GrammarLanguage =>
  ESSAY_LANGUAGES.find((l) => l.id !== target.id) ?? ESSAY_LANGUAGES[0];

const messageForError = (e: unknown, t: (k: string) => string): string => {
  const code = (e as AssistanceError)?.code;
  if (code === 'assist/same-language') return t('writing.essays.assist.sameLanguage');
  if (code === 'assist/no-result' || code === 'assist/empty') return t('writing.essays.assist.noResult');
  return t('writing.essays.assist.error');
};

export const EssayAssistanceModal = ({
  open,
  type,
  targetLanguage,
  remaining,
  onRecord,
  onClose,
}: EssayAssistanceModalProps) => {
  const { t } = useTranslation();
  const [sourceLanguage, setSourceLanguage] = useState<GrammarLanguage>(() =>
    firstSourceFor(targetLanguage),
  );
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<EssayAssistanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  /* Reset transient state each time the modal opens (fresh session). */
  useEffect(() => {
    if (open) {
      setInputText('');
      setResults([]);
      setError(null);
      setPickerOpen(false);
      setSourceLanguage(firstSourceFor(targetLanguage));
    }
  }, [open, targetLanguage]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const canSubmit = inputText.trim().length > 0 && remaining > 0 && !isLoading;

  const submit = async () => {
    if (!canSubmit) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setResults([]);
    try {
      if (type === 'translate') {
        const translated = await essayAssistance.translate(
          inputText, sourceLanguage, targetLanguage, controller.signal,
        );
        if (controllerRef.current !== controller) return;
        setResults([{ id: crypto.randomUUID(), word: inputText.trim(), result: translated, detail: null }]);
      } else {
        const items = await essayAssistance.findSynonyms(
          inputText, sourceLanguage, targetLanguage, controller.signal,
        );
        if (controllerRef.current !== controller) return;
        setResults(items);
      }
      onRecord();
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(messageForError(e, t));
    } finally {
      if (controllerRef.current === controller) setIsLoading(false);
    }
  };

  const title = type === 'translate' ? t('writing.essays.translate.title') : t('writing.essays.synonym.title');
  const placeholder =
    type === 'translate' ? t('writing.essays.translate.placeholder') : t('writing.essays.synonym.placeholder');
  const submitLabel = isLoading
    ? type === 'translate' ? t('writing.essays.translate.submitting') : t('writing.essays.synonym.submitting')
    : type === 'translate' ? t('writing.essays.translate.submit') : t('writing.essays.synonym.submit');
  const icon = type === 'translate' ? 'character.book.closed.fill' : 'textformat.abc.dottedunderline';

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
          aria-labelledby="assist-title"
        >
          <motion.div
            className="flex max-h-[88vh] w-full max-w-[560px] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-(--color-app-bg) p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] md:rounded-3xl md:p-6"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-(--color-primary-blue)/10">
                <Icon name={icon} className="size-[22px] text-(--color-primary-blue)" />
              </div>
              <div className="flex flex-1 flex-col">
                <h2 id="assist-title" className="text-[19px] font-bold text-(--color-primary-blue-dark) md:text-[22px]">
                  {title}
                </h2>
                <span className="text-[13px] font-semibold text-(--color-text-secondary)">
                  {t('writing.essays.helper.remaining', { remaining })}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('writing.essays.assist.close')}
                className="grid size-9 place-items-center rounded-full bg-(--color-primary-blue)/6"
              >
                <Icon name="xmark" className="size-[16px] text-(--color-text-secondary)" />
              </button>
            </div>

            {/* Language picker: From (menu) → To (fixed = essay language) */}
            <div className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setPickerOpen((v) => !v)}
                  aria-expanded={pickerOpen}
                  aria-haspopup="listbox"
                  className="flex w-full items-center justify-between rounded-2xl bg-(--color-primary-blue)/5 px-3.5 py-2.5 text-left"
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                      {t('writing.essays.assist.from')}
                    </span>
                    <span className="text-[14px] font-bold text-(--color-primary-blue-dark)">
                      {sourceLanguage.title}
                    </span>
                  </div>
                  <Icon name={pickerOpen ? 'chevron.down' : 'chevron.right'} className="size-[16px] text-(--color-text-secondary)" />
                </button>
                {pickerOpen && (
                  <div
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-10 mt-1 flex max-h-[220px] flex-col gap-1 overflow-y-auto rounded-2xl border border-white bg-white p-2 shadow-[0_10px_24px_rgba(0,0,0,0.12)]"
                  >
                    {ESSAY_LANGUAGES.filter((l) => l.id !== targetLanguage.id).map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        role="option"
                        aria-selected={lang.id === sourceLanguage.id}
                        onClick={() => {
                          setSourceLanguage(lang);
                          setPickerOpen(false);
                        }}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[14px] font-semibold text-(--color-primary-blue-dark) hover:bg-(--color-goal-bg) ${
                          lang.id === sourceLanguage.id ? 'bg-(--color-goal-bg)' : ''
                        }`}
                      >
                        <span className="grid size-7 place-items-center rounded-full bg-(--color-goal-bg) text-[11px] font-bold">
                          {lang.shortTitle}
                        </span>
                        {lang.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid place-items-center px-1">
                <Icon name="arrow.right" className="size-[18px] text-(--color-text-secondary)" />
              </div>

              <div className="flex flex-1 flex-col justify-center rounded-2xl bg-(--color-primary-blue)/5 px-3.5 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                  {t('writing.essays.assist.to')}
                </span>
                <span className="text-[14px] font-bold text-(--color-primary-blue-dark)">
                  {targetLanguage.title}
                </span>
              </div>
            </div>

            {/* Input */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={placeholder}
              rows={2}
              autoFocus
              className="min-h-[56px] w-full resize-y rounded-2xl border border-(--color-auth-field-border) bg-white px-3.5 py-2.5 text-[15px] font-semibold text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
            />

            {/* Result / loading / error */}
            {isLoading && (
              <p className="rounded-2xl bg-(--color-primary-blue)/6 px-4 py-3 text-[14px] font-semibold text-(--color-text-secondary)">
                {submitLabel}
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-2xl bg-(--color-cs-soft-red) px-4 py-3 text-[14px] font-semibold text-(--color-cs-dark-red)">
                {error}
              </p>
            )}
            {!isLoading && !error && <EssayAssistanceResultList items={results} />}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 rounded-2xl bg-(--color-primary-blue)/8 text-[15px] font-bold text-(--color-primary-blue) focus-visible:outline-none"
              >
                {t('writing.essays.assist.close')}
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!canSubmit}
                className="h-11 flex-1 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-bold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none"
              >
                {submitLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
