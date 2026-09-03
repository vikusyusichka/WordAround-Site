/* Option pill + group for the practice-setup screens. Web-native, responsive:
   pills are their natural (content) width and wrap to fill the available row,
   so a setup screen can use the full content width instead of a narrow column.
   Selected = solid accent fill + glow; unselected = accent-10% fill + border. */
import type { CSSProperties } from 'react';

interface OptionPillProps {
  label: string;
  selected: boolean;
  accent?: string;
  accentDark?: string;
  onClick: () => void;
}

const withAlpha = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const OptionPill = ({ label, selected, accent, accentDark, onClick }: OptionPillProps) => {
  const a = accent ?? 'var(--color-primary-blue)';
  const aDark = accentDark ?? 'var(--color-primary-blue-dark)';

  const style: CSSProperties = selected
    ? {
        background: a,
        color: '#fff',
        borderColor: 'transparent',
        boxShadow: `0 4px 12px ${withAlpha(a, 24)}`,
      }
    : {
        background: withAlpha(a, 10),
        color: aDark,
        borderColor: withAlpha(a, 22),
      };

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className="h-11 shrink-0 rounded-full border px-6 text-[14px] font-bold transition-all duration-200 hover:brightness-[0.98] active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      style={style}
    >
      {label}
    </button>
  );
};

interface OptionPillGroupProps<T extends string> {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  accent?: string;
  accentDark?: string;
  /** Ignored — kept for call-site compatibility. Pills now always wrap. */
  columns?: number;
}

export const OptionPillGroup = <T extends string>({
  options,
  value,
  onChange,
  accent,
  accentDark,
}: OptionPillGroupProps<T>) => (
  <div className="flex flex-wrap gap-2.5">
    {options.map((opt) => (
      <OptionPill
        key={opt.id}
        label={opt.label}
        selected={opt.id === value}
        accent={accent}
        accentDark={accentDark}
        onClick={() => onChange(opt.id)}
      />
    ))}
  </div>
);
