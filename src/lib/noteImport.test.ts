import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  htmlToDrafts,
  importNoteFile,
  markdownToNote,
  NoteImportError,
  stripInlineMarkdown,
} from './noteImport';

const shape = (blocks: { type: string; text: string; items: string[] }[]) =>
  blocks.map((b) => (b.items.length > 0 ? { type: b.type, items: b.items } : { type: b.type, text: b.text }));

describe('stripInlineMarkdown', () => {
  it('keeps the words and drops the markup', () => {
    expect(stripInlineMarkdown('Use **ser** for _identity_, see [this](http://x) and `code`')).toBe(
      'Use ser for identity, see this and code',
    );
    expect(stripInlineMarkdown('![pic](a.png) text')).toBe('text');
  });
});

describe('markdownToNote', () => {
  it('maps the structure to note blocks and takes the first H1 as the title', () => {
    const md = [
      '# Ser vs estar',
      '',
      'Both mean **to be**.',
      'They are not interchangeable.',
      '',
      '## Ser',
      '- identity',
      '- origin',
      '',
      '1. first',
      '2. second',
      '',
      '- [ ] learn',
      '- [x] practise',
      '',
      '> Soy de Kyiv.',
      '',
      '---',
      '',
      '| form | use |',
      '| --- | --- |',
      '| ser | identity |',
    ].join('\n');
    const note = markdownToNote(md, 'file.md');
    expect(note.title).toBe('Ser vs estar');
    expect(shape(note.blocks)).toEqual([
      { type: 'paragraph', text: 'Both mean to be. They are not interchangeable.' },
      { type: 'subheading', text: 'Ser' },
      { type: 'bulletList', items: ['identity', 'origin'] },
      { type: 'numberedList', items: ['first', 'second'] },
      { type: 'checklist', items: ['learn', 'practise'] },
      { type: 'quote', text: 'Soy de Kyiv.' },
      { type: 'divider', text: '' },
      { type: 'paragraph', text: 'form | use' },
      { type: 'paragraph', text: 'ser | identity' },
    ]);
    expect(note.blocks.map((b) => b.order)).toEqual(note.blocks.map((_, i) => i));
  });

  it('falls back to the file name when the document has no top heading', () => {
    expect(markdownToNote('Just text', 'My notes.md').title).toBe('My notes');
  });

  it('keeps fenced code verbatim and ignores front matter', () => {
    const note = markdownToNote('---\ntitle: x\n---\n```\nyo soy\n  tú eres\n```', 'a.md');
    expect(shape(note.blocks)).toEqual([{ type: 'paragraph', text: 'yo soy\n  tú eres' }]);
  });
});

describe('htmlToDrafts (Word via mammoth)', () => {
  it('maps headings, lists, quotes, tables and paragraphs', () => {
    const html =
      '<h1>Title</h1><p>Intro <strong>bold</strong></p><h3>Sub</h3>' +
      '<ul><li>a<ul><li>a1</li></ul></li><li>b</li></ul><ol><li>one</li></ol>' +
      '<blockquote><p>Quoted</p></blockquote><table><tr><td>x</td><td>y</td></tr></table><p> </p>';
    expect(shape(htmlToDrafts(html))).toEqual([
      { type: 'heading', text: 'Title' },
      { type: 'paragraph', text: 'Intro bold' },
      { type: 'subheading', text: 'Sub' },
      { type: 'bulletList', items: ['a', 'a1', 'b'] },
      { type: 'numberedList', items: ['one'] },
      { type: 'quote', text: 'Quoted' },
      { type: 'paragraph', text: 'x | y' },
    ]);
  });
});

describe('importNoteFile', () => {
  const file = (name: string, content: string) => new File([content], name);

  it('reads a markdown file', async () => {
    const note = await importNoteFile(file('rules.md', '# Rules\n\nAlways *agree*.'));
    expect(note.title).toBe('Rules');
    expect(note.blocks[0].text).toBe('Always agree.');
  });

  it('rejects unsupported and empty files with a code', async () => {
    await expect(importNoteFile(file('old.doc', 'x'))).rejects.toMatchObject({ code: 'unsupported' });
    await expect(importNoteFile(file('blank.md', '\n\n'))).rejects.toBeInstanceOf(NoteImportError);
  });

  it('reads a real Word document: Heading 1 → title, Heading 2 → subheading, Quote style → quote', async () => {
    const bytes = readFileSync(resolve(__dirname, '__fixtures__/note-import.docx'));
    const note = await importNoteFile(new File([bytes], 'Present perfect.docx'));
    expect(note.title).toBe('Present Perfect');
    expect(shape(note.blocks)).toEqual([
      { type: 'paragraph', text: 'We use it for life experience.' },
      { type: 'subheading', text: 'Form' },
      { type: 'paragraph', text: 'have/has + past participle' },
      { type: 'quote', text: 'I have never been to Spain.' },
    ]);
  });

  it('reports a broken .docx as unreadable instead of throwing something else', async () => {
    await expect(importNoteFile(file('broken.docx', 'not a zip'))).rejects.toMatchObject({
      code: 'unreadable',
    });
  });
});
