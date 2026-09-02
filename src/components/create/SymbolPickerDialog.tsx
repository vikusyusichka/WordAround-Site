/* Full icon catalogue in a modal — web port of the iOS SFSymbolPickerView
   (Features/Flashcards/CreateSet/Components/Customization). Same catalogue,
   same search rule (substring over the SF symbol name), so both pickers offer
   exactly the same icons.

   Web-native where it helps: the idle grid is grouped under section headings
   instead of one long flat list, because a desktop screen has the room. */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass, X } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import {
  SF_SYMBOL_SECTIONS,
  searchSFSymbols,
  type SFSymbolSection,
} from '@/lib/sfSymbolCatalog';
import type { SetTheme } from '@/lib/setColors';

interface SymbolPickerDialogProps {
  value: string;
  theme: SetTheme;
  onSelect: (symbol: string) => void;
  onClose: () => void;
}

export const SymbolPickerDialog = ({
  value,
  theme,
  onSelect,
  onClose,
}: SymbolPickerDialogProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isSearching = query.trim().length > 0;
  const results = searchSFSymbols(query);
  const sections: SFSymbolSection[] = isSearching
    ? [{ id: 'results', symbols: results }]
    : SF_SYMBOL_SECTIONS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(20, 24, 40, 0.28)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('createSet.iconPicker.title')}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(680px,88dvh)] w-full max-w-[720px] flex-col gap-4 overflow-hidden rounded-[28px] p-5 sm:p-6"
        style={{
          background: theme.screenBackground,
          boxShadow: `0 24px 60px ${theme.shadowColor}`,
        }}
      >
        {/* Top bar: close · title · search */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('createSet.iconPicker.close')}
            className="grid size-9 shrink-0 place-items-center rounded-full border transition-colors hover:brightness-95 focus-visible:outline-none"
            style={{
              background: theme.softAccent,
              borderColor: theme.softBorderColor,
              color: theme.accent,
            }}
          >
            <X size={14} weight="bold" />
          </button>

          <h2
            className="min-w-0 flex-1 truncate text-[17px] font-bold sm:text-[18px]"
            style={{ color: theme.titleColor }}
          >
            {t('createSet.iconPicker.title')}
          </h2>

          <div
            className="flex h-9 w-[150px] shrink-0 items-center gap-2 rounded-full px-3 sm:w-[240px]"
            style={{ background: theme.softAccent }}
          >
            <MagnifyingGlass size={14} weight="bold" style={{ color: theme.accent }} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('createSet.iconPicker.search')}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              className="w-full min-w-0 bg-transparent text-[14px] font-medium outline-none"
              style={{ color: theme.titleColor }}
            />
          </div>
        </div>

        {/* Catalogue */}
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
          {isSearching && results.length === 0 && (
            <p className="py-8 text-center text-[15px] font-medium" style={{ color: theme.mutedTextColor }}>
              {t('createSet.iconPicker.empty')}
            </p>
          )}

          {sections.map((section) => (
            <div key={section.id} className="flex flex-col gap-3">
              {!isSearching && (
                <h3
                  className="text-[13px] font-bold tracking-wide uppercase"
                  style={{ color: theme.mutedTextColor }}
                >
                  {t(`createSet.iconGroup.${section.id}`)}
                </h3>
              )}

              <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-2.5">
                {section.symbols.map((symbol) => {
                  const isSelected = symbol === value;
                  return (
                    <button
                      key={symbol}
                      type="button"
                      aria-label={symbol}
                      title={symbol}
                      aria-pressed={isSelected}
                      onClick={() => onSelect(symbol)}
                      className={`grid aspect-square place-items-center rounded-full border transition-transform hover:scale-[1.06] focus-visible:outline-none ${
                        isSelected ? 'scale-[1.06]' : ''
                      }`}
                      style={{
                        background: theme.softAccent,
                        borderColor: isSelected ? theme.accent : 'transparent',
                        color: theme.accent,
                      }}
                    >
                      <Icon name={symbol} className="size-[22px]" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
