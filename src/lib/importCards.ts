/* Parsing for the "import cards" screen: turns a pasted block of text into
   term/definition pairs. The user picks what separates a term from its
   definition, and what separates one card from the next — either a preset or
   their own string. Pure functions; the screen owns the UI state. */

export type TermSeparatorId = 'tab' | 'comma' | 'custom';
export type CardSeparatorId = 'newline' | 'semicolon' | 'custom';

export interface ImportSeparators {
  term: TermSeparatorId;
  /** Used only when `term` is 'custom'. */
  termCustom: string;
  card: CardSeparatorId;
  /** Used only when `card` is 'custom'. */
  cardCustom: string;
}

export interface ParsedCard {
  term: string;
  definition: string;
}

export const defaultSeparators = (): ImportSeparators => ({
  term: 'tab',
  termCustom: '',
  card: 'newline',
  cardCustom: '',
});

const TERM_LITERALS: Record<Exclude<TermSeparatorId, 'custom'>, string> = {
  tab: '\t',
  comma: ',',
};

const CARD_LITERALS: Record<Exclude<CardSeparatorId, 'custom'>, string> = {
  newline: '\n',
  semicolon: ';',
};

/** The actual string a separator choice stands for; '' when a custom one is blank. */
export const resolveTermSeparator = (separators: ImportSeparators): string =>
  separators.term === 'custom' ? separators.termCustom : TERM_LITERALS[separators.term];

export const resolveCardSeparator = (separators: ImportSeparators): string =>
  separators.card === 'custom' ? separators.cardCustom : CARD_LITERALS[separators.card];

/* A row with no term is not a card. A row with no definition still is — the
   editor can fill it in afterwards, which beats silently dropping the line. */
const toCard = (row: string, termSeparator: string): ParsedCard | null => {
  const at = row.indexOf(termSeparator);
  const term = (at === -1 ? row : row.slice(0, at)).trim();
  if (!term) return null;
  const definition = at === -1 ? '' : row.slice(at + termSeparator.length).trim();
  return { term, definition };
};

/** Parsed cards for the given text, or [] when either separator is unusable. */
export const parseImportedCards = (text: string, separators: ImportSeparators): ParsedCard[] => {
  const termSeparator = resolveTermSeparator(separators);
  const cardSeparator = resolveCardSeparator(separators);
  if (!termSeparator || !cardSeparator) return [];

  /* Pasted text from Windows apps carries CRLF; normalise so a newline
     separator matches and so no term ends up with a stray \r. */
  return text
    .replace(/\r\n/g, '\n')
    .split(cardSeparator)
    .map((row) => toCard(row, termSeparator))
    .filter((card): card is ParsedCard => card !== null);
};
