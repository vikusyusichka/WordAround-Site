/* Import a Word (.docx) or Markdown (.md) file into a grammar note.

   Both formats end up as the note's own blocks, so an imported note is an
   ordinary note: editable, searchable, reviewable. The mapping keeps the
   document's structure and drops what a note cannot hold:

     Markdown / Word          → note block
     # / Heading 1            → heading
     ## … / Heading 2–6       → subheading
     paragraph                → paragraph
     - item / bulleted list   → bulletList
     1. item / numbered list  → numberedList
     - [ ] item               → checklist
     > quote / quote style    → quote
     --- / horizontal rule    → divider
     table                    → one paragraph per row, cells joined by " | "
     ``` code ```             → paragraph (verbatim)
     images, comments         → dropped

   Inline formatting (bold, italics, links) is flattened to plain text: note
   blocks hold plain text. The first top-level heading becomes the note title
   when the note has none. Word is read in the browser by mammoth; nothing is
   uploaded. */
import type { GrammarBlockType, GrammarNoteBlock } from '@/lib/models';

export interface ImportedNote {
  /** First top-level heading, or the file name — for an untitled note. */
  title: string;
  blocks: GrammarNoteBlock[];
}

export type NoteImportErrorCode = 'unsupported' | 'tooLarge' | 'empty' | 'unreadable';

export class NoteImportError extends Error {
  readonly code: NoteImportErrorCode;
  constructor(code: NoteImportErrorCode) {
    super(code);
    this.code = code;
  }
}

export const NOTE_IMPORT_ACCEPT = '.docx,.md,.markdown,.txt';
const MAX_BYTES = 10 * 1024 * 1024;
/* A note is a page, not a book: a 300-page manual imported whole would be
   unusable in the block editor. */
export const MAX_IMPORTED_BLOCKS = 300;

type Draft = { type: GrammarBlockType; text: string; items: string[] };

const block = (type: GrammarBlockType, text: string, items: string[] = []): Draft => ({
  type,
  text,
  items,
});

const toBlocks = (drafts: Draft[]): GrammarNoteBlock[] =>
  drafts.slice(0, MAX_IMPORTED_BLOCKS).map((d, order) => ({
    id: crypto.randomUUID(),
    type: d.type,
    text: d.text,
    /* The block editor expects these fields to exist on these types. */
    secondaryText: undefined,
    items: d.items,
    order,
  }));

/* Title = the first block when it is a top-level heading (removed from the
   body so it is not shown twice), else the file name. */
const withTitle = (drafts: Draft[], fileName: string): ImportedNote => {
  const first = drafts[0];
  const fallback = fileName.replace(/\.[^.]+$/, '').trim();
  if (first && first.type === 'heading' && first.text.length > 0) {
    return { title: first.text.slice(0, 120), blocks: toBlocks(drafts.slice(1)) };
  }
  return { title: fallback.slice(0, 120), blocks: toBlocks(drafts) };
};

/* ---------------------------------------------------------------- Markdown */

