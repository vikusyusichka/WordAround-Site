/* The "arrange / done" control in a library screen's header — iOS shows a
   pencil that turns into a checkmark (FoldersListView, SetsListView).

   Arranging is a mode rather than an always-on affordance because drag handles
   on every card would compete with opening one, which is what people do with
   these lists almost every time. */
import { useTranslation } from 'react-i18next';
import { Check, PencilSimple } from '@phosphor-icons/react';

interface ReorderToggleProps {
  isEditing: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export const ReorderToggle = ({ isEditing, disabled = false, onToggle }: ReorderToggleProps) => {
  const { t } = useTranslation();
  const label = isEditing ? t('common.done') : t('common.arrange');

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={isEditing}
      aria-label={label}
      title={label}
      className={`flex h-11 items-center gap-2 rounded-2xl px-3.5 text-[15px] font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none ${
        isEditing
          ? 'bg-(--color-primary-blue) text-white'
          : 'bg-white/90 text-(--color-text-secondary) hover:bg-white'
      }`}
    >
      {isEditing ? <Check size={17} weight="bold" /> : <PencilSimple size={17} weight="bold" />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};
