/* Filter row above a topic's notes — port of the GrammarNoteFilter picker.
   Rendered as a scrollable chip row so it works on a phone-width viewport
   too; the filter predicates themselves live in lib/grammarFilters. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { FILTER_ICON, NOTE_FILTERS, type NoteFilter } from '@/lib/grammarFilters';

interface NoteFilterChipsProps {
  value: NoteFilter;
  counts?: Partial<Record<NoteFilter, number>>;
  onChange: (filter: NoteFilter) => void;
}

export const NoteFilterChips = ({ value, counts, onChange }: NoteFilterChipsProps) => {
  const { t } = useTranslation();

  return (
    <div
      role="tablist"
      aria-label={t('writing.grammar.filter.label')}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {NOTE_FILTERS.map((filter) => {
        const isActive = filter === value;
        const count = counts?.[filter];
        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter)}
            className={[
              'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold transition-colors focus-visible:outline-none',
              isActive
                ? 'border-transparent bg-(--color-primary-blue) text-white'
                : 'border-(--color-auth-field-border) bg-white/90 text-(--color-text-secondary) hover:bg-white',
            ].join(' ')}
          >
            <Icon name={FILTER_ICON[filter]} className="size-[13px]" />
            {t(`writing.grammar.filter.${filter}`)}
            {count !== undefined && count > 0 && (
              <span className={isActive ? 'opacity-80' : 'opacity-60'}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