/** Strip inline Markdown down to the words a reader sees. */
export const stripInlineMarkdown = (s: string): string =>
  s
    .replace(/!\[[^\]]*]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1') // links → text
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/(\*\*|__)(.+?)\1/g, '$2') // bold
    .replace(/(\*|_)(?=\S)(.+?)(?<=\S)\1/g, '$2') // italics
    .replace(/~~(.+?)~~/g, '$1') // strikethrough
    .replace(/<[^>]+>/g, '') // stray HTML tags
    .replace(/\\([\\`*_{}[\]()#+\-.!>|])/g, '$1') // escapes
    .replace(/\s+/g, ' ')
    .trim();

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const TASK = /^\s*[-*+]\s+\[([ xX])]\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const FENCE = /^\s*(```|~~~)/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

export const markdownToDrafts = (markdown: string): Draft[] => {
  const lines = markdown.replace(/\r\n?/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '').split('\n');
  const out: Draft[] = [];
  let paragraph: string[] = [];
  let list: Draft | null = null;
  let quote: string[] = [];

  const flushParagraph = () => {
    const text = stripInlineMarkdown(paragraph.join(' '));
    if (text) out.push(block('paragraph', text));
    paragraph = [];
  };
  const flushList = () => {
    if (list && list.items.length > 0) out.push(list);
    list = null;
  };
  const flushQuote = () => {
    const text = stripInlineMarkdown(quote.join(' '));
    if (text) out.push(block('quote', text));
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };
  const pushListItem = (type: GrammarBlockType, raw: string) => {
    flushParagraph();
    flushQuote();
    if (!list || list.type !== type) {
      flushList();
      list = block(type, '', []);
    }
    const item = stripInlineMarkdown(raw);
    if (item) (list as Draft).items.push(item);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (FENCE.test(line)) {
      flushAll();
      const code: string[] = [];
      for (i++; i < lines.length && !FENCE.test(lines[i]); i++) code.push(lines[i]);
      const text = code.join('\n').trim();
      if (text) out.push(block('paragraph', text));
      continue;
    }
    if (line.trim() === '') {
      flushAll();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flushAll();
      const text = stripInlineMarkdown(heading[2]);
      if (text) out.push(block(heading[1].length === 1 ? 'heading' : 'subheading', text));
      continue;
    }
    if (RULE.test(line)) {
      flushAll();
      out.push(block('divider', ''));
      continue;
    }
    if (TABLE_ROW.test(line)) {
      flushAll();
      if (TABLE_DIVIDER.test(line)) continue;
      const cells = line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => stripInlineMarkdown(c))
        .filter((c) => c.length > 0);
      if (cells.length > 0) out.push(block('paragraph', cells.join(' | ')));
      continue;
    }
    const task = TASK.exec(line);
    if (task) {
      pushListItem('checklist', task[2]);
      continue;
    }
    const bullet = BULLET.exec(line);
    if (bullet) {
      pushListItem('bulletList', bullet[1]);
      continue;
    }
    const numbered = NUMBERED.exec(line);
    if (numbered) {
      pushListItem('numberedList', numbered[1]);
      continue;
    }
    const q = QUOTE.exec(line);
    if (q) {
      flushParagraph();
      flushList();
      quote.push(q[1]);
      continue;
    }
    /* A wrapped list item continues on an indented line. */
    if (list && /^\s{2,}\S/.test(line)) {
      const current = list as Draft;
      const last = current.items.length - 1;
      if (last >= 0) current.items[last] = `${current.items[last]} ${stripInlineMarkdown(line)}`;
      continue;
    }
    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }
  flushAll();
  return out;
};

export const markdownToNote = (markdown: string, fileName: string): ImportedNote =>
  withTitle(markdownToDrafts(markdown), fileName);

/* -------------------------------------------------------------------- HTML */

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

const listItems = (list: Element): string[] =>
  [...list.children]
    .filter((li) => li.tagName === 'LI')
    .flatMap((li) => {
      /* A nested list flattens into the parent, its items after their parent. */
      const nested = [...li.querySelectorAll(':scope > ul, :scope > ol')];
      nested.forEach((n) => n.remove());
      return [clean(li.textContent), ...nested.flatMap(listItems)];
    })
    .filter((t) => t.length > 0);

/** HTML (what mammoth makes of a .docx) → block drafts. */
export const htmlToDrafts = (html: string): Draft[] => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: Draft[] = [];
  const visit = (el: Element) => {
    const tag = el.tagName;
    if (tag === 'H1') {
      const text = clean(el.textContent);
      if (text) out.push(block('heading', text));
    } else if (/^H[2-6]$/.test(tag)) {
      const text = clean(el.textContent);
      if (text) out.push(block('subheading', text));
    } else if (tag === 'UL' || tag === 'OL') {
      const items = listItems(el);
      if (items.length > 0) out.push(block(tag === 'OL' ? 'numberedList' : 'bulletList', '', items));
    } else if (tag === 'BLOCKQUOTE') {
      const text = clean(el.textContent);
      if (text) out.push(block('quote', text));
    } else if (tag === 'HR') {
      out.push(block('divider', ''));
    } else if (tag === 'TABLE') {
      for (const row of el.querySelectorAll('tr')) {
        const cells = [...row.children].map((c) => clean(c.textContent)).filter((c) => c.length > 0);
        if (cells.length > 0) out.push(block('paragraph', cells.join(' | ')));
      }
    } else if (tag === 'P' || tag === 'PRE') {
      const text = tag === 'PRE' ? (el.textContent ?? '').trim() : clean(el.textContent);
      if (text) out.push(block('paragraph', text));
    } else {
      for (const child of el.children) visit(child);
    }
  };
  for (const child of doc.body.children) visit(child);
  return out;
};

/* -------------------------------------------------------------------- File */

/* FileReader rather than Blob.text()/arrayBuffer(): older Safari and the
   test DOM lack the promise methods. */
const read = <T extends string | ArrayBuffer>(file: Blob, as: 'text' | 'buffer'): Promise<T> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as T);
    reader.onerror = () => reject(reader.error);
    if (as === 'text') reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  });

const extensionOf = (name: string) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';

/** Read a picked file into note blocks. Throws NoteImportError. */
export const importNoteFile = async (file: File): Promise<ImportedNote> => {
  const ext = extensionOf(file.name);
  if (!['docx', 'md', 'markdown', 'txt'].includes(ext)) throw new NoteImportError('unsupported');
  if (file.size > MAX_BYTES) throw new NoteImportError('tooLarge');

  let note: ImportedNote;
  try {
    if (ext === 'docx') {
      /* Loaded only when someone imports Word, so the editor stays light. */
      const mammoth = await import('mammoth');
      const bytes = await read<ArrayBuffer>(file, 'buffer');
      /* The browser build reads `arrayBuffer`, the Node build (tests)
         `buffer`; both accept the same bytes. */
      const input = { arrayBuffer: bytes, buffer: bytes } as unknown as { arrayBuffer: ArrayBuffer };
      const { value } = await mammoth.convertToHtml(
        input,
        /* Word's Quote / Intense Quote styles → blockquote. */
        { styleMap: ["p[style-name='Quote'] => blockquote:fresh", "p[style-name='Intense Quote'] => blockquote:fresh"] },
      );
      note = withTitle(htmlToDrafts(value), file.name);
    } else {
      note = markdownToNote(await read<string>(file, 'text'), file.name);
    }
  } catch {
    throw new NoteImportError('unreadable');
  }
  if (note.blocks.length === 0) throw new NoteImportError('empty');
  return note;
};
