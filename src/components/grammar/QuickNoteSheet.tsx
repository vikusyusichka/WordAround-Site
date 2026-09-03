/* Quick-note sheet — web port of QuickGrammarNoteSheet: a title, the useful
   part as one paragraph, a note type, the destination topic, and the
   "open editor after saving" switch (persisted in Notes settings, like iOS
   @AppStorage). */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { NOTE_TYPE_META, NOTE_TYPES } from '@/lib/grammarMeta';
import type { QuickNoteDraft } from '@/lib/grammarQuickNoteService';
import type { GrammarNoteTopic } from '@/lib/models';
import { useGrammarSettings } from '@/stores/grammarSettingsStore';

interface QuickNoteSheetProps {
  open: boolean;
  topics: GrammarNoteTopic[];
  /** Fixed destination (topic screen); omit to show the topic picker. */
  lockedTopicId?: string;
  isSaving: boolean;
  error?: string | null;
  onSave: (draft: QuickNoteDraft, topic: GrammarNoteTopic, openEditor: boolean) => void;
  onClose: () => void;
}

export const QuickNoteSheet = ({
  open,
  topics,
  lockedTopicId,
  isSaving,
  error,
  onSave,
  onClose,
}: QuickNoteSheetProps) => {
  const { t } = useTranslation();
  const defaultNoteType = useGrammarSettings((s) => s.defaultNoteType);
  const opensEditorAfterQuickSave = useGrammarSettings((s) => s.opensEditorAfterQuickSave);
  const showsHelperTips = useGrammarSettings((s) => s.showsHelperTips);
  const setSetting = useGrammarSettings((s) => s.set);

  const selectableTopics = topics.filter((tp) => !tp.isMistakesTopic);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [noteType, setNoteType] = useState(defaultNoteType);
  const [topicId, setTopicId] = useState(lockedTopicId ?? selectableTopics[0]?.id ?? '');
  const [validation, setValidation] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setText('');
    setNoteType(defaultNoteType);
    setTopicId(lockedTopicId ?? selectableTopics[0]?.id ?? '');
    setValidation(false);
    /* Re-seeding only on open is the point — deps intentionally minimal. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lockedTopicId, defaultNoteType]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const topic = topics.find((tp) => tp.id === topicId);

  const handleSave = () => {
    if (title.trim().length === 0 && text.trim().length === 0) {
      setValidation(true);
      return;
    }
    if (!topic) {
      setValidation(true);
      return;
    }
    setValidation(false);
    onSave({ title, text, noteType }, topic, opensEditorAfterQuickSave);
  };

  const fieldClass =
    'w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand) disabled:opacity-70';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm md:items-center md:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t('writing.grammar.quickNote.title')}
        >
          <motion.div
            className="flex max-h-[90vh] w-full max-w-[520px] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-(--color-app-bg) p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] md:rounded-3xl md:p-6"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-[19px] font-bold text-(--color-primary-blue-dark) md:text-[22px]">
                {t('writing.grammar.quickNote.title')}
              </h2>
              <p className="text-[13px] font-semibold text-(--color-text-secondary)">
                {t('writing.grammar.quickNote.subtitle')}
              </p>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-(--color-text-secondary)">
                {t('writing.grammar.quickNote.noteTitle')}
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('writing.grammar.quickNote.titlePlaceholder')}
                disabled={isSaving}
                className={fieldClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-(--color-text-secondary)">
                {t('writing.grammar.quickNote.text')}
              </span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('writing.grammar.quickNote.textPlaceholder')}
                rows={4}
                disabled={isSaving}
                className={`${fieldClass} resize-y`}
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-(--color-text-secondary)">
                {t('writing.grammar.quickNote.noteType')}
              </span>
              <div className="flex flex-wrap gap-2">
                {NOTE_TYPES.map((type) => {
                  const meta = NOTE_TYPE_META[type];
                  const isActive = type === noteType;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNoteType(type)}
                      aria-pressed={isActive}
                      className="flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition-colors focus-visible:outline-none"
                      style={{
                        background: isActive ? `${meta.color}1C` : 'white',
                        borderColor: isActive ? meta.color : 'var(--color-auth-field-border)',
                        color: isActive ? meta.color : 'var(--color-text-secondary)',
                      }}
                    >
                      <Icon name={meta.icon} className="size-[13px]" />
                      {t(`writing.grammar.noteType.${type}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {!lockedTopicId && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-bold text-(--color-text-secondary)">
                  {t('writing.grammar.quickNote.topic')}
                </span>
                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  disabled={isSaving}
                  className={fieldClass}
                >
                  {selectableTopics.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.title}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex items-center gap-3 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={opensEditorAfterQuickSave}
                onChange={(e) => setSetting('opensEditorAfterQuickSave', e.target.checked)}
                className="size-4 accent-(--color-primary-blue)"
              />
              <span className="flex flex-col">
                <span className="text-[14px] font-bold text-(--color-primary-blue-dark)">
                  {t('writing.grammar.quickNote.openEditor')}
                </span>
                <span className="text-[11px] font-semibold text-(--color-text-secondary)">
                  {t('writing.grammar.quickNote.openEditorHint')}
                </span>
              </span>
            </label>

            {showsHelperTips && (
              <p className="rounded-2xl bg-(--color-goal-bg) px-4 py-3 text-[12px] font-semibold text-(--color-text-secondary)">
                {t('writing.grammar.quickNote.tip')}
              </p>
            )}

            {(validation || error) && (
              <p role="alert" className="text-[13px] font-semibold text-(--color-cs-red)">
                {error ?? t('writing.grammar.quickNote.validation')}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-text-secondary) transition-colors hover:bg-black/[0.03] focus-visible:outline-none"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || selectableTopics.length === 0}
                className="h-11 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-5 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-70 focus-visible:outline-none"
              >
                {isSaving
                  ? t('writing.grammar.quickNote.saving')
                  : t('writing.grammar.quickNote.save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
