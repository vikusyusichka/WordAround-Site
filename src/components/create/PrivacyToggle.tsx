/* Private / Public segmented control for the set wizard. Painted with the
   set's chosen theme, so the selected pill follows the colour the user picked
   instead of standing out in the app blue. */
import { useTranslation } from 'react-i18next';
import { Globe, LockSimple } from '@phosphor-icons/react';

import type { SetTheme } from '@/lib/setColors';

type Privacy = 'Private' | 'Public';

interface PrivacyToggleProps {
  value: Privacy;
  onChange: (value: Privacy) => void;
  theme: SetTheme;
}

export const PrivacyToggle = ({ value, onChange, theme }: PrivacyToggleProps) => {
  const { t } = useTranslation();
  const options: { key: Privacy; labelKey: string; icon: React.ReactNode }[] = [
    { key: 'Private', labelKey: 'createSet.private', icon: <LockSimple size={16} weight="fill" /> },
    { key: 'Public', labelKey: 'createSet.public', icon: <Globe size={16} weight="bold" /> },
  ];

  return (
    <div
      className="inline-flex rounded-2xl border p-1 transition-colors"
      style={{ background: theme.fieldBackground, borderColor: theme.softBorderColor }}
      role="radiogroup"
    >
      {options.map((opt) => {
        const selected = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.key)}
            className={[
              'flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-semibold transition-colors',
              selected ? '' : 'hover:bg-black/[0.03]',
            ].join(' ')}
            style={
              selected
                ? { background: theme.softAccent, color: theme.accent }
                : { color: theme.mutedTextColor }
            }
          >
            {opt.icon}
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
};
