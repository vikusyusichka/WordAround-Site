/* Big prompt card in the WriteWords game: small caption + the word the user
   is translating. Web port of WriteWordsExerciseCardView. */
import { StatBlobShape } from '@/components/home/blobs';

interface WriteWordsCardProps {
  displayTitle: string;
  displayWord: string;
}

export const WriteWordsCard = ({ displayTitle, displayWord }: WriteWordsCardProps) => (
  <div className="relative w-full overflow-hidden rounded-[26px] border border-white/95 bg-(--color-fc-card-bg) px-6 py-8 shadow-[0_6px_14px_rgba(0,0,0,0.055)] md:rounded-[32px] md:px-8 md:py-12">
    <StatBlobShape
      color="var(--color-fc-soft-blue)"
      opacity={0.7}
      className="pointer-events-none absolute -top-4 -right-4 h-[80px] w-[100px] md:h-[100px] md:w-[130px]"
    />

    <div className="relative flex flex-col gap-3 text-center">
      <span className="text-[13px] font-semibold uppercase tracking-wide text-(--color-fc-text) md:text-[15px]">
        {displayTitle}
      </span>
      <span className="break-words text-[36px] font-extrabold leading-tight text-(--color-fc-title) md:text-[52px]">
        {displayWord}
      </span>
    </div>
  </div>
);
