/* Notes home — /notes, reached from Library ▸ Notes in the sidebar. Search,
   the review summary, the two review-highlight rows, and the topics list with
   quick capture + reorder. `.index` so the nested $topicId routes sit below
   without turning this into a layout-without-Outlet (Phase-3 trap). */
import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { ConfirmDialog } from '@/components/shell/ConfirmDialog';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { GrammarNotesEmptyState } from '@/components/grammar/GrammarNotesEmptyState';
import { GrammarSearchBar } from '@/components/grammar/GrammarSearchBar';
import { GrammarTopicCard } from '@/components/grammar/GrammarTopicCard';
import { GrammarTopicForm } from '@/components/grammar/GrammarTopicForm';
import { QuickMistakeSheet } from '@/components/grammar/QuickMistakeSheet';
import { QuickNoteSheet } from '@/components/grammar/QuickNoteSheet';
import { ReviewHighlightsRow } from '@/components/grammar/ReviewHighlightsRow';
import { ReviewTodayCard } from '@/components/grammar/ReviewTodayCard';
import { TemplateLibraryModal } from '@/components/grammar/TemplateLibraryModal';
import { useCreateQuickNote } from '@/hooks/useGrammarNotes';
import {
  useCreateTopic,
  useCreateTopicFromTemplate,
  useDeleteTopic,
  useEnsureMistakesTopic,
  useGrammarTopicsQuery,
  useReorderTopics,
} from '@/hooks/useGrammarTopics';
import { useReviewHighlightsQuery, useReviewQueueQuery } from '@/hooks/useGrammarReview';
import { useSaveMistake } from '@/hooks/useSaveMistake';
import { MISTAKES_TOPIC_ID } from '@/lib/grammarTopicService';
import { normalizeSearchText } from '@/lib/grammarSearch';
import { useGrammarSettings } from '@/stores/grammarSettingsStore';
import type { GrammarNoteTopic } from '@/lib/models';

export const Route = createFileRoute('/_authed/notes/')({
  component: GrammarHome,
});

function GrammarHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: topics, isLoading, isError } = useGrammarTopicsQuery();
  const { data: reviewQueue, isLoading: reviewLoading, isError: reviewError } = useReviewQueueQuery();
  const { data: mistakeHighlights } = useReviewHighlightsQuery('mistake');
  const { data: quizHighlights } = useReviewHighlightsQuery('quiz');
  const showsMistakeHighlights = useGrammarSettings((s) => s.showsMistakeHighlights);

  useEnsureMistakesTopic(topics);

  const createTopic = useCreateTopic();
  const createFromTemplate = useCreateTopicFromTemplate();
  const deleteTopic = useDeleteTopic();
  const reorderTopics = useReorderTopics();
  const quickNote = useCreateQuickNote();
  const saveMistake = useSaveMistake();

  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [isReordering, setReordering] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<GrammarNoteTopic | null>(null);
  /* Quick-mistake: a fresh key per open so the sheet's save state resets. */
  const [quickMistakeSession, setQuickMistakeSession] = useState(0);
  const [quickMistakeOpen, setQuickMistakeOpen] = useState(false);
  const quickKey = `quick-${quickMistakeSession}`;

  /* iOS refreshFilteredTopics: title, description or language name. */
  const visibleTopics = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!topics || q.length === 0) return topics ?? [];
    return topics.filter((topic) =>
      [topic.title, topic.description, topic.languageName].some((field) =>
        normalizeSearchText(field).includes(q),
      ),
    );
  }, [topics, query]);

  const openTopic = (topicId: string) =>
    void navigate({ to: '/notes/$topicId', params: { topicId } });

  const moveTopic = (index: number, dir: 'up' | 'down') => {
    if (!topics) return;
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= topics.length) return;
    const next = [...topics];
    [next[index], next[target]] = [next[target], next[index]];
    reorderTopics.mutate(next.map((tp) => tp.id));
  };

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('nav.notes')}
        subtitle={t('writing.grammar.subtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void navigate({ to: '/notes/settings' })}
              aria-label={t('writing.grammar.settings.title')}
              className="grid size-11 place-items-center rounded-2xl border border-(--color-auth-field-border) bg-white text-(--color-text-secondary) transition-colors hover:bg-black/[0.03] focus-visible:outline-none"
            >
              <Icon name="gearshape.fill" className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setQuickNoteOpen(true)}
              className="h-11 rounded-2xl border border-(--color-primary-blue)/35 bg-white px-4 text-[14px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/5 focus-visible:outline-none md:text-[15px]"
            >
              {t('writing.grammar.quickNote.button')}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickMistakeSession((n) => n + 1);
                setQuickMistakeOpen(true);
              }}
              className="h-11 rounded-2xl border border-(--color-primary-blue)/35 bg-white px-4 text-[14px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/5 focus-visible:outline-none md:text-[15px]"
            >
              {t('writing.grammar.quickMistake.button')}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-4 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:outline-none"
            >
              <Plus size={18} weight="bold" />
              {t('writing.grammar.newTopic')}
            </button>
          </div>
        }
      />

      <div className="mb-4">
        <GrammarSearchBar
          value={query}
          placeholder={t('writing.grammar.search.topics')}
          onChange={setQuery}
        />
      </div>

      <div className="mb-5 flex flex-col gap-5">
        <ReviewTodayCard
          queue={reviewQueue}
          isLoading={reviewLoading}
          isError={reviewError}
          onStart={() => void navigate({ to: '/notes/review' })}
        />

        {showsMistakeHighlights && (
          <ReviewHighlightsRow
            title={t('writing.grammar.highlights.mistakesTitle')}
            subtitle={t('writing.grammar.highlights.mistakesSubtitle')}
            accent="#F4729A"
            items={mistakeHighlights ?? []}
            onOpen={(item) =>
              item.noteId
                ? void navigate({
                    to: '/notes/$topicId/$noteId',
                    params: { topicId: item.topicId, noteId: item.noteId },
                  })
                : openTopic(item.topicId)
            }
          />
        )}

        <ReviewHighlightsRow
          title={t('writing.grammar.highlights.quizzesTitle')}
          subtitle={t('writing.grammar.highlights.quizzesSubtitle')}
          accent="#7C5CFF"
          items={quizHighlights ?? []}
          onOpen={(item) =>
            item.noteId
              ? void navigate({
                  to: '/notes/$topicId/$noteId/quiz',
                  params: { topicId: item.topicId, noteId: item.noteId },
                })
              : openTopic(item.topicId)
          }
        />
      </div>

      {topics && topics.length > 1 && (
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-[15px] font-black text-(--color-primary-blue-dark) lg:text-[17px]">
            {t('writing.grammar.topicsTitle')}
          </h2>
          <button
            type="button"
            onClick={() => setReordering((v) => !v)}
            className="ml-auto flex h-9 items-center gap-1.5 rounded-full border border-(--color-auth-field-border) bg-white px-3 text-[13px] font-bold text-(--color-text-secondary) transition-colors hover:bg-black/[0.03] focus-visible:outline-none"
          >
            <Icon name="arrow.up.arrow.down" className="size-[13px]" />
            {t(isReordering ? 'writing.grammar.reorder.done' : 'writing.grammar.reorder.start')}
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-[15px] font-medium text-(--color-text-secondary)">
          {t('writing.grammar.loading')}
        </p>
      ) : isError ? (
        <p role="alert" className="text-[15px] font-medium text-(--color-cs-red)">
          {t('writing.grammar.loadError')}
        </p>
      ) : !topics || topics.length === 0 ? (
        <GrammarNotesEmptyState
          title={t('writing.grammar.topicsEmptyTitle')}
          body={t('writing.grammar.topicsEmptyBody')}
          actionLabel={t('writing.grammar.newTopic')}
          onAction={() => setFormOpen(true)}
        />
      ) : visibleTopics.length === 0 ? (
        <GrammarNotesEmptyState
          title={t('writing.grammar.search.noMatchTitle')}
          body={t('writing.grammar.search.noMatchBody')}
        />
      ) : (
        <div className="flex max-w-[760px] flex-col gap-(--spacing-home-sets-gap)">
          {visibleTopics.map((topic, index) => (
            <GrammarTopicCard
              key={topic.id}
              topic={topic}
              isReordering={isReordering && query.length === 0}
              isFirst={index === 0}
              isLast={index === visibleTopics.length - 1}
              onOpen={() => openTopic(topic.id)}
              onDelete={() => setPendingDelete(topic)}
              onMove={(dir) => moveTopic(index, dir)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm md:items-center md:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFormOpen(false)}
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
              <h2 className="text-[19px] font-bold text-(--color-primary-blue-dark) md:text-[22px]">
                {t('writing.grammar.form.newTitle')}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setTemplatesOpen(true);
                }}
                className="flex items-center gap-2 rounded-2xl border border-(--color-primary-blue)/35 bg-(--color-primary-blue)/5 px-4 py-3 text-left text-[14px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/10"
              >
                <Plus size={16} weight="bold" />
                {t('writing.grammar.templates.startFromTemplate')}
              </button>
              <GrammarTopicForm
                isSaving={createTopic.isPending}
                onSubmit={(values) =>
                  createTopic.mutate(values, {
                    onSuccess: (topic) => {
                      setFormOpen(false);
                      openTopic(topic.id);
                    },
                  })
                }
                onCancel={() => setFormOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TemplateLibraryModal
        open={templatesOpen}
        kind="topic"
        isBusy={createFromTemplate.isPending}
        onUseTopic={(tpl) =>
          createFromTemplate.mutate(tpl, {
            onSuccess: (topic) => {
              setTemplatesOpen(false);
              openTopic(topic.id);
            },
          })
        }
        onClose={() => setTemplatesOpen(false)}
      />

      <QuickNoteSheet
        open={quickNoteOpen}
        topics={topics ?? []}
        isSaving={quickNote.isPending}
        error={quickNote.isError ? t('writing.grammar.editor.saveError') : null}
        onSave={(draft, topic, openEditor) =>
          quickNote.mutate(
            { draft, topic },
            {
              onSuccess: (note) => {
                setQuickNoteOpen(false);
                if (openEditor) {
                  void navigate({
                    to: '/notes/$topicId/$noteId',
                    params: { topicId: topic.id, noteId: note.id },
                  });
                }
              },
            },
          )
        }
        onClose={() => setQuickNoteOpen(false)}
      />

      <QuickMistakeSheet
        open={quickMistakeOpen}
        saveState={saveMistake.stateFor(quickKey)}
        onSave={(values) =>
          void saveMistake.save(quickKey, {
            original: values.original,
            corrected: values.corrected,
            explanation: values.explanation,
          })
        }
        onOpenMistakesTopic={() => {
          setQuickMistakeOpen(false);
          const mistakes = topics?.find((tp) => tp.isMistakesTopic);
          openTopic(mistakes?.id ?? MISTAKES_TOPIC_ID);
        }}
        onClose={() => setQuickMistakeOpen(false)}
      />

      {pendingDelete && (
        <ConfirmDialog
          title={t('writing.grammar.deleteTopicTitle')}
          body={t('writing.grammar.deleteTopicConfirm', { title: pendingDelete.title })}
          isBusy={deleteTopic.isPending}
          onConfirm={() =>
            deleteTopic.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) })
          }
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </ContentContainer>
  );
}
