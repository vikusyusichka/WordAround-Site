/* Icon picker — an inline label and the currently chosen icon beside it.
   Tapping the icon opens the full catalogue. Leaving the default lets the
   wizard auto-suggest from the title at save time. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { SymbolPickerDialog } from '@/components/create/SymbolPickerDialog';
import type { SetTheme } from '@/lib/setColors';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  theme: SetTheme;
  /** Shown beside the icon — each screen passes its own wording. */
  label: string;
}

export const IconPicker = ({ value, onChange, theme, label }: IconPickerProps) => {
  const { t } = useTranslation();
  const [isCatalogueOpen, setIsCatalogueOpen] = useState(false);

  return (
    <>
      {/* Label left, icon pinned to the right edge of the section. */}
      <div className="flex w-full items-center justify-between gap-3">
        <span className="text-[14px] font-bold" style={{ color: theme.titleColor }}>
          {label}
        </span>

        <button
          type="button"
          onClick={() => setIsCatalogueOpen(true)}
          aria-haspopup="dialog"
          aria-label={t('createSet.iconPicker.title')}
          title={value}
          className="grid size-11 place-items-center rounded-xl border transition-colors hover:brightness-[0.98] focus-visible:outline-none"
          style={{
            background: theme.softAccent,
            borderColor: theme.accent,
            color: theme.accent,
          }}
        >
          <Icon name={value} className="size-5" />
        </button>
      </div>

      {isCatalogueOpen && (
        <SymbolPickerDialog
          value={value}
          theme={theme}
          onSelect={(symbol) => {
            onChange(symbol);
            setIsCatalogueOpen(false);
          }}
          onClose={() => setIsCatalogueOpen(false)}
        />
      )}
    </>
  );
};
