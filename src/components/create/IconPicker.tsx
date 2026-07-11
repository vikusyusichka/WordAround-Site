/* Icon picker — grid of preset set icons. Leaving the default lets the wizard
   auto-suggest from the title at save time. */
import { Icon } from '@/components/primitives/Icon';
import { PREVIEW_ICONS } from '@/lib/iconSuggester';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export const IconPicker = ({ value, onChange }: IconPickerProps) => {
  return (
    <div className="flex flex-wrap gap-2.5">
      {PREVIEW_ICONS.map((icon) => {
        const selected = icon === value;
        return (
          <button
            key={icon}
            type="button"
            aria-label={icon}
            aria-pressed={selected}
            onClick={() => onChange(icon)}
            className={[
              'grid size-11 place-items-center rounded-xl border transition-colors focus-visible:outline-none',
              selected
                ? 'border-(--color-home-brand) bg-(--color-home-nav-sel-bg) text-(--color-home-brand)'
                : 'border-(--color-auth-field-border) bg-white text-(--color-cs-text-muted) hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-(--color-home-brand)',
            ].join(' ')}
          >
            <Icon name={icon} className="size-5" />
          </button>
        );
      })}
    </div>
  );
};
