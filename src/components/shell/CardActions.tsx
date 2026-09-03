/* Edit / delete on a library card (folder, set, topic). Sits outside the
   card's own button — a button inside a button is invalid markup and swallows
   the click — and rides the .wa-hover-actions utility: revealed on hover where
   hovering exists, permanently visible on a touch screen where it does not. */
import { PencilSimple, Trash } from '@phosphor-icons/react';

interface CardActionsProps {
  /** Omitted when the object has no edit screen to open. */
  onEdit?: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
  /** Colour for the pencil; the trash is always the destructive red. */
  editColor?: string;
}

export const CardActions = ({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  editColor,
}: CardActionsProps) => (
  <div className="wa-hover-actions absolute top-3 right-3 z-10 flex gap-1.5">
    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        aria-label={editLabel}
        title={editLabel}
        className="grid size-8 place-items-center rounded-full bg-white/92 shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
        style={{ color: editColor ?? 'var(--color-primary-blue-dark)' }}
      >
        <PencilSimple size={15} weight="bold" />
      </button>
    )}
    <button
      type="button"
      onClick={onDelete}
      aria-label={deleteLabel}
      title={deleteLabel}
      className="grid size-8 place-items-center rounded-full bg-white/92 text-(--color-cs-red) shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
    >
      <Trash size={15} weight="bold" />
    </button>
  </div>
);
