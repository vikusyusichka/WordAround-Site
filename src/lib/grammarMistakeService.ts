/* Save a grammar mistake as a note — web port of GrammarMistakeSaveService /
   SaveQuickGrammarMistakeUseCase. Composes the iOS block recipe (heading
   "Mistake" · quote original · example corrected · paragraph explanation, each
   part switchable in Notes settings), dedups via savedIssueKey, targets either
   the auto-provisioned Common Mistakes topic or the current topic (the
   "group mistakes by topic" setting), and queues a high-priority review
   item (4D3). */
import { makeGrammarNote } from '@/lib/grammarFactories';
import * as noteService from '@/lib/grammarNoteService';
import * as topicService from '@/lib/grammarTopicService';
import { makeReviewItem, reviewItemIdForMistake } from '@/lib/grammarReview';
import { upsertReviewItem } from '@/lib/grammarReviewService';
import { grammarSettingsSnapshot, type GrammarSettings } from '@/stores/grammarSettingsStore';
import type { GrammarNote, GrammarNoteBlock } from '@/lib/models';

export interface MistakePayload {
  original: string;
  corrected: string;
  explanation: string;
  /** Stable id of the source grammar issue (essay flow); empty for quick saves. */
  sourceIssueId?: string;
  /** Language of the sentence (iOS keeps it on the note + in the dedup key). */
  languageCode?: string;
  languageName?: string;
}

export type SaveMistakeOutcome =
  | { status: 'saved'; note: GrammarNote; topicId: string }
  | { status: 'duplicate'; note: GrammarNote; topicId: string };

const collapse = (s: string) => s.trim().replace(/\s+/g, ' ');

/** Normalized dedup key — lowercased pipe-join of the mistake parts (iOS
    savedIssueKey semantics). */
export const buildSavedIssueKey = (payload: MistakePayload): string =>
  [
    payload.sourceIssueId ?? payload.languageCode ?? '',
    payload.original,
    payload.corrected,
    payload.explanation,
  ]
    .map((part) => collapse(part).toLowerCase())
    .join('|');

/** iOS block recipe; parts switched off in settings (or empty) are skipped,
    order re-indexed. */
export const buildMistakeBlocks = (
  payload: MistakePayload,
  settings: Pick<
    GrammarSettings,
    'includeOriginalSentence' | 'includeCorrectedSentence' | 'createMistakeNotesWithExplanation'
  > = grammarSettingsSnapshot(),
): GrammarNoteBlock[] => {
  const blocks: Omit<GrammarNoteBlock, 'order'>[] = [
    { id: crypto.randomUUID(), type: 'heading', text: 'Mistake', items: [] },
  ];
  const original = collapse(payload.original);
  const corrected = collapse(payload.corrected);
  const explanation = collapse(payload.explanation);
  if (settings.includeOriginalSentence && original.length > 0) {
    blocks.push({ id: crypto.randomUUID(), type: 'quote', text: original, items: [] });
  }
  if (settings.includeCorrectedSentence && corrected.length > 0) {
    blocks.push({ id: crypto.randomUUID(), type: 'example', text: corrected, items: [] });
  }
  if (settings.createMistakeNotesWithExplanation && explanation.length > 0) {
    blocks.push({ id: crypto.randomUUID(), type: 'paragraph', text: explanation, items: [] });
  }
  return blocks.map((b, order) => ({ ...b, order }));
};

export const buildMistakeNote = (
  payload: MistakePayload,
  params: { ownerUID: string; topicId: string; now?: number; settings?: GrammarSettings },
): GrammarNote => {
  const settings = params.settings ?? grammarSettingsSnapshot();
  const original = collapse(payload.original);
  const corrected = collapse(payload.corrected);
  const explanation = collapse(payload.explanation);
  /* iOS preview precedence: corrected (when kept) → explanation → original. */
  const preview =
    (settings.includeCorrectedSentence && corrected) || explanation || original;
  return makeGrammarNote({
    ownerUID: params.ownerUID,
    topicId: params.topicId,
    title: (original || corrected).slice(0, 50),
    noteType: 'mistake',
    previewText: preview.slice(0, 180),
    contentBlocks: buildMistakeBlocks(payload, settings),
    tags: ['mistake', ...(payload.languageName ? [payload.languageName] : [])],
    isMistakeNote: true,
    languageCode: payload.languageCode ?? '',
    languageName: payload.languageName ?? '',
    savedIssueKey: buildSavedIssueKey(payload),
    now: params.now,
  });
};

/** Resolve the target topic, dedup by savedIssueKey, create the note, sync
    notesCount, and queue the spaced-review item. `topicId` targets a specific
    topic (used when "group mistakes by topic" is on). */
export const saveMistake = async (
  payload: MistakePayload,
  uid: string,
  options: { topicId?: string; settings?: GrammarSettings } = {},
): Promise<SaveMistakeOutcome> => {
  const settings = options.settings ?? grammarSettingsSnapshot();
  const topic =
    settings.groupMistakesByTopic && options.topicId
      ? { id: options.topicId }
      : await topicService.ensureMistakesTopic(uid);
  const key = buildSavedIssueKey(payload);

  const existing = await noteService.fetchNoteBySavedIssueKey(uid, topic.id, key);
  if (existing) return { status: 'duplicate', note: existing, topicId: topic.id };

  const note = buildMistakeNote(payload, { ownerUID: uid, topicId: topic.id, settings });
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
