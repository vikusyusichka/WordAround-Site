/* One row in the set's card list — word / translation / image + edit + delete. */
import { useTranslation } from 'react-i18next';
import { PencilSimple, Trash } from '@phosphor-icons/react';

import type { Flashcard } from '@/lib/models';

interface CardListRowProps {
  card: Flashcard;
  index: number;
  accent: string;
  onEdit: () => void;
  onDelete: () => void;
}

export const CardListRow = ({ card, index, accent, onEdit, onDelete }: CardListRowProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_4px_10px_rgba(0,0,0,0.03)]">
      <span className="w-6 shrink-0 text-center text-[13px] font-bold text-(--color-cs-text-muted)">
        {index + 1}
      </span>
      {card.imageURL && (
        <img src={card.imageURL} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[16px] font-bold text-(--color-cs-dark-text)">
          {card.word}
        </span>
        <span className="truncate text-[15px] font-medium" style={{ color: accent }}>
          {card.translation}
        </span>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label={t('study.editCard')}
          className="grid size-9 place-items-center rounded-full text-(--color-primary-blue-dark) hover:bg-black/[0.04] focus-visible:outline-none"
        >
          <PencilSimple size={16} weight="bold" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('study.deleteCard')}
          className="grid size-9 place-items-center rounded-full text-(--color-cs-red) hover:bg-(--color-cs-soft-red) focus-visible:outline-none"
        >
          <Trash size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
};
