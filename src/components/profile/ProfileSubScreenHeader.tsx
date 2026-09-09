/* Header for a profile sub-screen — port of ProfileSubScreenHeader
   (ProfileCardStyle.swift): a round 36px white back button, a 22px heavy
   title, and a 13px bold subtitle.

   Only shown below lg. From lg the sub-screens sit beside a rail of all the
   sections, so "back" is redundant — the way out is visible on screen. */
import { useNavigate } from '@tanstack/react-router';

import { Icon } from '@/components/primitives/Icon';

interface ProfileSubScreenHeaderProps {
  title: string;
  subtitle?: string;
  backLabel: string;
}

export const ProfileSubScreenHeader = ({
  title,
  subtitle,
  backLabel,
}: ProfileSubScreenHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-start gap-3.5">
      <button
        type="button"
        aria-label={backLabel}
        onClick={() => void navigate({ to: '/profile' })}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-(--color-surface)/[0.88] text-(--color-primary-blue-dark) shadow-[0_5px_10px_rgba(0,0,0,0.04)] transition-colors hover:bg-(--color-surface) focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
      >
        <Icon name="chevron.left" className="size-[15px]" weight="bold" />
      </button>

      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-[22px] font-black text-(--color-primary-blue-dark)">{title}</h2>
        {subtitle && (
          <p className="text-[13px] leading-[1.45] font-bold text-(--color-text-secondary)">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
