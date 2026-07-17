import { describe, expect, it } from 'vitest';

import { EDITOR_BLOCK_TYPES } from './grammarMeta';
import {
  filterNoteTemplates,
  filterTopicTemplates,
  NOTE_TEMPLATES,
  noteFromTemplate,
  TOPIC_TEMPLATES,
  topicFromTemplate,
} from './grammarTemplates';

describe('template data sanity', () => {
  it('7 note templates + 5 topic templates with unique ids', () => {
    expect(NOTE_TEMPLATES).toHaveLength(7);
    expect(TOPIC_TEMPLATES).toHaveLength(5);
    const noteIds = NOTE_TEMPLATES.map((t) => t.id);
    expect(new Set(noteIds).size).toBe(noteIds.length);
    const topicIds = TOPIC_TEMPLATES.map((t) => t.id);
    expect(new Set(topicIds).size).toBe(topicIds.length);
  });

  it('every block uses a valid web block type (iOS-only types mapped down)', () => {
    const allTemplates = [
      ...NOTE_TEMPLATES,
      ...TOPIC_TEMPLATES.flatMap((t) => t.noteTemplates),
    ];
    for (const tpl of allTemplates) {
      for (const block of tpl.blocks) {
        expect(EDITOR_BLOCK_TYPES).toContain(block.type);
      }
    }
  });

  it('each language topic pack has 5 notes; blank topic has none', () => {
    const blank = TOPIC_TEMPLATES.find((t) => t.id === 'topic-custom-blank')!;
    expect(blank.noteTemplates).toHaveLength(0);
    for (const t of TOPIC_TEMPLATES.filter((t) => t.id !== 'topic-custom-blank')) {
      expect(t.noteTemplates).toHaveLength(5);
    }
  });
});

describe('filters', () => {
  it('language filter keeps language-less templates (iOS semantics)', () => {
    const es = filterTopicTemplates({ languageCode: 'es' });
    expect(es.map((t) => t.id)).toEqual(['topic-spanish-a1-essentials', 'topic-custom-blank']);
    // Note templates carry no languageCode → all pass any language filter.
    expect(filterNoteTemplates({ languageCode: 'de' })).toHaveLength(7);
  });

  it('difficulty filter is case-insensitive', () => {
    expect(filterTopicTemplates({ difficulty: 'a2' }).map((t) => t.id)).toEqual([
      'topic-english-tenses-pack',
      'topic-german-cases-starter',
    ]);
  });

  it('search matches title/description/tags', () => {
    expect(filterNoteTemplates({ query: 'soup' }).map((t) => t.id)).toEqual(['comparison']);
    expect(filterTopicTemplates({ query: 'tenses' })[0].id).toBe('topic-english-tenses-pack');
    expect(filterNoteTemplates({ query: 'cheat' }).map((t) => t.id)).toEqual(['cheat-sheet']);
  });
});

describe('instantiation', () => {
  it('noteFromTemplate: fresh ids, ordered blocks, derived preview', () => {
    const tpl = NOTE_TEMPLATES.find((t) => t.id === 'grammar-rule')!;
    const a = noteFromTemplate(tpl, { ownerUID: 'u1', topicId: 't1', now: 1000 });
    const b = noteFromTemplate(tpl, { ownerUID: 'u1', topicId: 't1', now: 1000 });
    expect(a.id).not.toBe(b.id);
    expect(a.contentBlocks.map((x) => x.order)).toEqual([0, 1, 2, 3, 4]);
    expect(a.contentBlocks[0].id).not.toBe(b.contentBlocks[0].id);
    expect(a.noteType).toBe('rule');
    expect(a.previewText.length).toBeGreaterThan(0);
    expect(a.createdAt).toBe(1000);
  });

  it('bulletList template blocks keep their items', () => {
    const tpl = NOTE_TEMPLATES.find((t) => t.id === 'cheat-sheet')!;
    const note = noteFromTemplate(tpl, { ownerUID: 'u', topicId: 't' });
    const list = note.contentBlocks.find((b) => b.type === 'bulletList')!;
    expect(list.items).toEqual(['Key rule', 'Useful pattern', 'Common exception']);
  });

  it('topicFromTemplate: fresh id, iOS icon/color, notesCount 0', () => {
    const tpl = TOPIC_TEMPLATES.find((t) => t.id === 'topic-spanish-a1-essentials')!;
    const topic = topicFromTemplate(tpl, { ownerUID: 'u1', now: 2000 });
    expect(topic.title).toBe('Spanish A1 Essentials');
    expect(topic.icon).toBe('text.book.closed.fill');
    expect(topic.colorHex).toBe('#FF7B54');
    expect(topic.notesCount).toBe(0);
    expect(topic.isMistakesTopic).toBe(false);
  });
});
