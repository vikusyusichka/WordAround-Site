/* Note search index — web port of GrammarNoteSearchIndexer.swift. One
   normalized blob per note (title + preview + type + tags + every block), a
   diacritic-insensitive `matches`, and a `snippet` that shows the matching
   passage in the notes list. Pure, so the topic list can filter locally
   exactly like iOS does. */
import { NOTE_TYPE_TITLE } from '@/lib/grammarMeta';
import type { GrammarNote, GrammarNoteBlock, GrammarNoteType } from '@/lib/models';

/** Lowercase, strip diacritics, collapse whitespace (iOS `normalize`). */
export const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .join(' ');

const blockStrings = (block: GrammarNoteBlock): string[] => {
  const parts = [block.text];
  if (block.secondaryText) parts.push(block.secondaryText);
  parts.push(...block.items);
  if (block.imageCaption) parts.push(block.imageCaption);
  return parts;
};

/** Every block's text, newline-joined — iOS `makePlainText(from:)`. */
export const makePlainText = (blocks: GrammarNoteBlock[]): string =>
  blocks
    .flatMap(blockStrings)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join('\n');

export const makeSearchableText = (params: {
  title: string;
  previewText: string;
  tags: string[];
  noteType: GrammarNoteType;
  blocks: GrammarNoteBlock[];
  plainTextContent?: string;
}): string => {
  const parts: string[] = [
    params.title,
    params.previewText,
    NOTE_TYPE_TITLE[params.noteType],
    ...params.tags,
    params.plainTextContent ?? '',
    ...params.blocks.flatMap(blockStrings),
  ];
  return normalizeSearchText(
    parts
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(' '),
  );
};

export const searchableTextForNote = (note: GrammarNote): string =>
  makeSearchableText({
    title: note.title,
    previewText: note.previewText,
    tags: note.tags,
    noteType: note.noteType,
    blocks: note.contentBlocks,
    plainTextContent: note.plainTextContent,
  });

/** Match against the stored blob, rebuilding it when the note predates the
    index (iOS `matchesFallback`). */
export const noteMatchesQuery = (note: GrammarNote, query: string): boolean => {
  const q = normalizeSearchText(query);
  if (q.length === 0) return true;
  const blob = note.searchableText.length > 0 ? note.searchableText : searchableTextForNote(note);
  return blob.includes(q);
};

/** ~120 chars around the first hit, ellipsed on both cut ends. */
export const searchSnippet = (
  note: GrammarNote,
  query: string,
  maxLength = 120,
): string | undefined => {
  const q = normalizeSearchText(query);
  if (q.length === 0) return undefined;

  const sources = [
    note.plainTextContent,
    ...note.contentBlocks.flatMap(blockStrings),
    note.previewText,
  ];

  for (const source of sources) {
    const trimmed = source.trim();
    if (trimmed.length === 0) continue;
    const index = normalizeSearchText(trimmed).indexOf(q);
    if (index < 0) continue;

    const start = Math.max(0, index - 30);
    const end = Math.min(trimmed.length, start + maxLength);
    let snippet = trimmed.slice(start, end);
    if (start > 0) snippet = `…${snippet}`;
    if (end < trimmed.length) snippet = `${snippet}…`;
    return snippet;
  }
  return undefined;
};
