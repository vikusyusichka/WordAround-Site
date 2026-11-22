/* Phone-only round "back" button — the same 36px white circle with a bold
   chevron as the profile sub-screens (ProfileSubScreenHeader).

   Replaces the "← Listening" text links the practice screens used to carry.
   Shown on phones only (below `sm`), where a thumb needs an obvious way out;
   on a tablet or desktop the sidebar or the menu and the browser's own back
   already cover it. The label is kept for screen readers only. */
import { Icon } from '@/components/primitives/Icon';

interface MobileBackButtonProps {
  /** Where it goes, named — read out by screen readers. */
  label: string;
  onClick: () => void;
  className?: string;
}

export const MobileBackButton = ({ label, onClick, className = '' }: MobileBackButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`grid size-9 shrink-0 place-items-center rounded-full bg-(--color-surface)/[0.88] text-(--color-primary-blue-dark) shadow-[0_5px_10px_rgba(0,0,0,0.04)] transition-colors hover:bg-(--color-surface) focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none sm:hidden ${className}`}
  >
    <Icon name="chevron.left" className="size-[15px]" weight="bold" />
  </button>
);
