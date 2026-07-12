/* Answer-cell strip: one visual cell per letter of the correct answer.
   Renders in three "layers" so the reader can see hint letters, typed letters,
   and (on submit) the correct/incorrect color state. Spaces are rendered as
   a wider gap between cell groups so multi-word answers stay legible. */
import type { WriteWordsValidation } from '@/lib/writingSession';

interface WriteWordsCellsProps {
  correctAnswer: string;
  typedAnswer: string;
  hintRevealed: number;
  validation: WriteWordsValidation;
}

const cellBase =
  'grid h-[52px] w-[36px] place-items-center rounded-[10px] border-2 text-[20px] font-bold uppercase transition-colors md:h-[64px] md:w-[44px] md:rounded-[12px] md:text-[24px]';

export const WriteWordsCells = ({
  correctAnswer,
  typedAnswer,
  hintRevealed,
  validation,
}: WriteWordsCellsProps) => {
  const chars = [...correctAnswer]; // grapheme-safe for basic Latin/Cyrillic
  const typed = [...typedAnswer];

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
      {chars.map((ch, i) => {
        if (ch === ' ') {
          return <span key={`sp-${i}`} className="w-3 md:w-4" aria-hidden />;
        }
        const isHint = i < hintRevealed;
        const typedCh = typed[i];
        const showChar = isHint ? ch : typedCh ?? '';

        let cls = 'border-black/10 bg-white text-(--color-primary-blue-dark)';
        if (validation === 'correct') {
          cls = 'border-green-500 bg-green-50 text-green-700';
        } else if (validation === 'incorrect') {
          cls = 'border-red-500 bg-red-50 text-red-700';
        } else if (isHint) {
          cls = 'border-black/10 bg-white text-(--color-text-secondary)';
        }

        return (
          <span key={`c-${i}`} className={`${cellBase} ${cls}`}>
            {showChar}
          </span>
        );
      })}
    </div>
  );
};
