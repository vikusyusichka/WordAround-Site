/* Template library — web port of GrammarTemplateLibraryView +
   GrammarTemplatePreviewView, merged into one bottom-sheet: search +
   language/difficulty pills + template cards; clicking a card expands an
   inline preview (included notes / included blocks) with a Use button. */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { NOTE_TYPE_META } from '@/lib/grammarMeta';
import {
  filterNoteTemplates,
  filterTopicTemplates,
  TEMPLATE_DIFFICULTIES,
  TEMPLATE_LANGUAGES,
  type GrammarNoteTemplate,
  type GrammarTopicTemplate,
} from '@/lib/grammarTemplates';

interface TemplateLibraryModalProps {
  open: boolean;
  kind: 'topic' | 'note';
  isBusy?: boolean;
  onUseTopic?: (tpl: GrammarTopicTemplate) => void;
  onUseNote?: (tpl: GrammarNoteTemplate) => void;
  onClose: () => void;
}

const pillClass = (selected: boolean) =>
  `h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    selected
      ? 'border-(--color-primary-blue)/35 bg-(--color-primary-blue)/8 text-(--color-primary-blue-dark)'
      : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
  }`;

export const TemplateLibraryModal = ({
  open,
  kind,
  isBusy,
  onUseTopic,
  onUseNote,
  onClose,
}: TemplateLibraryModalProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setLanguage('');
    setDifficulty('');
    setExpandedId(null);
  }, [open, kind]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filter = {
    languageCode: language || undefined,
    difficulty: difficulty || undefined,
    query: query || undefined,
  };
  const topics = kind === 'topic' ? filterTopicTemplates(filter) : [];
  const notes = kind === 'note' ? filterNoteTemplates(filter) : [];
  const isEmpty = kind === 'topic' ? topics.length === 0 : notes.length === 0;

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
          aria-labelledby="template-library-title"
        >
          <motion.div
            className="flex max-h-[88vh] w-full max-w-[600px] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-(--color-app-bg) p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] md:rounded-3xl md:p-6"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2
                id="template-library-title"
                className="text-[19px] font-bold text-(--color-primary-blue-dark) md:text-[22px]"
              >
                {t(`writing.grammar.templates.${kind === 'topic' ? 'topicTitle' : 'noteTitle'}`)}
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

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('writing.grammar.templates.searchPlaceholder')}
              className="w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[14px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
            />

            {/* Language pills */}
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setLanguage('')} className={pillClass(language === '')}>
                {t('writing.grammar.templates.allLanguages')}
              </button>
              {TEMPLATE_LANGUAGES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={pillClass(language === code)}
                >
                  {t(`writing.grammar.templates.language.${code}`)}
                </button>
              ))}
            </div>

            {/* Difficulty pills */}
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setDifficulty('')} className={pillClass(difficulty === '')}>
                {t('writing.grammar.templates.anyDifficulty')}
              </button>
              {TEMPLATE_DIFFICULTIES.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={pillClass(difficulty === level)}
                >
                  {level}
                </button>
              ))}
            </div>

            {isEmpty && (
              <p className="py-8 text-center text-[14px] font-medium text-(--color-text-secondary)">
                {t('writing.grammar.templates.empty')}
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              {kind === 'topic' &&
                topics.map((tpl) => (
                  <TopicTemplateCard
                    key={tpl.id}
                    tpl={tpl}
                    expanded={expandedId === tpl.id}
                    isBusy={isBusy}
                    onToggle={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                    onUse={() => onUseTopic?.(tpl)}
                  />
                ))}
              {kind === 'note' &&
                notes.map((tpl) => (
                  <NoteTemplateCard
                    key={tpl.id}
                    tpl={tpl}
                    expanded={expandedId === tpl.id}
                    isBusy={isBusy}
                    onToggle={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                    onUse={() => onUseNote?.(tpl)}
                  />
                ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* --- Cards --- */

interface CardShellProps {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  meta: string[];
  tags: string[];
  expanded: boolean;
  isBusy?: boolean;
  onToggle: () => void;
  onUse: () => void;
  children?: React.ReactNode;
}

const CardShell = ({
  icon,
  iconColor,
  title,
  description,
  meta,
  tags,
  expanded,
  isBusy,
  onToggle,
  onUse,
  children,
}: CardShellProps) => {
  const { t } = useTranslation();
  return (
    <div
      className={`rounded-2xl border bg-white p-4 transition-colors ${
        expanded ? 'border-(--color-primary-blue)/35' : 'border-(--color-auth-field-border)'
      }`}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 text-left">
        <span
          className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl"
          style={{ background: `${iconColor}1F` }}
        >
          <Icon name={icon} className="size-[19px]" style={{ color: iconColor }} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">{title}</span>
          <span className="text-[13px] font-medium text-(--color-text-secondary)">{description}</span>
          <span className="flex flex-wrap gap-1.5">
            {meta.map((m) => (
              <span
                key={m}
                className="rounded-full bg-(--color-goal-bg) px-2 py-0.5 text-[11px] font-bold text-(--color-text-secondary)"
              >
                {m}
              </span>
            ))}
            {tags.slice(0, 2).map((tag) => (
              <span key={tag} className="py-0.5 text-[11px] font-semibold text-(--color-muted-text)">
                #{tag}
              </span>
            ))}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-2 border-t border-(--color-auth-field-border) pt-3">
          {children}
          <button
            type="button"
            onClick={onUse}
            disabled={isBusy}
            className="h-11 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[14px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
          >
            {isBusy ? t('writing.grammar.templates.creating') : t('writing.grammar.templates.use')}
          </button>
        </div>
      )}
    </div>
  );
};

const TopicTemplateCard = ({
  tpl,
  expanded,
  isBusy,
  onToggle,
  onUse,
}: {
  tpl: GrammarTopicTemplate;
  expanded: boolean;
  isBusy?: boolean;
  onToggle: () => void;
  onUse: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <CardShell
      icon={tpl.icon}
      iconColor={tpl.colorHex}
      title={tpl.title}
      description={tpl.description}
      meta={[
        tpl.difficulty,
        t('writing.grammar.templates.minutes', { minutes: tpl.estimatedMinutes }),
        t('writing.grammar.templates.notesIncluded', { count: tpl.noteTemplates.length }),
      ]}
      tags={tpl.tags}
      expanded={expanded}
      isBusy={isBusy}
      onToggle={onToggle}
      onUse={onUse}
    >
      {tpl.noteTemplates.length > 0 && (
        <ul className="flex flex-col gap-1">
          {tpl.noteTemplates.map((n) => (
            <li key={n.id} className="flex items-center gap-2 text-[13px] font-medium text-(--color-primary-blue-dark)">
              <Icon
                name={NOTE_TYPE_META[n.noteType].icon}
                className="size-[14px] shrink-0"
                style={{ color: NOTE_TYPE_META[n.noteType].color }}
              />
              {n.title}
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
};

const NoteTemplateCard = ({
  tpl,
  expanded,
  isBusy,
  onToggle,
  onUse,
}: {
  tpl: GrammarNoteTemplate;
  expanded: boolean;
  isBusy?: boolean;
  onToggle: () => void;
  onUse: () => void;
}) => {
  const { t } = useTranslation();
  const meta = NOTE_TYPE_META[tpl.noteType];
  return (
    <CardShell
      icon={meta.icon}
      iconColor={meta.color}
      title={tpl.title}
      description={tpl.description}
      meta={[
        tpl.difficulty,
        t('writing.grammar.templates.minutes', { minutes: tpl.estimatedMinutes }),
        t('writing.grammar.templates.blocksIncluded', { count: tpl.blocks.length }),
      ]}
      tags={tpl.tags}
      expanded={expanded}
      isBusy={isBusy}
      onToggle={onToggle}
      onUse={onUse}
    >
      <ul className="flex flex-col gap-1">
        {tpl.blocks.map((b, i) => (
          <li key={i} className="flex items-baseline gap-2 text-[13px] font-medium text-(--color-primary-blue-dark)">
            <span className="shrink-0 rounded-full bg-(--color-goal-bg) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
              {String(t(`writing.grammar.block.${b.type}`))}
            </span>
            <span className="truncate">{b.text ?? b.items?.join(' · ') ?? ''}</span>
          </li>
        ))}
      </ul>
    </CardShell>
  );
};
