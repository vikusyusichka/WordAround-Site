/* All / Studied / Remaining / Mastered filter tabs — iOS style: label with a
   count badge in a soft circle, and the active tab underlined in the set's
   accent (FlashcardSetDetailFilterTabsView). */
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { CARD_FILTERS, type CardFilter } from '@/lib/studySession';

interface FilterTabsProps {
  value: CardFilter;
  counts: Record<CardFilter, number>;
  accent: string;
  onChange: (filter: CardFilter) => void;
}

export const FilterTabs = ({ value, counts, accent, onChange }: FilterTabsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-stretch justify-between gap-1" role="tablist">
      {CARD_FILTERS.map((filter) => {
        const active = filter === value;
        const badgeStyle: CSSProperties = active
          ? { background: accent, color: '#fff' }
          : { background: 'rgba(0,0,0,0.05)', color: 'var(--color-cs-text-muted)' };
        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(filter)}
            className="flex flex-1 flex-col items-center gap-2 py-2 focus-visible:outline-none"
          >
            <span className="flex items-center gap-1.5">
              <span
                className="text-[13px] font-bold lg:text-[15px]"
                style={{ color: active ? accent : 'var(--color-cs-text-muted)' }}
              >
                {t(`study.filter.${filter}`)}
              </span>
              <span
                className="grid min-w-[20px] place-items-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
                style={badgeStyle}
              >
                {counts[filter]}
              </span>
            </span>
            <span
              className="h-[3px] w-8 rounded-full"
              style={{ background: active ? accent : 'transparent' }}
            />
          </button>
        );
      })}
    </div>
  );
};
