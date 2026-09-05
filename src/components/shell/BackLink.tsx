/* The "back to where I came from" control on a detail screen.

   The notes screens each carried their own version of this — a bare text link
   with a literal "←" typed into the string — which read as body copy rather
   than something to press, and matched nothing else in the app.

   The shape here is the one the library screens already use for their small
   controls (the reorder button, the filter chips): a 36px white pill with a
   hairline border and bold 13px label. The chevron slides left on hover,
   which is the only flourish it needs. */
import { Icon } from '@/components/primitives/Icon';

interface BackLinkProps {
  /** Where it goes, named — "Notes", the topic's title. */
  label: string;
  onClick: () => void;
  className?: string;
}

export const BackLink = ({ label, onClick, className = '' }: BackLinkProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex h-9 w-fit shrink-0 items-center gap-1.5 rounded-full border border-(--color-auth-field-border) bg-white pr-3.5 pl-2.5 text-[13px] font-bold text-(--color-text-secondary) shadow-[0_2px_6px_rgba(0,0,0,0.04)] transition-colors hover:bg-black/[0.03] hover:text-(--color-primary-blue) focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none ${className}`}
  >
    <Icon
      name="chevron.left"
      className="size-[13px] shrink-0 transition-transform group-hover:-translate-x-0.5"
    />
    <span className="max-w-[220px] truncate">{label}</span>
  </button>
);
