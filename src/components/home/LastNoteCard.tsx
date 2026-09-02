/* The grammar note the learner opened last, offered back so they can pick up
   where they left off. Reads the same recently-opened store the review queue
   uses, so nothing new has to be tracked. Renders nothing when there is no
   history yet — an empty placeholder would just take space. */
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { ProgressBlobShape } from '@/components/home/blobs';
import { recentlyOpenedNotes } from '@/lib/grammarRecommendations';

export const LastNoteCard = () => {
  const { t } = useTranslation();
  const note = recentlyOpenedNotes()[0];

  if (!note) return null;

  return (
    <Link
      to="/practice/writing/grammar/$topicId/$noteId"
      params={{ topicId: note.topicId, noteId: note.noteId }}
      className="block w-full transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <div
        className="relative h-[130px] w-full overflow-hidden rounded-[22px] border border-white/95 shadow-[0_6px_10px_rgba(0,0,0,0.035)] md:h-[190px] md:rounded-[30px]"
        style={{ background: 'var(--color-home-stat1-bg)' }}
      >
        <div className="absolute top-0 right-0 flex justify-end">
          <ProgressBlobShape
            color="var(--color-home-stat1-blob)"
            opacity={0.9}
            className="mt-[-16px] mr-[-24px] h-[56px] w-[180px] md:h-[70px] md:w-[270px]"
          />
        </div>

        <div className="relative flex h-full items-center gap-3 px-4 py-[18px] md:gap-5 md:px-6 md:py-6">
          <div
            className="grid size-[52px] shrink-0 place-items-center rounded-full md:size-[74px]"
            style={{ background: 'var(--color-home-stat1-accent)' }}
          >
            <Icon name="book.pages.fill" className="size-5 text-white md:size-7" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:gap-2.5">
            <span className="text-[14px] font-semibold text-(--color-home-stat1-title) md:text-[16px]">
              {t('home.lastNote.title')}
            </span>
            <span className="truncate text-[21px] font-bold text-(--color-primary-blue-dark) md:text-[28px]">
              {note.title}
            </span>
            {note.previewText && (
              <span className="truncate text-[14px] font-medium text-(--color-text-secondary) md:text-[16px]">
                {note.previewText}
              </span>
            )}
          </div>

          <div
            className="grid size-[46px] shrink-0 place-items-center rounded-[14px] md:size-[62px] md:rounded-[18px]"
            style={{ background: 'var(--color-home-stat1-accent)' }}
          >
            <Icon name="arrow.right" className="size-[18px] text-white md:size-6" />
          </div>
        </div>
      </div>
    </Link>
  );
};
