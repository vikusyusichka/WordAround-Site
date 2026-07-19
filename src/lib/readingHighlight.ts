/* Word-highlight heuristics — web port of ReadingTextHighlightService:
   auto-highlight words of 7+ letters (regex [A-Za-z][A-Za-z'-]{6,}) that are
   not in the iOS common-words stoplist; vocabulary terms (from flashcard-set
   readings) match case-insensitively on word boundaries. */

const COMMON_WORDS = new Set([
  'about', 'after', 'again', 'against', 'among', 'because', 'before', 'being',
  'between', 'could', 'during', 'every', 'first', 'found', 'from', 'have',
  'into', 'just', 'like', 'made', 'many', 'more', 'most', 'much', 'must',
  'only', 'other', 'over', 'people', 'said', 'same', 'should', 'some',
  'such', 'than', 'that', 'their', 'them', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'under', 'until', 'very', 'were', 'what',
  'when', 'where', 'which', 'while', 'with', 'would', 'your',
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who',
  'did', 'she', 'use', 'own', 'say', 'too', 'any', 'also', 'back', 'been',
  'come', 'does', 'down', 'each', 'even', 'give', 'good', 'here', 'high',
  'know', 'last', 'left', 'life', 'long', 'look', 'make', 'man', 'men',
  'might', 'never', 'next', 'once', 'part', 'place', 'right', 'small',
  'still', 'take', 'tell', 'think', 'time', 'turn', 'want', 'well', 'went',
  'will', 'work', 'world', 'year', 'years', 'young',
]);

const UNKNOWN_WORD_RE = /^[A-Za-z][A-Za-z'-]{6,}$/;

/** Should this word get the "unknown word" auto-highlight? */
export const isHighlightableWord = (word: string): boolean => {
  if (!UNKNOWN_WORD_RE.test(word)) return false;
  return !COMMON_WORDS.has(word.toLowerCase().replace(/['-]/g, ''));
};

/** Is this word one of the session's vocabulary terms (flashcard-set mode)? */
export const isVocabularyTerm = (word: string, terms: string[]): boolean => {
  const normalized = word.toLowerCase();
  return terms.some((t) => t.toLowerCase() === normalized);
};

export interface ReadingToken {
  text: string;
  /** True when the token is a tappable word (letters/digits/'/-, len ≥ 2). */
  isWord: boolean;
}

const WORD_CHAR = /[\p{L}\p{N}'-]/u;

/** Tokenize a paragraph into word + separator tokens (iOS wordRange rule:
    word chars are alphanumerics + hyphen + apostrophe, min length 2). */
export const tokenizeParagraph = (paragraph: string): ReadingToken[] => {
  const tokens: ReadingToken[] = [];
  let current = '';
  let currentIsWord: boolean | null = null;

  const flush = () => {
    if (current.length === 0) return;
    tokens.push({
      text: current,
      isWord: currentIsWord === true && current.length >= 2,
    });
    current = '';
  };

  for (const ch of paragraph) {
    const isWord = WORD_CHAR.test(ch);
    if (currentIsWord === null || isWord === currentIsWord) {
      current += ch;
      currentIsWord = isWord;
    } else {
      flush();
      current = ch;
      currentIsWord = isWord;
    }
  }
  flush();
  return tokens;
};
