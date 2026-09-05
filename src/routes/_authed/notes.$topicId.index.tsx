/* Topic detail — /notes/$topicId. Search + filter chips over the topic's
   notes, quick capture (note / mistake), pin & favorite, reorder, and
   "New note". `.index` so the $noteId editor route nests below. */
import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Plus } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { ConfirmDialog } from '@/components/shell/ConfirmDialog';
import { BackLink } from '@/components/shell/BackLink';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ViewToggle } from '@/components/shell/ViewToggle';
import { cardGridClass, useCardView } from '@/lib/cardView';
import { GrammarNoteRow } from '@/components/grammar/GrammarNoteRow';
import { GrammarNotesEmptyState } from '@/components/grammar/GrammarNotesEmptyState';
import { GrammarSearchBar } from '@/components/grammar/GrammarSearchBar';
import { NoteFilterChips } from '@/components/grammar/NoteFilterChips';
import { QuickCaptureButtons } from '@/components/grammar/QuickCaptureButtons';
import { QuickMistakeSheet } from '@/components/grammar/QuickMistakeSheet';
import { QuickNoteSheet } from '@/components/grammar/QuickNoteSheet';
import { useGrammarTopicsQuery } from '@/hooks/useGrammarTopics';
import {
  useCreateQuickNote,
  useDeleteNote,
  useGrammarNotesQuery,
  useReorderNotes,
  useToggleNoteFavorite,
  useToggleNotePinned,
} from '@/hooks/useGrammarNotes';
import { useSaveMistake } from '@/hooks/useSaveMistake';
import { useReviewItemsQuery } from '@/hooks/useGrammarReview';
import {
  NOTE_FILTERS,
  noteMatchesFilter,
  reviewItemForNote,
  type NoteFilter,
} from '@/lib/grammarFilters';
import { noteMatchesQuery, searchSnippet } from '@/lib/grammarSearch';
import { sortNotes } from '@/lib/grammarNoteService';
import { useGrammarSettings } from '@/stores/grammarSettingsStore';
import type { GrammarNote } from '@/lib/models';

export const Route = createFileRoute('/_authed/notes/$topicId/')({
  component: GrammarTopicDetail,
});

function GrammarTopicDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { topicId } = Route.useParams();
  const { data: topics } = useGrammarTopicsQuery();
  const { data: notes, isLoading, isError } = useGrammarNotesQuery(topicId);
  const { data: reviewItems } = useReviewItemsQuery();
  const groupsPinnedNotesFirst = useGrammarSettings((s) => s.groupsPinnedNotesFirst);

  const deleteNote = useDeleteNote();
  const togglePinned = useToggleNotePinned();
  const toggleFavorite = useToggleNoteFavorite();
  const reorderNotes = useReorderNotes();
  const quickNote = useCreateQuickNote();
  const saveMistake = useSaveMistake();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [isReordering, setReordering] = useState(false);
  const [view, chooseView] = useCardView('topic-notes');
  const [pendingDelete, setPendingDelete] = useState<GrammarNote | null>(null);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickMistakeSession, setQuickMistakeSession] = useState(0);
  const [quickMistakeOpen, setQuickMistakeOpen] = useState(false);
  const quickKey = `quick-${topicId}-${quickMistakeSession}`;

  const topic = topics?.find((tp) => tp.id === topicId);

  const ordered = useMemo(
    () => sortNotes(notes ?? [], { pinnedFirst: groupsPinnedNotesFirst }),
    [notes, groupsPinnedNotesFirst],
  );

  const filterContext = useMemo(() => ({ reviewItems }), [reviewItems]);

  const visibleNotes = useMemo(
    () =>
      ordered.filter(
        (note) => noteMatchesFilter(note, filter, filterContext) && noteMatchesQuery(note, query),
      ),
    [ordered, filter, query, filterContext],
  );

  const counts = useMemo(() => {
    const result: Partial<Record<NoteFilter, number>> = {};
    for (const f of NOTE_FILTERS) {
      result[f] = ordered.filter((note) => noteMatchesFilter(note, f, filterContext)).length;
    }
    return result;
  }, [ordered, filterContext]);

  const openNote = (noteId: string) =>
    void navigate({ to: '/notes/$topicId/$noteId', params: { topicId, noteId } });

  const moveNote = (index: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    reorderNotes.mutate({ topicId, orderedIds: next.map((n) => n.id) });
  };

  const isFiltering = query.trim().length > 0 || filter !== 'all';

  return (
    <ContentContainer fluid>
      <PageHeader
        title={topic?.title ?? t('nav.notes')}
        subtitle={topic?.description || undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <QuickCaptureButtons
              onQuickNote={() => setQuickNoteOpen(true)}
              onQuickMistake={() => {
                setQuickMistakeSession((n) => n + 1);
                setQuickMistakeOpen(true);
              }}
            />
            <button
              type="button"
              onClick={() => openNote('new')}
              className="flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-4 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:outline-none"
            >
              <Plus size={18} weight="bold" />
              {t('writing.grammar.newNote')}
            </button>
          </div>
        }
      />

      <BackLink
        label={t('nav.notes')}
        onClick={() => void navigate({ to: '/notes' })}
        className="mb-4"
      />

      <div className="mb-4 flex flex-col gap-3">
        <GrammarSearchBar
          value={query}
          placeholder={t('writing.grammar.search.notes')}
          onChange={setQuery}
        />
        <div className="flex items-center gap-2">
          <NoteFilterChips value={filter} counts={counts} onChange={setFilter} />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {ordered.length > 1 && (
              <button
                type="button"
                onClick={() => setReordering((v) => !v)}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-(--color-auth-field-border) bg-white px-3 text-[13px] font-bold text-(--color-text-secondary) transition-colors hover:bg-black/[0.03] focus-visible:outline-none"
              >
                <Icon name="arrow.up.arrow.down" className="size-[13px]" />
                {t(isReordering ? 'writing.grammar.reorder.done' : 'writing.grammar.reorder.start')}
              </button>
            )}
            <ViewToggle value={view} onChange={chooseView} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-[15px] font-medium text-(--color-text-secondary)">
          {t('writing.grammar.loading')}
        </p>
      ) : isError ? (
        <p role="alert" className="text-[15px] font-medium text-(--color-cs-red)">
          {t('writing.grammar.loadError')}
        </p>
      ) : ordered.length === 0 ? (
        <GrammarNotesEmptyState
          title={t('writing.grammar.notesEmptyTitle')}
          body={t('writing.grammar.notesEmptyBody')}
          tip={t('writing.grammar.notesEmptyTip')}
          actionLabel={t('writing.grammar.newNote')}
          onAction={() => openNote('new')}
        />
      ) : visibleNotes.length === 0 ? (
        <GrammarNotesEmptyState
          title={t(
            query.trim().length > 0
              ? 'writing.grammar.search.noMatchTitle'
              : `writing.grammar.filter.empty.${filter}.title`,
          )}
          body={t(
            query.trim().length > 0
              ? 'writing.grammar.search.noMatchBody'
              : `writing.grammar.filter.empty.${filter}.body`,
          )}
        />
      ) : (
        <div className={cardGridClass(view)}>
          {visibleNotes.map((note, index) => (
            <GrammarNoteRow
              key={note.id}
              note={note}
              variant={view}
              reviewItem={reviewItemForNote(note, reviewItems)}
              snippet={searchSnippet(note, query)}
              isReordering={isReordering && !isFiltering}
              isFirst={index === 0}
              isLast={index === visibleNotes.length - 1}
              onOpen={() => openNote(note.id)}
              onDelete={() => setPendingDelete(note)}
              onTogglePinned={() => togglePinned.mutate(note)}
              onToggleFavorite={() => toggleFavorite.mutate(note)}
              onMove={(dir) => moveNote(index, dir)}
            />
          ))}
        </div>
      )}

      <QuickNoteSheet
        open={quickNoteOpen}
        topics={topic ? [topic] : (topics ?? [])}
        lockedTopicId={topicId}
        isSaving={quickNote.isPending}
        error={quickNote.isError ? t('writing.grammar.editor.saveError') : null}
        onSave={(draft, target, openEditor) =>
          quickNote.mutate(
            { draft, topic: target },
            {
              onSuccess: (note) => {
                setQuickNoteOpen(false);
                if (openEditor) openNote(note.id);
              },
            },
          )
        }
        onClose={() => setQuickNoteOpen(false)}
      />

      <QuickMistakeSheet
        open={quickMistakeOpen}
        saveState={saveMistake.stateFor(quickKey)}
        saveReason={saveMistake.reasonFor(quickKey)}
        onSave={(values) =>
          void saveMistake.save(
            quickKey,
            {
              original: values.original,
              corrected: values.corrected,
              explanation: values.explanation,
              languageCode: topic?.languageCode,
              languageName: topic?.languageName,
            },
            /* "Group mistakes by topic" keeps the correction here instead of
               sending it to Common Mistakes (iOS createQuickMistake). */
            { topicId },
          )
        }
        onOpenMistakesTopic={() => {
          setQuickMistakeOpen(false);
          const mistakes = topics?.find((tp) => tp.isMistakesTopic);
          if (mistakes) void navigate({ to: '/notes/$topicId', params: { topicId: mistakes.id } });
        }}
        onClose={() => setQuickMistakeOpen(false)}
      />

      {pendingDelete && (
        <ConfirmDialog
          title={t('writing.grammar.deleteNoteTitle')}
          body={t('writing.grammar.deleteNoteConfirm')}
          isBusy={deleteNote.isPending}
          onConfirm={() =>
            deleteNote.mutate(
              { topicId, id: pendingDelete.id },
              { onSuccess: () => setPendingDelete(null) },
            )
          }
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </ContentContainer>
  );
}
