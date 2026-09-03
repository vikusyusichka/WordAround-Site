/* Pure reducer for the grammar-note block editor. Holds the note being
   written (title + type + tags + language + ordered content blocks); the route
   hook wraps it and persists on Save. No I/O here, so it's fully
   unit-testable. */
import { isListBlock, SECONDARY_BLOCK_TYPES } from '@/lib/grammarMeta';
import { makePlainText, makeSearchableText } from '@/lib/grammarSearch';
import type {
  GrammarBlockType,
  GrammarNote,
  GrammarNoteBlock,
  GrammarNoteType,
} from '@/lib/models';

export interface EditorState {
  title: string;
  noteType: GrammarNoteType;
  blocks: GrammarNoteBlock[];
  tags: string[];
  languageCode: string;
  languageName: string;
  isPinned: boolean;
  isFavorite: boolean;
}

export type EditorAction =
  | { type: 'SET_TITLE'; value: string }
  | { type: 'SET_NOTE_TYPE'; value: GrammarNoteType }
  | { type: 'SET_LANGUAGE'; code: string; name: string }
  | { type: 'ADD_TAG'; value: string }
  | { type: 'REMOVE_TAG'; value: string }
  | { type: 'TOGGLE_PINNED' }
  | { type: 'TOGGLE_FAVORITE' }
  | { type: 'ADD_BLOCK'; blockType: GrammarBlockType }
  | {
      type: 'UPDATE_BLOCK';
      id: string;
      patch: Partial<Pick<GrammarNoteBlock, 'text' | 'secondaryText' | 'imageURL' | 'imageCaption'>>;
    }
  | { type: 'DELETE_BLOCK'; id: string }
  | { type: 'MOVE_BLOCK'; id: string; dir: 'up' | 'down' }
  | { type: 'ADD_LIST_ITEM'; id: string }
  | { type: 'UPDATE_LIST_ITEM'; id: string; index: number; value: string }
  | { type: 'REMOVE_LIST_ITEM'; id: string; index: number }
  /* 4D4 templates: blocks arrive pre-materialized (fresh ids) via
     blocksFromTemplate. `replace` swaps everything + adopts the template's
     noteType and title (when the editor title is empty); `append` keeps
     what's there and adds the template blocks below. */
  | {
      type: 'APPLY_TEMPLATE';
      blocks: GrammarNoteBlock[];
      noteType: GrammarNoteType;
      title?: string;
      tags?: string[];
      mode: 'replace' | 'append';
    };

/** New block with per-type defaults. */
export const makeBlock = (type: GrammarBlockType, order: number): GrammarNoteBlock => ({
  id: crypto.randomUUID(),
  type,
  text: '',
  secondaryText: SECONDARY_BLOCK_TYPES.includes(type) ? '' : undefined,
  items: isListBlock(type) ? [''] : [],
  imageCaption: type === 'image' ? '' : undefined,
  order,
});

export const initialEditorState = (note?: GrammarNote): EditorState =>
  note
    ? {
        title: note.title,
        noteType: note.noteType,
        blocks: [...note.contentBlocks],
        tags: [...note.tags],
        languageCode: note.languageCode,
        languageName: note.languageName,
        isPinned: note.isPinned,
        isFavorite: note.isFavorite,
      }
    : {
        title: '',
        noteType: 'standard',
        blocks: [makeBlock('heading', 0), makeBlock('paragraph', 1)],
        tags: [],
        languageCode: '',
        languageName: '',
        isPinned: false,
        isFavorite: false,
      };

/* MARK: - Selectors */

/** First non-empty heading/paragraph text, trimmed to ~140 chars — used as
    the note-row preview. Falls back to the title. */
export const derivePreviewText = (state: EditorState): string => {
  const source =
    state.blocks.find(
      (b) =>
        (b.type === 'paragraph' || b.type === 'heading' || b.type === 'rule') &&
        b.text.trim().length > 0,
    )?.text ?? state.title;
  const clean = source.trim().replace(/\s+/g, ' ');
  return clean.length > 140 ? `${clean.slice(0, 139)}…` : clean;
};

export const isBlank = (state: EditorState): boolean =>
  state.title.trim().length === 0 &&
  state.blocks.every(
    (b) =>
      b.text.trim().length === 0 &&
      b.items.every((i) => i.trim().length === 0) &&
      !b.imageURL,
  );

/** Rebuild the persisted note from editor state (order re-indexed, search
    index and plain text regenerated — iOS does both on every save). */
