/* The four things you start from on the notes home — port of
   GrammarNotesHomeView.quickActionsRow.

   These used to be a row of pills sharing the page header with the search
   field and the settings button, which made "New topic" look like a header
   control rather than the main way in. As a grid in the content they read as
   what they are: the four openings into Grammar Notes, all of equal weight.

   Two columns on a phone, four from lg — iOS's own split (2 on iPhone, 4 on
   iPad). Each tile carries the same corner blob as the cards below it, at a
   size that suits a tile. */
import { useTranslation } from 'react-i18next';

import { BlobBackground } from '@/components/primitives/BlobBackground';
import { Icon } from '@/components/primitives/Icon';

export interface QuickAction {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
}

interface QuickActionsGridProps {
  actions: QuickAction[];
}

export const QuickActionsGrid = ({ actions }: QuickActionsGridProps) => {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t('writing.grammar.quickActions.label')}
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={action.onClick}
          className="relative flex min-h-[76px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[18px] border border-(--color-surface)/60 bg-(--color-surface)/[0.84] px-2 py-2.5 shadow-[0_8px_14px_rgba(0,0,0,0.045)] transition-transform hover:-translate-y-0.5 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none lg:min-h-[88px] lg:gap-2 lg:py-3"
        >
          {/* iOS: 64×52 offset (16, −14); 80×64 offset (22, −18) on iPad. */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-[-14px] right-[-16px] h-[52px] w-[64px] lg:top-[-18px] lg:right-[-22px] lg:h-[64px] lg:w-[80px]"
          >
            <BlobBackground
              className="h-full w-full"
              color="var(--color-primary-blue)"
              rotation={-9}
              opacity={0.07}
            />
          </span>

          <span
            aria-hidden
            className="relative grid size-8 place-items-center rounded-full lg:size-9"
            style={{
              background: 'color-mix(in srgb, var(--color-primary-blue) 12%, transparent)',
            }}
          >
            <Icon name={action.icon} className="size-[14px] text-(--color-primary-blue) lg:size-[15px]" />
          </span>

          <span className="relative line-clamp-2 text-center text-[11px] leading-[1.25] font-black text-(--color-primary-blue-dark) lg:text-[12px]">
            {action.label}
          </span>
        </button>
      ))}
    </nav>
  );
};
