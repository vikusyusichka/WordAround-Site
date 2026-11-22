/* Shared collapsible selector — port of the iOS LanguageSelectorView /
   DifficultySelectorView pair. A white rounded card shows icon, small label,
   current value, a pale-blue badge and a chevron that turns when open; the
   options list unfolds inline beneath it. */
import { useState, type ReactNode } from 'react';

import { Icon } from '@/components/primitives/Icon';

export interface EssaySelectorOption {
  key: string;
  badge: string;
  title: string;
  subtitle?: string;
  active: boolean;
  onSelect: () => void;
}

interface EssaySelectorProps {
  icon: string;
  label: string;
  value: ReactNode;
  badge: string;
  options: EssaySelectorOption[];
  /** Width of the option badge capsule (iOS: 34 for codes, 46 for levels). */
  optionBadgeWidth: number;
  disabled?: boolean;
  /** Long lists (32 languages) scroll inside the panel. */
  scrollable?: boolean;
}

export const EssaySelector = ({
  icon,
  label,
  value,
  badge,
  options,
  optionBadgeWidth,
  disabled,
  scrollable,
}: EssaySelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex w-full items-center gap-[9px] rounded-[18px] border bg-(--color-surface)/86 px-3.5 py-3 text-left shadow-[0_7px_12px_rgba(0,0,0,0.035)] transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--color-home-brand) md:px-4 md:py-[13px] ${
          open ? 'border-(--color-primary-blue)/18' : 'border-(--color-primary-blue)/8 hover:border-(--color-primary-blue)/14'
        }`}
      >
        <Icon name={icon} className="size-[15px] shrink-0 text-(--color-primary-blue) md:size-[17px]" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10px] font-bold text-(--color-text-secondary) md:text-[11px]">
            {label}
          </span>
          <span className="truncate text-[13px] font-bold text-(--color-primary-blue-dark) md:text-[14px]">
            {value}
          </span>
        </span>
        <span className="ml-auto shrink-0 truncate rounded-full bg-(--color-primary-blue)/8 px-2 py-[5px] text-[11px] font-bold leading-none text-(--color-primary-blue) md:text-[12px]">
          {badge}
        </span>
        <Icon
          name="chevron.down"
          weight="bold"
          className={`size-[12px] shrink-0 text-(--color-text-secondary) transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className={`flex flex-col gap-1.5 rounded-[18px] bg-(--color-surface)/96 p-2 shadow-[0_8px_14px_rgba(0,0,0,0.05)] ${
            scrollable ? 'max-h-[320px] overflow-y-auto' : ''
          }`}
        >
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              role="option"
              aria-selected={option.active}
              onClick={() => {
                option.onSelect();
                setOpen(false);
              }}
              className={`flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-home-brand) ${
                option.active ? 'bg-(--color-primary-blue)/7' : 'hover:bg-(--color-primary-blue)/4'
              }`}
            >
              <span
                style={{ width: optionBadgeWidth }}
                className={`grid h-[26px] shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                  option.active
                    ? 'bg-(--color-primary-blue-solid) text-white'
                    : 'bg-(--color-primary-blue)/8 text-(--color-primary-blue)'
                }`}
              >
                {option.badge}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span
                  className={`text-[13px] text-(--color-primary-blue-dark) md:text-[14px] ${
                    option.subtitle ? 'font-bold' : 'font-semibold'
                  }`}
                >
                  {option.title}
                </span>
                {option.subtitle && (
                  <span className="truncate text-[11px] font-semibold text-(--color-text-secondary) md:text-[12px]">
                    {option.subtitle}
                  </span>
                )}
              </span>
              {option.active && (
                <Icon
                  name="checkmark.circle.fill"
                  className="ml-auto size-[15px] shrink-0 text-(--color-primary-blue)"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
