/* Setup start button — ports iOS SpeakingSetupStartButton: full-width (capped
   720px), height 52 / 58@lg, radius 18 / 22, bold 16 / 18 label with a leading
   icon, an accent→accentDark gradient and an accent-30% drop shadow. */
import type { CSSProperties } from 'react';

import { Icon } from '@/components/primitives/Icon';

interface StartButtonProps {
  label: string;
  icon: string;
  accent?: string;
  accentDark?: string;
  disabled?: boolean;
  onClick: () => void;
}

const withAlpha = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const StartButton = ({
  label,
  icon,
  accent,
  accentDark,
  disabled,
  onClick,
}: StartButtonProps) => {
  const a = accent ?? 'var(--color-primary-blue)';
  const aDark = accentDark ?? 'var(--color-primary-blue-dark)';

  const style: CSSProperties = {
    background: `linear-gradient(135deg, ${a}, ${aDark})`,
    boxShadow: `0 8px 16px ${withAlpha(a, 30)}`,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-[52px] w-full max-w-[720px] items-center justify-center gap-2 rounded-[18px] text-[16px] font-bold text-white transition-transform hover:brightness-105 active:scale-[0.99] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:h-[58px] lg:rounded-[22px] lg:text-[18px]"
      style={style}
    >
      <Icon name={icon} className="size-[15px] lg:size-[17px]" />
      <span>{label}</span>
    </button>
  );
};
