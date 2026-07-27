/* Option pill + group — ports iOS ReadingOptionPill / SpeakingSetupDurationPicker.
   Selected: solid accent fill, white text, accent glow. Unselected: accent-10%
   fill, accent-dark text, accent-22% border. Height 44 / 50@lg, radius 18 / 20,
   bold 14 / 16, equal width across the row. Web adds hover + focus states.

   accent / accentDark are per-screen (blue Reading, green Free Speaking, …), so
   they come in as props rather than tokens. */
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
        boxShadow: `0 4px 10px ${withAlpha(a, 22)}`,
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
      className="h-11 flex-1 rounded-[16px] border text-[14px] font-bold transition-all hover:brightness-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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
  /** Columns for a wrapping grid; omit for a single equal-width row. */
  columns?: number;
}

export const OptionPillGroup = <T extends string>({
  options,
  value,
  onChange,
  accent,
  accentDark,
  columns,
}: OptionPillGroupProps<T>) => {
  const style: CSSProperties = columns
    ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 10 }
    : { display: 'flex', gap: 10 };

  return (
    <div style={style}>
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
};
