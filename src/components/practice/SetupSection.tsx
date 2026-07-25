/* One labelled section on a practice-setup screen — ports iOS
   SpeakingSetupSectionTitle + ReadingSetupSectionCard: a big bold heading in
   the mode's accent-dark, an optional subtitle, the control, and an optional
   helper line. Replaces the tiny grey uppercase micro-labels the web used to
   hand-roll in every setup route.

   Heading follows iOS homeSectionTitleSize exactly: 22px on phone, 34px at the
   pad breakpoint (md = 700px, the project's isPadLike boundary). */
import type { CSSProperties, ReactNode } from 'react';

interface SetupSectionProps {
  title: string;
  subtitle?: string;
  helper?: string;
  /** accent-dark for the heading (defaults to primary blue dark). */
  accentDark?: string;
  children: ReactNode;
}

export const SetupSection = ({
  title,
  subtitle,
  helper,
  accentDark,
  children,
}: SetupSectionProps) => {
  const headingStyle: CSSProperties = { color: accentDark ?? 'var(--color-primary-blue-dark)' };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] font-bold md:text-[34px]" style={headingStyle}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-[13px] font-medium text-(--color-text-secondary)">{subtitle}</p>
        )}
      </div>

      {children}

      {helper && <p className="text-[12px] font-medium text-(--color-muted-text)">{helper}</p>}
    </section>
  );
};
