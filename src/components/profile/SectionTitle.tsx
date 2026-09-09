/* Section heading above a profile card — port of ProfileView.sectionTitle:
   11px, heaviest weight, uppercase, wide tracking, muted. Small enough to read
   as a label rather than competing with the card content below it. */
interface SectionTitleProps {
  children: string;
  /** Danger zone uses the same shape in red. */
  tone?: 'default' | 'danger';
}

export const SectionTitle = ({ children, tone = 'default' }: SectionTitleProps) => (
  <h2
    className={`pl-1.5 text-[11px] font-black tracking-[0.8px] uppercase ${
      tone === 'danger'
        ? 'text-(--color-profile-danger)'
        : 'text-(--color-text-secondary)'
    }`}
  >
    {children}
  </h2>
);
