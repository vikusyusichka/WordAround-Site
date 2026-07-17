/* Save a grammar mistake as a note — web port of GrammarMistakeSaveService /
   SaveQuickGrammarMistakeUseCase. Composes the iOS block recipe (heading
   "Mistake" · quote original · example corrected · paragraph explanation),
   dedups via savedIssueKey, targets the auto-provisioned Common Mistakes
   topic, and queues a high-priority review item (4D3). */
import * as noteService from '@/lib/grammarNoteService';
import * as topicService from '@/lib/grammarTopicService';
import { makeReviewItem, reviewItemIdForMistake } from '@/lib/grammarReview';
import { upsertReviewItem } from '@/lib/grammarReviewService';
import type { GrammarNote, GrammarNoteBlock } from '@/lib/models';

export interface MistakePayload {
  original: string;
  corrected: string;
  explanation: string;
  /** Stable id of the source grammar issue (essay flow); empty for quick saves. */
  sourceIssueId?: string;
}

export type SaveMistakeOutcome =
  | { status: 'saved'; note: GrammarNote; topicId: string }
  | { status: 'duplicate'; note: GrammarNote; topicId: string };

const collapse = (s: string) => s.trim().replace(/\s+/g, ' ');

/** Normalized dedup key — lowercased pipe-join of the mistake parts (iOS
    savedIssueKey semantics). */
export const buildSavedIssueKey = (payload: MistakePayload): string =>
  [payload.sourceIssueId ?? '', payload.original, payload.corrected, payload.explanation]
    .map((part) => collapse(part).toLowerCase())
    .join('|');

/** iOS block recipe; empty parts are skipped, order re-indexed. */
export const buildMistakeBlocks = (payload: MistakePayload): GrammarNoteBlock[] => {
  const blocks: Omit<GrammarNoteBlock, 'order'>[] = [
    { id: crypto.randomUUID(), type: 'heading', text: 'Mistake', items: [] },
  ];
  const original = collapse(payload.original);
  const corrected = collapse(payload.corrected);
  const explanation = collapse(payload.explanation);
  if (original.length > 0) {
    blocks.push({ id: crypto.randomUUID(), type: 'quote', text: original, items: [] });
  }
  if (corrected.length > 0) {
    blocks.push({ id: crypto.randomUUID(), type: 'example', text: corrected, items: [] });
  }
  if (explanation.length > 0) {
    blocks.push({ id: crypto.randomUUID(), type: 'paragraph', text: explanation, items: [] });
  }
  return blocks.map((b, order) => ({ ...b, order }));
};

export const buildMistakeNote = (
  payload: MistakePayload,
  params: { ownerUID: string; topicId: string; now?: number },
): GrammarNote => {
  const now = params.now ?? Date.now();
  const original = collapse(payload.original);
  const corrected = collapse(payload.corrected);
  const explanation = collapse(payload.explanation);
  const preview = corrected || explanation || original;
  return {
    id: crypto.randomUUID(),
    ownerUID: params.ownerUID,
    topicId: params.topicId,
    title: (original || corrected).slice(0, 50),
    noteType: 'mistake',
    previewText: preview.slice(0, 180),
    contentBlocks: buildMistakeBlocks(payload),
    savedIssueKey: buildSavedIssueKey(payload),
    createdAt: now,
    updatedAt: now,
  };
};

/** Ensure the Common Mistakes topic, dedup by savedIssueKey, create the note,
    bump notesCount, and queue the spaced-review item. */
export const saveMistake = async (
  payload: MistakePayload,
  uid: string,
): Promise<SaveMistakeOutcome> => {
  const topic = await topicService.ensureMistakesTopic(uid);
  const key = buildSavedIssueKey(payload);

  const existing = await noteService.fetchNoteBySavedIssueKey(uid, topic.id, key);
  if (existing) return { status: 'duplicate', note: existing, topicId: topic.id };

  const note = buildMistakeNote(payload, { ownerUID: uid, topicId: topic.id });
  await noteService.createNote(note);

  const currentNotes = await noteService.fetchNotes(uid, topic.id).catch(() => null);
  if (currentNotes) {
    await topicService.setNotesCount(uid, topic.id, currentNotes.length).catch(() => {});
  }

  /* iOS: saved mistakes go to spaced review, high priority, due in 1h. */
  await upsertReviewItem(
    makeReviewItem({
      id: reviewItemIdForMistake(topic.id, note.id),
      ownerUID: uid,
      sourceType: 'mistake',
      topicId: topic.id,
      noteId: note.id,
      title: note.title,
      previewText: note.previewText,
      priority: 'high',
      dueAt: Date.now() + 60 * 60 * 1000,
    }),
  ).catch(() => {});

  return { status: 'saved', note, topicId: topic.id };
};
