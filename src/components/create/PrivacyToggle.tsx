/* Private / Public segmented control for the set wizard. */
import { useTranslation } from 'react-i18next';
import { Globe, LockSimple } from '@phosphor-icons/react';

type Privacy = 'Private' | 'Public';

interface PrivacyToggleProps {
  value: Privacy;
  onChange: (value: Privacy) => void;
}

export const PrivacyToggle = ({ value, onChange }: PrivacyToggleProps) => {
  const { t } = useTranslation();
  const options: { key: Privacy; labelKey: string; icon: React.ReactNode }[] = [
    { key: 'Private', labelKey: 'createSet.private', icon: <LockSimple size={16} weight="fill" /> },
    { key: 'Public', labelKey: 'createSet.public', icon: <Globe size={16} weight="bold" /> },
  ];

  return (
    <div className="inline-flex rounded-2xl border border-(--color-auth-field-border) bg-white p-1" role="radiogroup">
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
              selected
                ? 'bg-(--color-home-nav-sel-bg) text-(--color-home-brand)'
                : 'text-(--color-cs-text-muted) hover:bg-black/[0.03]',
            ].join(' ')}
          >
            {opt.icon}
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
};
