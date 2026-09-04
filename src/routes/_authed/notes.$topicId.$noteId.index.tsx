/* Note editor — /notes/$topicId/$noteId. `$noteId === 'new'` opens a blank
   editor that creates on first save. Existing notes seed the block-editor
   reducer from Firestore. Leaving with unsaved work is blocked (iOS saves the
   dirty note on disappear; the web asks, because a browser back is easy to hit
   by accident). */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createFileRoute, useBlocker, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { ConfirmDialog } from '@/components/shell/ConfirmDialog';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { AddBlockMenu } from '@/components/grammar/AddBlockMenu';
import { GrammarBlockEditor } from '@/components/grammar/GrammarBlockEditor';
import { GrammarNoteTypePicker } from '@/components/grammar/GrammarNoteTypePicker';
import { LanguageSelect } from '@/components/grammar/LanguageSelect';
import { TagsInput } from '@/components/grammar/TagsInput';
import { TemplateLibraryModal } from '@/components/grammar/TemplateLibraryModal';
import { useUid } from '@/hooks/useFolders';
import {
  useCreateNote,
  useDeleteNote,
  useGrammarNotesQuery,
  useUpdateNote,
} from '@/hooks/useGrammarNotes';
import { useGrammarTopicsQuery } from '@/hooks/useGrammarTopics';
import {
  useAddNoteToReview,
  useRemoveNoteFromReview,
  useReviewItemsQuery,
} from '@/hooks/useGrammarReview';
import {
  editorReducer,
  initialEditorState,
  isBlank,
  toNote,
  type EditorState,
} from '@/lib/grammarNoteEditor';
import { blocksFromTemplate, type GrammarNoteTemplate } from '@/lib/grammarTemplates';
import {
  forgetNote,
  recordEditedNote,
  recordOpenedNote,
} from '@/lib/grammarRecommendations';
import { reviewItemForNote } from '@/lib/grammarFilters';
import { useGrammarSettings } from '@/stores/grammarSettingsStore';
import type { GrammarNote, GrammarNoteTopic } from '@/lib/models';

