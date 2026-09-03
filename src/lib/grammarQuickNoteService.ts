/* Quick note — web port of CreateQuickGrammarNoteUseCase.swift. Title + one
   paragraph block, saved straight into the chosen topic without opening the
   full editor; the note inherits the topic's language. */
import { makeGrammarNote } from '@/lib/grammarFactories';
import * as noteService from '@/lib/grammarNoteService';
import * as topicService from '@/lib/grammarTopicService';
import type { GrammarNote, GrammarNoteBlock, GrammarNoteTopic, GrammarNoteType } from '@/lib/models';

export interface QuickNoteDraft {
  title: string;
  text: string;
  noteType: GrammarNoteType;
}

export const buildQuickNote = (
  draft: QuickNoteDraft,
  params: { ownerUID: string; topic: GrammarNoteTopic; now?: number },
): GrammarNote => {
  const title = draft.title.trim();
  const text = draft.text.trim();
  const blocks: GrammarNoteBlock[] =
    text.length > 0
      ? [{ id: crypto.randomUUID(), type: 'paragraph', text, items: [], order: 0 }]
      : [];
  return makeGrammarNote({
    ownerUID: params.ownerUID,
    topicId: params.topic.id,
    title: title.length > 0 ? title : 'Untitled quick note',
    previewText: text.slice(0, 180),
    contentBlocks: blocks,
    noteType: draft.noteType,
    languageCode: params.topic.languageCode,
    languageName: params.topic.languageName,
    now: params.now,
  });
};

/** Persist a quick note and keep the topic's notesCount in step. */
export const saveQuickNote = async (
  draft: QuickNoteDraft,
  params: { uid: string; topic: GrammarNoteTopic },
): Promise<GrammarNote> => {
  const note = buildQuickNote(draft, { ownerUID: params.uid, topic: params.topic });
  await noteService.createNote(note);
  const notes = await noteService.fetchNotes(params.uid, params.topic.id).catch(() => null);
  if (notes) {
    await topicService.setNotesCount(params.uid, params.topic.id, notes.length).catch(() => {});
  }
  return note;
};
