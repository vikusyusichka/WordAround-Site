/* Topic detail — /practice/writing/grammar/$topicId. Notes list for one topic
   + "New note". `.index` so the $noteId editor route nests below. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Plus } from '@phosphor-icons/react';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { GrammarNoteRow } from '@/components/grammar/GrammarNoteRow';
import { GrammarNotesEmptyState } from '@/components/grammar/GrammarNotesEmptyState';
import { useGrammarTopicsQuery } from '@/hooks/useGrammarTopics';
import { useDeleteNote, useGrammarNotesQuery } from '@/hooks/useGrammarNotes';

export const Route = createFileRoute('/_authed/practice/writing/grammar/$topicId/')({
  component: GrammarTopicDetail,
});

function GrammarTopicDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { topicId } = Route.useParams();
  const { data: topics } = useGrammarTopicsQuery();
  const { data: notes, isLoading, isError } = useGrammarNotesQuery(topicId);
  const deleteNote = useDeleteNote();

  const topic = topics?.find((tp) => tp.id === topicId);

  const handleDelete = (id: string) => {
    if (window.confirm(t('writing.grammar.deleteNoteConfirm'))) {
      const nextCount = Math.max((topic?.notesCount ?? 1) - 1, 0);
      deleteNote.mutate({ topicId, id, nextCount });
    }
  };

  const openNote = (noteId: string) =>
    void navigate({
      to: '/practice/writing/grammar/$topicId/$noteId',
      params: { topicId, noteId },
    });

  return (
    <ContentContainer fluid>
      <PageHeader
        title={topic?.title ?? t('writing.grammar.title')}
        subtitle={topic?.description || undefined}
        actions={
          <button
            type="button"
            onClick={() => openNote('new')}
            className="flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-4 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:outline-none"
          >
            <Plus size={18} weight="bold" />
            {t('writing.grammar.newNote')}
          </button>
        }
      />

      <button
        type="button"
        onClick={() => void navigate({ to: '/practice/writing/grammar' })}
        className="mb-4 w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
      >
        ← {t('writing.grammar.title')}
      </button>

      {isLoading ? (
        <p className="text-[15px] font-medium text-(--color-text-secondary)">
          {t('writing.grammar.loading')}
        </p>
      ) : isError ? (
        <p role="alert" className="text-[15px] font-medium text-(--color-cs-red)">
          {t('writing.grammar.loadError')}
        </p>
      ) : !notes || notes.length === 0 ? (
        <GrammarNotesEmptyState
          title={t('writing.grammar.notesEmptyTitle')}
          body={t('writing.grammar.notesEmptyBody')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <GrammarNoteRow
              key={note.id}
              note={note}
              onOpen={() => openNote(note.id)}
              onDelete={() => handleDelete(note.id)}
            />
          ))}
        </div>
      )}
    </ContentContainer>
  );
}