export const toNote = (
  state: EditorState,
  base: Pick<GrammarNote, 'id' | 'ownerUID' | 'topicId' | 'createdAt'> &
    Partial<Pick<GrammarNote, 'hasQuiz' | 'savedIssueKey' | 'sortIndex' | 'templateId'>>,
  now: number = Date.now(),
): GrammarNote => {
  const blocks = state.blocks.map((b, i) => ({ ...b, order: i }));
  const title = state.title.trim() || 'Untitled note';
  const previewText = derivePreviewText(state);
  const tags = state.tags.map((tg) => tg.trim()).filter((tg) => tg.length > 0);
  const plainTextContent = makePlainText(blocks);
  return {
    ...base,
    title,
    noteType: state.noteType,
    previewText,
    contentBlocks: blocks,
    tags,
    isPinned: state.isPinned,
    isFavorite: state.isFavorite,
    isMistakeNote: state.noteType === 'mistake',
    languageCode: state.languageCode,
    languageName: state.languageName,
    plainTextContent,
    searchableText: makeSearchableText({
      title,
      previewText,
      tags,
      noteType: state.noteType,
      blocks,
      plainTextContent,
    }),
    hasQuiz: base.hasQuiz ?? blocks.some((b) => b.type === 'quiz'),
    updatedAt: now,
    lastEditedAt: now,
  };
};

/* MARK: - Reducer */

const reindex = (blocks: GrammarNoteBlock[]): GrammarNoteBlock[] =>
  blocks.map((b, i) => ({ ...b, order: i }));

const patchBlock = (
  blocks: GrammarNoteBlock[],
  id: string,
  fn: (b: GrammarNoteBlock) => GrammarNoteBlock,
): GrammarNoteBlock[] => blocks.map((b) => (b.id === id ? fn(b) : b));

export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, title: action.value };

    case 'SET_NOTE_TYPE':
      return { ...state, noteType: action.value };

    case 'SET_LANGUAGE':
      return { ...state, languageCode: action.code, languageName: action.name };

    case 'ADD_TAG': {
      const tag = action.value.trim();
      if (tag.length === 0 || state.tags.includes(tag)) return state;
      return { ...state, tags: [...state.tags, tag] };
    }

    case 'REMOVE_TAG':
      return { ...state, tags: state.tags.filter((tg) => tg !== action.value) };

    case 'TOGGLE_PINNED':
      return { ...state, isPinned: !state.isPinned };

    case 'TOGGLE_FAVORITE':
      return { ...state, isFavorite: !state.isFavorite };

    case 'ADD_BLOCK':
      return { ...state, blocks: [...state.blocks, makeBlock(action.blockType, state.blocks.length)] };

    case 'UPDATE_BLOCK':
      return {
        ...state,
        blocks: patchBlock(state.blocks, action.id, (b) => ({ ...b, ...action.patch })),
      };

    case 'DELETE_BLOCK':
      return { ...state, blocks: reindex(state.blocks.filter((b) => b.id !== action.id)) };

    case 'MOVE_BLOCK': {
      const idx = state.blocks.findIndex((b) => b.id === action.id);
      if (idx < 0) return state;
      const target = action.dir === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= state.blocks.length) return state;
      const next = [...state.blocks];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...state, blocks: reindex(next) };
    }

    case 'ADD_LIST_ITEM':
      return {
        ...state,
        blocks: patchBlock(state.blocks, action.id, (b) => ({ ...b, items: [...b.items, ''] })),
      };

    case 'UPDATE_LIST_ITEM':
      return {
        ...state,
        blocks: patchBlock(state.blocks, action.id, (b) => ({
          ...b,
          items: b.items.map((it, i) => (i === action.index ? action.value : it)),
        })),
      };

    case 'REMOVE_LIST_ITEM':
      return {
        ...state,
        blocks: patchBlock(state.blocks, action.id, (b) => ({
          ...b,
          items: b.items.filter((_, i) => i !== action.index),
        })),
      };

    case 'APPLY_TEMPLATE': {
      const tags = action.tags ? [...new Set([...state.tags, ...action.tags])] : state.tags;
      if (action.mode === 'replace') {
        return {
          ...state,
          title: state.title.trim().length > 0 ? state.title : (action.title ?? state.title),
          noteType: action.noteType,
          tags,
          blocks: reindex(action.blocks),
        };
      }
      return { ...state, tags, blocks: reindex([...state.blocks, ...action.blocks]) };
    }

    default:
      return state;
  }
};
