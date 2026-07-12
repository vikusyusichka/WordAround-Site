/* All / Studied / Remaining / Mastered filter tabs with counts. */
import { useTranslation } from 'react-i18next';

import { CARD_FILTERS, type CardFilter } from '@/lib/studySession';

interface FilterTabsProps {
  value: CardFilter;
  counts: Record<CardFilter, number>;
  onChange: (filter: CardFilter) => void;
}

export const FilterTabs = ({ value, counts, onChange }: FilterTabsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {CARD_FILTERS.map((filter) => {
        const active = filter === value;
        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(filter)}
            className={[
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors focus-visible:outline-none',
              active
                ? 'bg-(--color-home-nav-sel-bg) text-(--color-home-brand)'
                : 'bg-white text-(--color-cs-text-muted) hover:bg-black/[0.03]',
            ].join(' ')}
          >
            {t(`study.filter.${filter}`)}
            <span className="text-[12px] opacity-70">{counts[filter]}</span>
          </button>
        );
      })}
    </div>
  );
};
