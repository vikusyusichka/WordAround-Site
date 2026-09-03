/* Search field above the topics / notes list — web port of GrammarSearchBar.
   Controlled, with a clear button once there is something to clear. */
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass, X } from '@phosphor-icons/react';

interface GrammarSearchBarProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export const GrammarSearchBar = ({ value, placeholder, onChange }: GrammarSearchBarProps) => {
  const { t } = useTranslation();

  return (
    <div className="relative flex w-full max-w-[520px] items-center">
      <MagnifyingGlass
        size={17}
        weight="bold"
        className="pointer-events-none absolute left-4 text-(--color-muted-text)"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-2xl border border-white bg-white/95 pl-11 pr-10 text-[15px] font-medium text-(--color-primary-blue-dark) shadow-[0_2px_8px_rgba(0,0,0,0.04)] outline-none focus-visible:border-(--color-home-brand) [&::-webkit-search-cancel-button]:hidden"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('writing.grammar.search.clear')}
          className="absolute right-3 grid size-7 place-items-center rounded-full text-(--color-muted-text) hover:bg-black/[0.04] focus-visible:outline-none"
        >
          <X size={15} weight="bold" />
        </button>
      )}
    </div>
  );
};
