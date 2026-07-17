import { describe, expect, it } from 'vitest';

import {
  derivePreviewText,
  editorReducer,
  initialEditorState,
  isBlank,
  makeBlock,
  toNote,
  type EditorState,
} from './grammarNoteEditor';

const run = (s: EditorState, ...actions: Parameters<typeof editorReducer>[1][]) =>
  actions.reduce((acc, a) => editorReducer(acc, a), s);

describe('initialEditorState', () => {
  it('blank state seeds a heading + a paragraph', () => {
    const s = initialEditorState();
    expect(s.title).toBe('');
    expect(s.noteType).toBe('standard');
    expect(s.blocks.map((b) => b.type)).toEqual(['heading', 'paragraph']);
  });

  it('seeds from an existing note', () => {
    const s = initialEditorState({
      id: 'n', ownerUID: 'u', topicId: 't', title: 'T', noteType: 'rule',
      previewText: '', contentBlocks: [makeBlock('quote', 0)], createdAt: 0, updatedAt: 0,
    });
    expect(s.title).toBe('T');
    expect(s.noteType).toBe('rule');
    expect(s.blocks).toHaveLength(1);
  });
});

describe('makeBlock defaults', () => {
  it('bulletList starts with one empty item', () => {
    expect(makeBlock('bulletList', 0).items).toEqual(['']);
  });
  it('example/rule get an empty secondaryText, others undefined', () => {
    expect(makeBlock('example', 0).secondaryText).toBe('');
    expect(makeBlock('rule', 0).secondaryText).toBe('');
    expect(makeBlock('paragraph', 0).secondaryText).toBeUndefined();
  });
});

describe('title + type', () => {
  it('SET_TITLE / SET_NOTE_TYPE update', () => {
    const s = run(initialEditorState(), { type: 'SET_TITLE', value: 'Ser vs Estar' }, { type: 'SET_NOTE_TYPE', value: 'rule' });
    expect(s.title).toBe('Ser vs Estar');
    expect(s.noteType).toBe('rule');
  });
});

describe('block CRUD', () => {
  const base = () => ({ title: '', noteType: 'standard' as const, blocks: [makeBlock('paragraph', 0)] });

  it('ADD_BLOCK appends with the right order', () => {
    const s = editorReducer(base(), { type: 'ADD_BLOCK', blockType: 'example' });
    expect(s.blocks).toHaveLength(2);
    expect(s.blocks[1].type).toBe('example');
    expect(s.blocks[1].order).toBe(1);
  });

  it('UPDATE_BLOCK patches text + secondaryText', () => {
    const s0 = base();
    const id = s0.blocks[0].id;
    const s = editorReducer(s0, { type: 'UPDATE_BLOCK', id, patch: { text: 'hi', secondaryText: 'yo' } });
    expect(s.blocks[0].text).toBe('hi');
    expect(s.blocks[0].secondaryText).toBe('yo');
  });

  it('DELETE_BLOCK removes + reindexes', () => {
    const s0 = run(base(), { type: 'ADD_BLOCK', blockType: 'quote' }, { type: 'ADD_BLOCK', blockType: 'warning' });
    const mid = s0.blocks[1].id;
    const s = editorReducer(s0, { type: 'DELETE_BLOCK', id: mid });
    expect(s.blocks).toHaveLength(2);
    expect(s.blocks.map((b) => b.order)).toEqual([0, 1]);
    expect(s.blocks.map((b) => b.type)).toEqual(['paragraph', 'warning']);
  });

  it('MOVE_BLOCK up/down swaps + reindexes; clamps at ends', () => {
    const s0 = run(base(), { type: 'ADD_BLOCK', blockType: 'quote' });
    const first = s0.blocks[0].id;
    const last = s0.blocks[1].id;
    // move last up
    const up = editorReducer(s0, { type: 'MOVE_BLOCK', id: last, dir: 'up' });
    expect(up.blocks[0].type).toBe('quote');
    expect(up.blocks.map((b) => b.order)).toEqual([0, 1]);
    // move first up = clamp no-op
    const clamp = editorReducer(s0, { type: 'MOVE_BLOCK', id: first, dir: 'up' });
    expect(clamp).toBe(s0);
    // move last down = clamp no-op
    const clamp2 = editorReducer(s0, { type: 'MOVE_BLOCK', id: last, dir: 'down' });
    expect(clamp2).toBe(s0);
  });
});

