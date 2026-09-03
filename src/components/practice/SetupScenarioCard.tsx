/* Selectable scenario card — ports iOS convSetupScenarioCard*: an icon circle,
   title and description in a soft card that fills with the accent when picked.
   Radius 18 / 22@lg, min-height 136 / 158, icon circle 42 / 50.
   Used by the AI-Conversation setup's scenario grid. */
import type { CSSProperties } from 'react';

import { Icon } from '@/components/primitives/Icon';

interface SetupScenarioCardProps {
  title: string;
  description: string;
  icon?: string;
  selected: boolean;
  accent?: string;
  accentDark?: string;
  onClick: () => void;
}

const withAlpha = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const SetupScenarioCard = ({
  title,
  description,
  icon,
  selected,
  accent,
  accentDark,
  onClick,
}: SetupScenarioCardProps) => {
  const a = accent ?? 'var(--color-primary-blue)';
  const aDark = accentDark ?? 'var(--color-primary-blue-dark)';

  const cardStyle: CSSProperties = selected
    ? { background: a, borderColor: 'transparent', boxShadow: `0 8px 16px ${withAlpha(a, 24)}` }
    : { background: withAlpha(a, 8), borderColor: withAlpha(a, 20) };

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className="flex min-h-[136px] flex-col gap-2 rounded-[18px] border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:brightness-[0.99] active:translate-y-0 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      style={cardStyle}
    >
      {icon && (
        <span
          className="grid size-[42px] shrink-0 place-items-center rounded-full"
          style={{ background: selected ? 'rgba(255,255,255,0.22)' : withAlpha(a, 12) }}
        >
          <Icon
            name={icon}
            className="size-[18px]"
            style={{ color: selected ? '#fff' : a }}
          />
        </span>
      )}

      <span
        className="mt-auto text-[14px] font-bold"
        style={{ color: selected ? '#fff' : aDark }}
      >
        {title}
      </span>
      <span
        className="text-[12px] font-medium"
        style={{ color: selected ? 'rgba(255,255,255,0.92)' : 'var(--color-text-secondary)' }}
      >
        {description}
      </span>
    </button>
  );
};
