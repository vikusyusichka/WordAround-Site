/* Bottom-sheet to create a quiz from a note — web port of
   CreateGrammarQuizSheet (minus the Manual mode, deferred). Smart Local
   generates deterministically from note blocks with a preview step; AI
   Generated calls the worker on submit. The sheet owns the AI request
   lifecycle (AbortController), like EssayAssistanceModal. */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { QUIZ_TYPE_ICON } from '@/lib/grammarMeta';
import { generateLocalQuestions, GrammarQuizGeneratorError } from '@/lib/grammarQuizGenerator';
import { QUIZ_QUESTION_TYPES } from '@/lib/grammarQuizPrompts';
import { generateQuizQuestions } from '@/lib/grammarQuizService';
import { validateQuizQuestions } from '@/lib/grammarQuizValidator';
import type { GrammarNote, GrammarQuizQuestion, GrammarQuizQuestionType } from '@/lib/models';

export type QuizCreationMode = 'smartLocal' | 'aiGenerated';

const COUNTS = [3, 5, 10] as const;
const DEFAULT_TYPES: GrammarQuizQuestionType[] = ['multipleChoice', 'shortAnswer', 'fillGap'];

const MODE_ICON: Record<QuizCreationMode, string> = {
  smartLocal: 'wand.and.stars',
  aiGenerated: 'sparkles',
};

interface CreateQuizSheetProps {
  open: boolean;
  note: GrammarNote;
  isSaving: boolean;
  onSave: (title: string, questions: GrammarQuizQuestion[]) => void;
  onClose: () => void;
}

