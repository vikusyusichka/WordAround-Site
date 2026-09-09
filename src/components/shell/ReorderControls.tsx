/* Up/down buttons shown beside a card while a library list is being arranged.

   Dragging is the nicer gesture and it is there too, but a drag is unreachable
   from a keyboard and awkward on a phone inside a scrolling list. These buttons
   are the version that always works — and they are what makes the reorder mode
   operable without a mouse at all. */
import { useTranslation } from 'react-i18next';
import { CaretDown, CaretUp } from '@phosphor-icons/react';

interface ReorderControlsProps {
  /** Item's name, so each button says what it will move. */
  label: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const ReorderControls = ({
  label,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: ReorderControlsProps) => {
  const { t } = useTranslation();

  const button =
    'grid size-9 place-items-center rounded-xl bg-(--color-surface) text-(--color-primary-blue) shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-colors hover:bg-(--color-home-nav-sel-bg) disabled:opacity-35 disabled:hover:bg-(--color-surface) focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none';

  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={isFirst}
        aria-label={t('common.moveUp', { name: label })}
        className={button}
      >
        <CaretUp size={16} weight="bold" />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={isLast}
        aria-label={t('common.moveDown', { name: label })}
        className={button}
      >
        <CaretDown size={16} weight="bold" />
      </button>
    </div>
  );
};
