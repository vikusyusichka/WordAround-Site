/* One saved text in the My Texts library — web port of ReadingTextCardView:
   title + preview, metadata chips, progress bar, action button, overflow
   (rename/delete kept as simple buttons). */
import { useTranslation } from 'react-i18next';
import { PencilSimple, Trash } from '@phosphor-icons/react';

import { findLanguage } from '@/lib/essayTypes';
import type { ReadingLibraryItem } from '@/lib/models';

interface ReadingTextCardProps {
  item: ReadingLibraryItem;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const chip =
  'rounded-full bg-(--color-goal-bg) px-2 py-0.5 text-[11px] font-bold text-(--color-text-secondary)';

export const ReadingTextCard = ({ item, onOpen, onRename, onDelete }: ReadingTextCardProps) => {
  const { t } = useTranslation();
  const actionKey =
    item.status === 'completed' ? 'readAgain' : item.status === 'inProgress' ? 'continue' : 'start';
  const level = item.detectedDifficulty ?? item.difficulty;

  return (
    <div className="group relative flex flex-col gap-3 rounded-2xl border border-white bg-white/95 p-4 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
      <div className="flex flex-col gap-1 pr-14">
        <span className="line-clamp-2 text-[16px] font-bold text-(--color-primary-blue-dark)">
          {item.title}
        </span>
        {item.preview && (
          <span className="line-clamp-2 text-[13px] font-medium text-(--color-text-secondary)">
            {item.preview}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={chip}>{findLanguage(item.languageCode).title}</span>
        <span className={chip}>{level}</span>
        <span className={chip}>{t('reading.card.words', { count: item.wordCount })}</span>
        <span className={chip}>{t(`reading.status.${item.status}`)}</span>
      </div>

      {item.progress > 0 && (
        <div className="h-[6px] w-full overflow-hidden rounded-full bg-(--color-goal-bg)">
          <div
            className="h-full rounded-full bg-[#21A8BD]"
            style={{ width: `${Math.max(item.progress * 100, 4)}%` }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={onOpen}
        className="h-11 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[14px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
      >
        {t(`reading.card.${actionKey}`)}
      </button>

      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={onRename}
          aria-label={t('reading.card.rename')}
          className="grid size-8 place-items-center rounded-full text-(--color-cs-text-muted) hover:bg-black/[0.04]"
        >
          <PencilSimple size={15} weight="bold" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('reading.card.delete')}
          className="grid size-8 place-items-center rounded-full text-(--color-cs-text-muted) hover:bg-black/[0.04] hover:text-(--color-cs-red)"
        >
          <Trash size={15} weight="bold" />
        </button>
      </div>
    </div>
  );
};