describe('list items', () => {
  const withList = () => ({
    title: '', noteType: 'standard' as const, blocks: [makeBlock('bulletList', 0)],
  });

  it('ADD/UPDATE/REMOVE list item', () => {
    const s0 = withList();
    const id = s0.blocks[0].id;
    let s = editorReducer(s0, { type: 'ADD_LIST_ITEM', id });
    expect(s.blocks[0].items).toEqual(['', '']);
    s = editorReducer(s, { type: 'UPDATE_LIST_ITEM', id, index: 0, value: 'ser = identity' });
    expect(s.blocks[0].items[0]).toBe('ser = identity');
    s = editorReducer(s, { type: 'REMOVE_LIST_ITEM', id, index: 1 });
    expect(s.blocks[0].items).toEqual(['ser = identity']);
  });
});

describe('derivePreviewText', () => {
  it('uses the first non-empty paragraph/heading/rule text', () => {
    const s: EditorState = {
      title: 'T', noteType: 'standard',
      blocks: [
        { ...makeBlock('heading', 0), text: '' },
        { ...makeBlock('paragraph', 1), text: 'Use ser for identity and estar for state.' },
      ],
    };
    expect(derivePreviewText(s)).toBe('Use ser for identity and estar for state.');
  });

  it('falls back to the title when all blocks are empty', () => {
    const s: EditorState = { title: 'My title', noteType: 'standard', blocks: [makeBlock('paragraph', 0)] };
    expect(derivePreviewText(s)).toBe('My title');
  });

  it('truncates long text to ~140 chars with an ellipsis', () => {
    const long = 'a'.repeat(200);
    const s: EditorState = { title: '', noteType: 'standard', blocks: [{ ...makeBlock('paragraph', 0), text: long }] };
    const out = derivePreviewText(s);
    expect(out.length).toBe(140);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('isBlank + toNote', () => {
  it('isBlank true for an empty seeded note, false once text is added', () => {
    const s = initialEditorState();
    expect(isBlank(s)).toBe(true);
    const filled = editorReducer(s, { type: 'SET_TITLE', value: 'Hi' });
    expect(isBlank(filled)).toBe(false);
  });

  it('toNote reindexes blocks + derives preview + defaults blank title', () => {
    const s = run(
      initialEditorState(),
      { type: 'UPDATE_BLOCK', id: initialEditorState().blocks[0].id, patch: { text: 'x' } },
    );
    const note = toNote({ ...s, title: '' }, { id: 'n', ownerUID: 'u', topicId: 't', createdAt: 5 });
    expect(note.title).toBe('Untitled note');
    expect(note.createdAt).toBe(5);
    expect(note.contentBlocks.map((b) => b.order)).toEqual(note.contentBlocks.map((_, i) => i));
  });
});

describe('APPLY_TEMPLATE (4D4)', () => {
  const templateBlocks = [
    makeBlock('rule', 0),
    makeBlock('example', 1),
  ];

  it('replace swaps blocks, adopts noteType, and takes the template title only when empty', () => {
    const dirty: EditorState = {
      title: 'My title',
      noteType: 'standard',
      blocks: [makeBlock('paragraph', 0)],
    };
    const replaced = editorReducer(dirty, {
      type: 'APPLY_TEMPLATE', blocks: templateBlocks, noteType: 'rule', title: 'Tpl title', mode: 'replace',
    });
    expect(replaced.title).toBe('My title'); // kept — was non-empty
    expect(replaced.noteType).toBe('rule');
    expect(replaced.blocks.map((b) => b.type)).toEqual(['rule', 'example']);
    expect(replaced.blocks.map((b) => b.order)).toEqual([0, 1]);

    const blank: EditorState = { title: '  ', noteType: 'standard', blocks: [] };
    const seeded = editorReducer(blank, {
      type: 'APPLY_TEMPLATE', blocks: templateBlocks, noteType: 'rule', title: 'Tpl title', mode: 'replace',
    });
    expect(seeded.title).toBe('Tpl title'); // adopted — was blank
  });

  it('append keeps current blocks and re-orders the combined list', () => {
    const s: EditorState = {
      title: 'T',
      noteType: 'standard',
      blocks: [makeBlock('paragraph', 0)],
    };
    const appended = editorReducer(s, {
      type: 'APPLY_TEMPLATE', blocks: templateBlocks, noteType: 'rule', mode: 'append',
    });
    expect(appended.noteType).toBe('standard'); // unchanged on append
    expect(appended.blocks.map((b) => b.type)).toEqual(['paragraph', 'rule', 'example']);
    expect(appended.blocks.map((b) => b.order)).toEqual([0, 1, 2]);
  });
});
