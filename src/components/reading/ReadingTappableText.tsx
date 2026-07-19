/* Tappable reading text — web port of ReadingTappableTextView. Words render
   as clickable spans; long uncommon words get the "unknown word" tint when
   highlighting is on; vocabulary terms (flashcard-set mode) get the accent
   tint; the selected word gets a solid highlight. */
import { memo } from 'react';

import { isHighlightableWord, isVocabularyTerm, tokenizeParagraph } from '@/lib/readingHighlight';
import { readingParagraphs } from '@/lib/readingTextAnalyzer';

interface ReadingTappableTextProps {
  text: string;
  selectedWord: string | null;
  highlightUnknownWords: boolean;
  vocabularyTerms?: string[];
  onWordTap: (word: string) => void;
}

export const ReadingTappableText = memo(
  ({
    text,
    selectedWord,
    highlightUnknownWords,
    vocabularyTerms = [],
    onWordTap,
  }: ReadingTappableTextProps) => (
    <div className="flex flex-col gap-4">
      {readingParagraphs(text).map((paragraph, pi) => (
        <p
          key={pi}
          className="text-[16px] font-medium leading-relaxed text-(--color-primary-blue-dark)"
        >
          {tokenizeParagraph(paragraph).map((token, ti) => {
            if (!token.isWord) return <span key={ti}>{token.text}</span>;
            const isSelected = selectedWord === token.text;
            const isVocab = vocabularyTerms.length > 0 && isVocabularyTerm(token.text, vocabularyTerms);
            const isUnknown = highlightUnknownWords && isHighlightableWord(token.text);
            const cls = isSelected
              ? 'bg-[#21A8BD]/30 rounded'
              : isVocab
                ? 'bg-[#F7A310]/20 rounded'
                : isUnknown
                  ? 'bg-[#21A8BD]/10 rounded'
                  : '';
            return (
              <button
                key={ti}
                type="button"
                onClick={() => onWordTap(token.text)}
                className={`cursor-pointer border-0 bg-transparent p-0 font-medium text-inherit hover:underline focus-visible:outline-none ${cls}`}
              >
                {token.text}
              </button>
            );
          })}
        </p>
      ))}
    </div>
  ),
);
ReadingTappableText.displayName = 'ReadingTappableText';