export const CreateQuizSheet = ({ open, note, isSaving, onSave, onClose }: CreateQuizSheetProps) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<QuizCreationMode>('smartLocal');
  const [count, setCount] = useState<number>(5);
  const [selectedTypes, setSelectedTypes] = useState<GrammarQuizQuestionType[]>(DEFAULT_TYPES);
  const [focus, setFocus] = useState('');
  const [preview, setPreview] = useState<GrammarQuizQuestion[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<'notEnoughContent' | 'noMatchingQuestionTypes' | 'aiFailed' | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Re-seed per open (title from the note; everything else back to defaults). */
  useEffect(() => {
    if (!open) return;
    setTitle(`Quiz: ${note.title}`.trim());
    setMode('smartLocal');
    setCount(5);
    setSelectedTypes(DEFAULT_TYPES);
    setFocus('');
    setPreview(null);
    setError(null);
    setIsGenerating(false);
  }, [open, note.title]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      abortRef.current?.abort();
    };
  }, [open, onClose]);

  const toggleType = (type: GrammarQuizQuestionType) => {
    setPreview(null);
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        /* Always keep at least one type selected (iOS guard). */
        return prev.length > 1 ? prev.filter((tp) => tp !== type) : prev;
      }
      return [...prev, type];
    });
  };

  const runPreview = () => {
    setError(null);
    try {
      const questions = validateQuizQuestions(
        generateLocalQuestions(note.contentBlocks, count, new Set(selectedTypes)),
      );
      setPreview(questions);
    } catch (e) {
      setPreview(null);
      setError(
        e instanceof GrammarQuizGeneratorError ? e.code : 'noMatchingQuestionTypes',
      );
    }
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0 || isSaving || isGenerating) return;

    if (mode === 'smartLocal') {
      if (!preview || preview.length === 0) return;
      onSave(trimmedTitle, preview);
      return;
    }

    setError(null);
    setIsGenerating(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const questions = await generateQuizQuestions(
        note,
        {
          questionCount: count,
          allowedTypes: selectedTypes,
          focusInstructions: focus.trim() || undefined,
        },
        controller.signal,
      );
      onSave(trimmedTitle, questions);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setError('aiFailed');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const canSubmit =
    title.trim().length > 0 &&
    !isSaving &&
    !isGenerating &&
    (mode === 'aiGenerated' || (preview !== null && preview.length > 0));

  const ctaLabel = isGenerating
    ? t('writing.grammar.quiz.sheet.generating')
    : isSaving
      ? t('writing.grammar.quiz.sheet.saving')
      : mode === 'smartLocal'
        ? t('writing.grammar.quiz.sheet.saveQuiz')
        : t('writing.grammar.quiz.sheet.generateQuiz');

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
          aria-labelledby="create-quiz-title"
        >
          <motion.div
            className="flex max-h-[88vh] w-full max-w-[560px] flex-col gap-5 overflow-y-auto rounded-t-3xl bg-(--color-app-bg) p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] md:rounded-3xl md:p-6"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2
                id="create-quiz-title"
                className="text-[19px] font-bold text-(--color-primary-blue-dark) md:text-[22px]"
              >
                {t('writing.grammar.quiz.sheet.title')}
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

            {/* Quiz title */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('writing.grammar.quiz.sheet.titlePlaceholder')}
              className="w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-semibold text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
            />

            {/* Mode */}
            <section className="flex flex-col gap-2.5">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                {t('writing.grammar.quiz.sheet.mode')}
              </h3>
              {(['smartLocal', 'aiGenerated'] as const).map((m) => {
                const selected = m === mode;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setError(null);
                    }}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      selected
                        ? 'border-(--color-primary-blue)/35 bg-(--color-primary-blue)/8'
                        : 'border-(--color-auth-field-border) bg-white'
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid size-[30px] shrink-0 place-items-center rounded-full ${
                        selected
                          ? 'bg-(--color-primary-blue) text-white'
                          : 'bg-(--color-goal-bg) text-(--color-text-secondary)'
                      }`}
                    >
                      <Icon name={selected ? 'checkmark' : MODE_ICON[m]} className="size-[13px]" />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-[15px] font-semibold ${
                          selected ? 'text-(--color-primary-blue-dark)' : 'text-(--color-text-secondary)'
                        }`}
                      >
                        {t(`writing.grammar.quiz.sheet.mode${m === 'smartLocal' ? 'Smart' : 'AI'}`)}
                      </span>
                      <span className="text-[12px] font-medium text-(--color-muted-text) md:text-[13px]">
                        {t(`writing.grammar.quiz.sheet.mode${m === 'smartLocal' ? 'Smart' : 'AI'}Desc`)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </section>

            {/* Question count */}
            <section className="flex flex-col gap-2.5">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                {t('writing.grammar.quiz.sheet.count')}
              </h3>
              <div className="flex gap-2">
                {COUNTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCount(c);
                      setPreview(null);
                    }}
                    className={`h-10 flex-1 rounded-2xl border text-[15px] font-semibold transition-colors ${
                      c === count
                        ? 'border-(--color-primary-blue)/35 bg-(--color-primary-blue)/8 text-(--color-primary-blue-dark)'
                        : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </section>

            {/* Question types */}
            <section className="flex flex-col gap-2.5">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                {t('writing.grammar.quiz.sheet.types')}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {QUIZ_QUESTION_TYPES.map((type) => {
                  const selected = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                        selected
                          ? 'border-(--color-primary-blue)/35 bg-(--color-primary-blue)/8'
                          : 'border-(--color-auth-field-border) bg-white'
                      }`}
                    >
                      <Icon
                        name={QUIZ_TYPE_ICON[type]}
                        className={`size-[16px] shrink-0 ${
                          selected ? 'text-(--color-primary-blue)' : 'text-(--color-text-secondary)'
                        }`}
                      />
                      <span
                        className={`text-[13px] font-semibold ${
                          selected ? 'text-(--color-primary-blue-dark)' : 'text-(--color-text-secondary)'
                        }`}
                      >
                        {t(`writing.grammar.quiz.type.${type}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* AI focus */}
            {mode === 'aiGenerated' && (
              <section className="flex flex-col gap-2.5">
                <h3 className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                  {t('writing.grammar.quiz.sheet.focus')}
                </h3>
                <input
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder={t('writing.grammar.quiz.sheet.focusPlaceholder')}
                  className="w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[14px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
                />
              </section>
            )}

            {/* Smart-local preview */}
            {mode === 'smartLocal' && (
              <section className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={runPreview}
                  className="h-11 rounded-2xl border border-(--color-primary-blue)/35 bg-white text-[14px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/5"
                >
                  {preview
                    ? t('writing.grammar.quiz.sheet.regenerate')
                    : t('writing.grammar.quiz.sheet.preview')}
                </button>
                {preview && (
                  <ol className="flex flex-col gap-2" aria-label={t('writing.grammar.quiz.sheet.previewTitle')}>
                    {preview.map((q, i) => (
                      <li
                        key={q.id}
                        className="rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-2.5"
                      >
                        <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-(--color-muted-text)">
                          <Icon name={QUIZ_TYPE_ICON[q.type]} className="size-[13px]" />
                          {t(`writing.grammar.quiz.type.${q.type}`)}
                        </span>
                        <p className="mt-1 text-[14px] font-medium text-(--color-primary-blue-dark)">
                          {i + 1}. {q.questionText}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}

            {/* Errors */}
            {error && (
              <div className="flex flex-col gap-2">
                <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                  {t(`writing.grammar.quiz.errors.${error}`)}
                </p>
                {error === 'aiFailed' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('smartLocal');
                      setError(null);
                    }}
                    className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline"
                  >
                    {t('writing.grammar.quiz.sheet.useSmartInstead')}
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              {ctaLabel}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
