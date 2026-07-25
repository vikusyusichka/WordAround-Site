/* All / Studied / Remaining / Mastered filter tabs — 1:1 with
   FlashcardSetDetailFilterTabsView: a white (field-background) rounded bar with
   1px vertical dividers, each tab a title + count badge capsule over an accent
   underline. Selected badge = accent-12% fill with accent text; unselected =
   soft-accent fill with muted text. */
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { CARD_FILTERS, type CardFilter } from '@/lib/studySession';
import type { SetTheme } from '@/lib/setColors';

interface FilterTabsProps {
  value: CardFilter;
  counts: Record<CardFilter, number>;
  theme: SetTheme;
  onChange: (filter: CardFilter) => void;
}

export const FilterTabs = ({ value, counts, theme, onChange }: FilterTabsProps) => {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-stretch rounded-[18px]"
      style={{ background: theme.fieldBackground, boxShadow: `0 6px 12px ${theme.shadowColor}` }}
      role="tablist"
    >
      {CARD_FILTERS.map((filter, i) => {
        const active = filter === value;
        const badgeStyle: CSSProperties = active
          ? { background: `color-mix(in srgb, ${theme.accent} 12%, transparent)`, color: theme.accent }
          : { background: theme.softAccent, color: theme.mutedTextColor };
        return (
          <div key={filter} className="flex flex-1 items-stretch">
            {i > 0 && (
              <span
                className="my-auto h-5 w-px shrink-0"
                style={{ background: theme.borderColor, opacity: 0.4 }}
              />
            )}
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(filter)}
              className="flex flex-1 flex-col items-center gap-1.5 py-3 focus-visible:outline-none"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="text-[13px] font-semibold lg:text-[15px]"
                  style={{ color: active ? theme.accent : theme.mutedTextColor }}
                >
                  {t(`study.filter.${filter}`)}
                </span>
                <span
                  className="grid min-w-[20px] place-items-center rounded-full px-1.5 py-0.5 text-[12px] font-bold tabular-nums"
                  style={badgeStyle}
                >
                  {counts[filter]}
                </span>
              </span>
              <span
                className="h-[3px] w-6 rounded-full"
                style={{ background: active ? theme.accent : 'transparent' }}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
};
