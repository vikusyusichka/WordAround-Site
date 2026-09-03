/* List / grid switch for the library screens. The preference itself and the
   shared grid definition live in lib/cardView — a component file that also
   exports helpers breaks fast refresh. */
import { useTranslation } from 'react-i18next';
import { Rows, SquaresFour } from '@phosphor-icons/react';

import type { CardView } from '@/lib/cardView';

interface ViewToggleProps {
  value: CardView;
  onChange: (next: CardView) => void;
}

export const ViewToggle = ({ value, onChange }: ViewToggleProps) => {
  const { t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t('common.view.label')}
      className="flex gap-1 rounded-2xl bg-white/90 p-1 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
    >
      <ViewButton
        icon={<Rows size={17} weight="bold" />}
        label={t('common.view.rows')}
        isActive={value === 'row'}
        onClick={() => onChange('row')}
      />
      <ViewButton
        icon={<SquaresFour size={17} weight="bold" />}
        label={t('common.view.grid')}
        isActive={value === 'tile'}
        onClick={() => onChange('tile')}
      />
    </div>
  );
};

interface ViewButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const ViewButton = ({ icon, label, isActive, onClick }: ViewButtonProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={isActive}
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`grid size-9 place-items-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none ${
      isActive
        ? 'bg-(--color-home-nav-sel-bg) text-(--color-primary-blue)'
        : 'text-(--color-cs-text-muted) hover:bg-black/[0.03]'
    }`}
  >
    {icon}
  </button>
);