export const Route = createFileRoute('/_authed/notes/$topicId/$noteId/')({
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const uid = useUid();
  const allowQuickQuizzes = useGrammarSettings((s) => s.allowQuickQuizzes);

  const seed = useMemo<EditorState>(() => {
    const base = initialEditorState(existing ?? undefined);
    /* A new note inherits the topic's language, like iOS quick notes do. */
    return existing || !topic
      ? base
      : { ...base, languageCode: topic.languageCode, languageName: topic.languageName };
  }, [existing, topic]);

  const [state, dispatch] = useReducer(editorReducer, seed);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const addToReview = useAddNoteToReview();
  const removeFromReview = useRemoveNoteFromReview();
  const { data: reviewItems } = useReviewItemsQuery();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<GrammarNoteTemplate | null>(null);
  const [reviewToast, setReviewToast] = useState<string | null>(null);
  /* Stable id from the first render so image blocks can upload before the
     note itself has been saved. */
  const noteIdRef = useRef(existing?.id ?? crypto.randomUUID());
  const savedRef = useRef(false);

  const isDirty = !savedRef.current && JSON.stringify(state) !== JSON.stringify(seed);

  /* Feed the spaced-review "recently opened" recommendation pool (4D3). */
  useEffect(() => {
    if (existing) {
      recordOpenedNote({
        topicId,
        noteId: existing.id,
        title: existing.title,
        previewText: existing.previewText,
      });
    }
  }, [existing, topicId]);

  useEffect(() => {
    if (!reviewToast) return;
    const timer = setTimeout(() => setReviewToast(null), 2600);
    return () => clearTimeout(timer);
  }, [reviewToast]);

  const blocker = useBlocker({
    shouldBlockFn: () => isDirty && !isBlank(state),
    enableBeforeUnload: () => isDirty && !isBlank(state),
    withResolver: true,
  });

  const goBack = () => void navigate({ to: '/notes/$topicId', params: { topicId } });

  const isSaving = createNote.isPending || updateNote.isPending;

  const buildNote = (): GrammarNote =>
    toNote(state, {
      id: noteIdRef.current,
      ownerUID: uid as string,
      topicId,
      createdAt: existing?.createdAt ?? Date.now(),
      hasQuiz: existing?.hasQuiz,
      savedIssueKey: existing?.savedIssueKey,
      sortIndex: existing?.sortIndex,
      templateId: existing?.templateId,
    });

  const persist = (onDone?: () => void) => {
    const note = buildNote();
    recordEditedNote({
      topicId,
      noteId: note.id,
      title: note.title,
      previewText: note.previewText,
    });
    savedRef.current = true;
    const options = { onSuccess: () => (onDone ? onDone() : goBack()) };
    if (isNew) createNote.mutate(note, options);
    else updateNote.mutate(note, options);
  };

  const applyTemplate = (tpl: GrammarNoteTemplate, mode: 'replace' | 'append') => {
    dispatch({
      type: 'APPLY_TEMPLATE',
      blocks: blocksFromTemplate(
        allowQuickQuizzes ? tpl.blocks : tpl.blocks.filter((b) => b.type !== 'quiz'),
      ),
      noteType: tpl.noteType,
      title: tpl.title,
      tags: tpl.tags,
      mode,
    });
    setPendingTemplate(null);
    setTemplatesOpen(false);
  };

  /* Undefined until the note exists — a note being written has no review
     card yet, and `reviewItems` may still be loading. */
  const reviewItem = existing ? reviewItemForNote(existing, reviewItems) : undefined;

  const handleToggleReview = () => {
    if (reviewItem && existing) {
      removeFromReview.mutate(
        { id: existing.id, topicId },
        { onSuccess: () => setReviewToast(t('writing.grammar.editor.removedFromReview')) },
      );
      return;
    }
    addToReview.mutate(buildNote(), {
      onSuccess: () => setReviewToast(t('writing.grammar.editor.addedToReview')),
    });
  };

  /* "In review · in 3 days", or "Due for review" once the date has passed. */
  const reviewButtonLabel = (): string => {
    if (!reviewItem) return t('writing.grammar.editor.addToReview');
    if (reviewItem.dueAt <= Date.now()) return t('writing.grammar.editor.inReviewDue');
    const days = Math.round((reviewItem.dueAt - Date.now()) / 86_400_000);
    const hours = Math.round((reviewItem.dueAt - Date.now()) / 3_600_000);
    const rtf = new Intl.RelativeTimeFormat(i18n.language, { style: 'short' });
    return t('writing.grammar.editor.inReview', {
      when: Math.abs(hours) < 24 ? rtf.format(hours, 'hour') : rtf.format(days, 'day'),
    });
  };

  const handleDelete = () => {
    if (isNew || !existing) {
      savedRef.current = true;
      goBack();
      return;
    }
    setPendingDelete(true);
  };

  const secondaryButton =
    'h-11 rounded-2xl border border-(--color-primary-blue)/35 bg-white px-4 text-[14px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/5 disabled:opacity-60 focus-visible:outline-none md:text-[15px]';

  /* A note already in review gets the queue's purple, so the button reports a
     state rather than offering the same action twice. */
  const reviewButtonActive =
    'h-11 rounded-2xl border border-[#7C5CFF]/35 bg-[#7C5CFF]/10 px-4 text-[14px] font-semibold text-[#5B3FD1] transition-colors hover:bg-[#7C5CFF]/20 disabled:opacity-60 focus-visible:outline-none md:text-[15px]';

  return (
    <ContentContainer fluid>
      <PageHeader
        title={topic?.title ?? t('nav.notes')}
        subtitle={isNew ? t('writing.grammar.newNote') : t('writing.grammar.editor.subtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_PINNED' })}
              aria-pressed={state.isPinned}
              aria-label={t(state.isPinned ? 'writing.grammar.unpin' : 'writing.grammar.pin')}
              className={`grid size-11 place-items-center rounded-2xl border border-(--color-auth-field-border) bg-white transition-colors focus-visible:outline-none ${state.isPinned ? 'text-(--color-primary-blue)' : 'text-(--color-muted-text)'}`}
            >
              <Icon name="pin.fill" className="size-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_FAVORITE' })}
              aria-pressed={state.isFavorite}
              aria-label={t(
                state.isFavorite ? 'writing.grammar.unfavorite' : 'writing.grammar.favorite',
              )}
              className={`grid size-11 place-items-center rounded-2xl border border-(--color-auth-field-border) bg-white transition-colors focus-visible:outline-none ${state.isFavorite ? 'text-[#F59E0B]' : 'text-(--color-muted-text)'}`}
            >
              <Icon name="star.fill" className="size-[18px]" />
            </button>
            <button type="button" onClick={() => setTemplatesOpen(true)} className={secondaryButton}>
              {t('writing.grammar.templates.button')}
            </button>
            <button
              type="button"
              onClick={handleToggleReview}
              disabled={addToReview.isPending || removeFromReview.isPending || isNew}
              aria-pressed={reviewItem !== undefined}
              className={reviewItem ? reviewButtonActive : secondaryButton}
            >
              {reviewButtonLabel()}
            </button>
            {!isNew && existing && allowQuickQuizzes && (
              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: '/notes/$topicId/$noteId/quiz',
                    params: { topicId, noteId: existing.id },
                  })
                }
                className={secondaryButton}
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
              onClick={() => persist()}
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
          ← {topic?.title ?? t('nav.notes')}
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

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-(--color-text-secondary)">
              {t('writing.grammar.form.language')}
            </span>
            <LanguageSelect
              value={state.languageCode}
              onChange={(code, name) => dispatch({ type: 'SET_LANGUAGE', code, name })}
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-(--color-text-secondary)">
              {t('writing.grammar.editor.tags')}
            </span>
            <TagsInput
              tags={state.tags}
              onAdd={(value) => dispatch({ type: 'ADD_TAG', value })}
              onRemove={(value) => dispatch({ type: 'REMOVE_TAG', value })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {state.blocks.map((block, i) => (
            <GrammarBlockEditor
              key={block.id}
              block={block}
              isFirst={i === 0}
              isLast={i === state.blocks.length - 1}
              imageTarget={
                uid ? { uid, topicId, noteId: noteIdRef.current } : undefined
              }
              dispatch={dispatch}
            />
          ))}
        </div>

        <AddBlockMenu
          allowsQuiz={allowQuickQuizzes}
          onAdd={(type) => dispatch({ type: 'ADD_BLOCK', blockType: type })}
        />

        {(createNote.isError || updateNote.isError) && (
          <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
            {t('writing.grammar.editor.saveError')}
          </p>
        )}
      </div>

      {reviewToast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-(--color-primary-blue-dark)/95 px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
        >
          {reviewToast}
        </div>
      )}

      <TemplateLibraryModal
        open={templatesOpen}
        kind="note"
        onUseNote={(tpl: GrammarNoteTemplate) => {
          /* Blank editor → apply straight away; otherwise ask how, exactly as
             the iOS confirmation dialog does. */
          if (isBlank(state)) applyTemplate(tpl, 'replace');
          else setPendingTemplate(tpl);
        }}
        onClose={() => setTemplatesOpen(false)}
      />

      {pendingTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(20, 24, 40, 0.28)' }}
          onClick={() => setPendingTemplate(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={t('writing.grammar.templates.applyTitle', { title: pendingTemplate.title })}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-[440px] flex-col gap-4 rounded-[26px] bg-white p-6 shadow-[0_24px_60px_rgba(20,24,40,0.18)]"
          >
            <h2 className="text-[19px] font-bold text-(--color-primary-blue-dark)">
              {t('writing.grammar.templates.applyTitle', { title: pendingTemplate.title })}
            </h2>
            <p className="text-[15px] leading-[1.45] font-medium text-(--color-text-secondary)">
              {t('writing.grammar.templates.applyBody')}
            </p>
            <div className="mt-1 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingTemplate(null)}
                className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-text-secondary) transition-colors hover:bg-black/[0.03] focus-visible:outline-none"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => applyTemplate(pendingTemplate, 'append')}
                className="h-11 rounded-2xl border border-(--color-primary-blue)/35 bg-white px-5 text-[15px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/5 focus-visible:outline-none"
              >
                {t('writing.grammar.templates.applyAppend')}
              </button>
              <button
                type="button"
                onClick={() => applyTemplate(pendingTemplate, 'replace')}
                className="h-11 rounded-2xl bg-(--color-cs-red) px-5 text-[15px] font-semibold text-white transition-transform active:scale-[0.98] focus-visible:outline-none"
              >
                {t('writing.grammar.templates.applyReplace')}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && existing && (
        <ConfirmDialog
          title={t('writing.grammar.deleteNoteTitle')}
          body={t('writing.grammar.deleteNoteConfirm')}
          isBusy={deleteNote.isPending}
          onConfirm={() => {
            forgetNote(topicId, existing.id);
            savedRef.current = true;
            deleteNote.mutate({ topicId, id: existing.id }, { onSuccess: goBack });
          }}
          onCancel={() => setPendingDelete(false)}
        />
      )}

      {blocker.status === 'blocked' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(20, 24, 40, 0.28)' }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={t('writing.grammar.editor.unsavedTitle')}
            className="flex w-full max-w-[440px] flex-col gap-4 rounded-[26px] bg-white p-6 shadow-[0_24px_60px_rgba(20,24,40,0.18)]"
          >
            <h2 className="text-[19px] font-bold text-(--color-primary-blue-dark)">
              {t('writing.grammar.editor.unsavedTitle')}
            </h2>
            <p className="text-[15px] leading-[1.45] font-medium text-(--color-text-secondary)">
              {t('writing.grammar.editor.unsavedBody')}
            </p>
            <div className="mt-1 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => blocker.reset()}
                className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-text-secondary) transition-colors hover:bg-black/[0.03] focus-visible:outline-none"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  savedRef.current = true;
                  blocker.proceed();
                }}
                className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-cs-red) transition-colors hover:bg-black/[0.03] focus-visible:outline-none"
              >
                {t('writing.grammar.editor.discard')}
              </button>
              <button
                type="button"
                onClick={() => persist(() => blocker.proceed())}
                disabled={isSaving}
                className="h-11 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-5 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform active:scale-[0.98] disabled:opacity-70 focus-visible:outline-none"
              >
                {t('writing.grammar.editor.saveAndLeave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ContentContainer>
  );
}
