/* Factories for the Notes domain objects. Every writer (quick note, quick
   mistake, templates, the editor) goes through these so a new field can never
   be forgotten at one call site — the web equivalent of iOS constructing
   GrammarNote/GrammarNoteTopic with explicit defaults. */
import { makePlainText, makeSearchableText } from '@/lib/grammarSearch';
import type { GrammarNote, GrammarNoteBlock, GrammarNoteTopic } from '@/lib/models';

export interface NoteDraft {
  ownerUID: string;
  topicId: string;
  title: string;
  previewText?: string;
  contentBlocks?: GrammarNoteBlock[];
  noteType?: GrammarNote['noteType'];
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
  isMistakeNote?: boolean;
  languageCode?: string;
  languageName?: string;
  hasQuiz?: boolean;
  savedIssueKey?: string;
  sortIndex?: number;
  templateId?: string;
  id?: string;
  now?: number;
}

export const makeGrammarNote = (draft: NoteDraft): GrammarNote => {
  const now = draft.now ?? Date.now();
  const contentBlocks = draft.contentBlocks ?? [];
  const noteType = draft.noteType ?? 'standard';
  const tags = draft.tags ?? [];
  const title = draft.title;
  const previewText = draft.previewText ?? '';
  const plainTextContent = makePlainText(contentBlocks);
  return {
    id: draft.id ?? crypto.randomUUID(),
    ownerUID: draft.ownerUID,
    topicId: draft.topicId,
    title,
    noteType,
    previewText,
    contentBlocks,
    tags,
    isPinned: draft.isPinned ?? false,
    isFavorite: draft.isFavorite ?? false,
    isMistakeNote: draft.isMistakeNote ?? noteType === 'mistake',
    languageCode: draft.languageCode ?? '',
    languageName: draft.languageName ?? '',
    plainTextContent,
    searchableText: makeSearchableText({
      title,
      previewText,
      tags,
      noteType,
      blocks: contentBlocks,
      plainTextContent,
    }),
    hasQuiz: draft.hasQuiz ?? contentBlocks.some((b) => b.type === 'quiz'),
    savedIssueKey: draft.savedIssueKey,
    sortIndex: draft.sortIndex,
    templateId: draft.templateId,
    createdAt: now,
    updatedAt: now,
    lastEditedAt: now,
  };
};

export interface TopicDraft {
  ownerUID: string;
  title: string;
  description?: string;
  icon?: string;
  colorHex?: string;
  languageCode?: string;
  languageName?: string;
  isPinned?: boolean;
  isMistakesTopic?: boolean;
  notesCount?: number;
  sortIndex?: number;
  id?: string;
  now?: number;
}

export const makeGrammarTopic = (draft: TopicDraft): GrammarNoteTopic => {
  const now = draft.now ?? Date.now();
  return {
    id: draft.id ?? crypto.randomUUID(),
    ownerUID: draft.ownerUID,
    title: draft.title,
    description: draft.description ?? '',
    icon: draft.icon ?? 'book.pages.fill',
    colorHex: draft.colorHex ?? '#4F7CFF',
    languageCode: draft.languageCode ?? '',
    languageName: draft.languageName ?? '',
    notesCount: draft.notesCount ?? 0,
    isPinned: draft.isPinned ?? false,
    isMistakesTopic: draft.isMistakesTopic ?? false,
    sortIndex: draft.sortIndex,
    createdAt: now,
    updatedAt: now,
  };
};
