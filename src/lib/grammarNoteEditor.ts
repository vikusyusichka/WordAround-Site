/* Pure reducer for the grammar-note block editor. Holds the note being
   written (title + type + ordered content blocks); the route hook wraps it
   and persists on Save. No I/O here, so it's fully unit-testable. */
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
}

export type EditorAction =
  | { type: 'SET_TITLE'; value: string }
  | { type: 'SET_NOTE_TYPE'; value: GrammarNoteType }
  | { type: 'ADD_BLOCK'; blockType: GrammarBlockType }
  | { type: 'UPDATE_BLOCK'; id: string; patch: Partial<Pick<GrammarNoteBlock, 'text' | 'secondaryText'>> }
  | { type: 'DELETE_BLOCK'; id: string }
  | { type: 'MOVE_BLOCK'; id: string; dir: 'up' | 'down' }
  | { type: 'ADD_LIST_ITEM'; id: string }
  | { type: 'UPDATE_LIST_ITEM'; id: string; index: number; value: string }
  | { type: 'REMOVE_LIST_ITEM'; id: string; index: number };

/** New block with per-type defaults. */
export const makeBlock = (type: GrammarBlockType, order: number): GrammarNoteBlock => ({
  id: crypto.randomUUID(),
  type,
  text: '',
  secondaryText: type === 'example' || type === 'rule' ? '' : undefined,
  items: type === 'bulletList' ? [''] : [],
  order,
});

export const initialEditorState = (note?: GrammarNote): EditorState =>
  note
    ? { title: note.title, noteType: note.noteType, blocks: [...note.contentBlocks] }
    : {
        title: '',
        noteType: 'standard',
        blocks: [makeBlock('heading', 0), makeBlock('paragraph', 1)],
      };

/* MARK: - Selectors */

/** First non-empty heading/paragraph text, trimmed to ~140 chars — used as
    the note-row preview. Falls back to the title. */
export const derivePreviewText = (state: EditorState): string => {
  const source =
    state.blocks.find(
      (b) => (b.type === 'paragraph' || b.type === 'heading' || b.type === 'rule') && b.text.trim().length > 0,
    )?.text ?? state.title;
  const clean = source.trim().replace(/\s+/g, ' ');
  return clean.length > 140 ? `${clean.slice(0, 139)}…` : clean;
};

export const isBlank = (state: EditorState): boolean =>
  state.title.trim().length === 0 &&
  state.blocks.every(
    (b) => b.text.trim().length === 0 && b.items.every((i) => i.trim().length === 0),
  );

/** Rebuild the persisted note from editor state (order re-indexed). */
export const toNote = (
  state: EditorState,
  base: Pick<GrammarNote, 'id' | 'ownerUID' | 'topicId' | 'createdAt'>,
): GrammarNote => ({
  ...base,
  title: state.title.trim() || 'Untitled note',
  noteType: state.noteType,
  previewText: derivePreviewText(state),
  contentBlocks: state.blocks.map((b, i) => ({ ...b, order: i })),
  updatedAt: Date.now(),
});

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

    default:
      return state;
  }
};
