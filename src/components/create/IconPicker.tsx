/* Icon picker — the quick row of preset set icons plus a way into the full
   catalogue. Leaving the default lets the wizard auto-suggest from the title
   at save time. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DotsThree } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { SymbolPickerDialog } from '@/components/create/SymbolPickerDialog';
import { PREVIEW_ICONS } from '@/lib/iconSuggester';
import type { SetTheme } from '@/lib/setColors';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  theme: SetTheme;
}

export const IconPicker = ({ value, onChange, theme }: IconPickerProps) => {
  const { t } = useTranslation();
  const [isCatalogueOpen, setIsCatalogueOpen] = useState(false);

  /* An icon chosen from the catalogue that isn't one of the presets still has
     to be visible in the row — otherwise the selection looks lost. */
  const quickIcons = PREVIEW_ICONS.includes(value) ? PREVIEW_ICONS : [...PREVIEW_ICONS, value];

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        {quickIcons.map((icon) => {
          const selected = icon === value;
          return (
            <button
              key={icon}
              type="button"
              aria-label={icon}
              aria-pressed={selected}
              onClick={() => onChange(icon)}
              className="grid size-11 place-items-center rounded-xl border transition-colors hover:brightness-[0.98] focus-visible:outline-none"
              style={
                selected
                  ? {
                      background: theme.softAccent,
                      borderColor: theme.accent,
                      color: theme.accent,
                    }
                  : {
                      background: theme.fieldBackground,
                      borderColor: theme.softBorderColor,
                      color: theme.mutedTextColor,
                    }
              }
            >
              <Icon name={icon} className="size-5" />
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsCatalogueOpen(true)}
          className="flex h-11 items-center gap-2 rounded-xl border border-dashed px-3.5 text-[14px] font-semibold transition-colors hover:brightness-[0.98] focus-visible:outline-none"
          style={{
            background: theme.imageBackground,
            borderColor: theme.borderColor,
            color: theme.accent,
          }}
        >
          <DotsThree size={18} weight="bold" />
          {t('createSet.iconPicker.open')}
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
