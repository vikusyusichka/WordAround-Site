/* The grammar note the learner opened last, offered back so they can pick up
   where they left off. The note comes from the same recently-opened store the
   review queue uses, so nothing new has to be tracked; the home screen decides
   whether there is one to show. Sizes itself like the action ProgressCard it
   sits beside — by container width, not viewport. */
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { ProgressBlobShape } from '@/components/home/blobs';
import type { GrammarRecommendation } from '@/lib/grammarRecommendations';

interface LastNoteCardProps {
  note: GrammarRecommendation;
}

export const LastNoteCard = ({ note }: LastNoteCardProps) => {
  const { t } = useTranslation();

  return (
    <Link
      to="/practice/writing/grammar/$topicId/$noteId"
      params={{ topicId: note.topicId, noteId: note.noteId }}
      className="block w-full transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <div className="@container w-full">
        <div
          className="relative h-[130px] w-full overflow-hidden rounded-[22px] border border-white/95 shadow-[0_6px_10px_rgba(0,0,0,0.035)] @min-[420px]:h-[190px] @min-[420px]:rounded-[30px]"
          style={{ background: 'var(--color-home-stat1-bg)' }}
        >
          <div className="absolute top-0 right-0 flex justify-end">
            <ProgressBlobShape
              color="var(--color-home-stat1-blob)"
              opacity={0.9}
              className="mt-[-16px] mr-[-24px] h-[56px] w-[180px] @min-[420px]:h-[70px] @min-[420px]:w-[270px]"
            />
          </div>

          <div className="relative flex h-full items-center gap-3 px-4 py-[18px] @min-[420px]:gap-5 @min-[420px]:px-6 @min-[420px]:py-6">
            <div
              className="grid size-[52px] shrink-0 place-items-center rounded-full @min-[420px]:size-[74px]"
              style={{ background: 'var(--color-home-stat1-accent)' }}
            >
              <Icon name="book.pages.fill" className="size-5 text-white @min-[420px]:size-7" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5 @min-[420px]:gap-2.5">
              <span className="text-[14px] font-semibold text-(--color-home-stat1-title) @min-[420px]:text-[16px]">
                {t('home.lastNote.title')}
              </span>
              <span className="truncate text-[22px] font-bold text-(--color-primary-blue-dark) @min-[420px]:text-[34px]">
                {note.title}
              </span>
              {note.previewText && (
                <span className="truncate text-[14px] font-medium text-(--color-text-secondary) @min-[420px]:text-[18px]">
                  {note.previewText}
                </span>
              )}
            </div>

            <div
              className="grid size-[46px] shrink-0 place-items-center rounded-[14px] @min-[420px]:size-[62px] @min-[420px]:rounded-[18px]"
              style={{ background: 'var(--color-home-stat1-accent)' }}
            >
              <Icon name="arrow.right" className="size-[18px] text-white @min-[420px]:size-6" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
