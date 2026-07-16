/* Note editor — /practice/writing/grammar/$topicId/$noteId. `$noteId === 'new'`
   opens a blank editor that creates on first save. Existing notes seed the
   block-editor reducer from Firestore. */
import { useReducer } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { AddBlockMenu } from '@/components/grammar/AddBlockMenu';
import { GrammarBlockEditor } from '@/components/grammar/GrammarBlockEditor';
import { GrammarNoteTypePicker } from '@/components/grammar/GrammarNoteTypePicker';
import { useGrammarTopicsQuery } from '@/hooks/useGrammarTopics';
import {
  useCreateNote,
  useDeleteNote,
  useGrammarNotesQuery,
  useUpdateNote,
} from '@/hooks/useGrammarNotes';
import { useUid } from '@/hooks/useFolders';
import {
  editorReducer,
  initialEditorState,
  toNote,
} from '@/lib/grammarNoteEditor';
import type { GrammarNote, GrammarNoteTopic } from '@/lib/models';

export const Route = createFileRoute('/_authed/practice/writing/grammar/$topicId/$noteId/')({
  component: NoteEditorRoute,
});

function NoteEditorRoute() {
  const { t } = useTranslation();
  const { topicId, noteId } = Route.useParams();
  const isNew = noteId === 'new';
  const { data: topics } = useGrammarTopicsQuery();
  const { data: notes, isLoading } = useGrammarNotesQuery(topicId);

  const topic = topics?.find((tp) => tp.id === topicId);
  const existing = notes?.find((n) => n.id === noteId);

  if (!isNew && isLoading) {
    return (
      <ContentContainer fluid>
        <p className="py-16 text-center text-[15px] font-medium text-(--color-text-secondary)">
          {t('writing.grammar.loading')}
        </p>
      </ContentContainer>
    );
  }

  if (!isNew && !existing) {
    return (
      <ContentContainer fluid>
        <p role="alert" className="py-16 text-center text-[15px] font-medium text-(--color-cs-red)">
          {t('writing.grammar.notFoundBody')}
        </p>
      </ContentContainer>
    );
  }

  return (
    <NoteEditor
      key={noteId}
      topicId={topicId}
      topic={topic}
      existing={existing ?? null}
      isNew={isNew}
    />
  );
}

interface NoteEditorProps {
  topicId: string;
  topic?: GrammarNoteTopic;
  existing: GrammarNote | null;
  isNew: boolean;
}

function NoteEditor({ topicId, topic, existing, isNew }: NoteEditorProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUid();
  const [state, dispatch] = useReducer(
    editorReducer,
    existing ?? undefined,
    initialEditorState,
  );
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const goBack = () =>
    void navigate({ to: '/practice/writing/grammar/$topicId', params: { topicId } });

  const isSaving = createNote.isPending || updateNote.isPending;

  const handleSave = () => {
    const now = Date.now();
    const note = toNote(state, {
      id: existing?.id ?? crypto.randomUUID(),
      ownerUID: uid as string,
      topicId,
      createdAt: existing?.createdAt ?? now,
    });
    if (isNew) {
      const nextCount = (topic?.notesCount ?? 0) + 1;
      createNote.mutate({ note, nextCount }, { onSuccess: goBack });
    } else {
      updateNote.mutate(note, { onSuccess: goBack });
    }
  };

  const handleDelete = () => {
    if (isNew || !existing) {
      goBack();
      return;
    }
    if (window.confirm(t('writing.grammar.deleteNoteConfirm'))) {
      const nextCount = Math.max((topic?.notesCount ?? 1) - 1, 0);
      deleteNote.mutate({ topicId, id: existing.id, nextCount }, { onSuccess: goBack });
    }
  };

  return (
    <ContentContainer fluid>
      <PageHeader
        title={topic?.title ?? t('writing.grammar.title')}
        subtitle={t('writing.grammar.newNote')}
        actions={
          <div className="flex gap-2">
            {!isNew && existing && (
              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: '/practice/writing/grammar/$topicId/$noteId/quiz',
                    params: { topicId, noteId: existing.id },
                  })
                }
                className="h-11 rounded-2xl border border-(--color-primary-blue)/35 bg-white px-4 text-[14px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/5 focus-visible:outline-none md:text-[15px]"
              >
                {t('writing.grammar.quiz.title')}
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[14px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03] focus-visible:outline-none md:text-[15px]"
            >
              {isNew ? t('writing.grammar.form.cancel') : t('writing.grammar.editor.delete')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-11 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-5 text-[14px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-70 focus-visible:outline-none md:text-[15px]"
            >
              {isSaving ? t('writing.grammar.editor.saving') : t('writing.grammar.editor.save')}
            </button>
          </div>
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={goBack}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {topic?.title ?? t('writing.grammar.title')}
        </button>

        <input
          value={state.title}
          onChange={(e) => dispatch({ type: 'SET_TITLE', value: e.target.value })}
          placeholder={t('writing.grammar.editor.titlePlaceholder')}
          autoFocus
          className="w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[20px] font-bold text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
        />

        <GrammarNoteTypePicker
          value={state.noteType}
          onChange={(type) => dispatch({ type: 'SET_NOTE_TYPE', value: type })}
        />

        <div className="flex flex-col gap-3">
          {state.blocks.map((block, i) => (
            <GrammarBlockEditor
              key={block.id}
              block={block}
              isFirst={i === 0}
              isLast={i === state.blocks.length - 1}
              dispatch={dispatch}
            />
          ))}
        </div>

        <AddBlockMenu onAdd={(type) => dispatch({ type: 'ADD_BLOCK', blockType: type })} />

        {(createNote.isError || updateNote.isError) && (
          <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
            {t('writing.grammar.editor.saveError')}
          </p>
        )}
      </div>
    </ContentContainer>
  );
}
