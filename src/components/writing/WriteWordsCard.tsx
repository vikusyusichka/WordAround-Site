/* Prompt inside the WriteWords exercise card: small caption + the word being
   translated (iOS WriteWordsExerciseCardView header — plain, inside the card). */
interface WriteWordsCardProps {
  displayTitle: string;
  displayWord: string;
}

export const WriteWordsCard = ({ displayTitle, displayWord }: WriteWordsCardProps) => (
  <div className="flex flex-col gap-2 text-center">
    <span className="text-[13px] font-semibold text-(--color-text-secondary) md:text-[15px]">
      {displayTitle}
    </span>
    <span className="break-words text-[34px] font-bold leading-tight text-(--color-primary-blue-dark) md:text-[42px]">
      {displayWord}
    </span>
  </div>
);
