/* Caps and centers page content so it doesn't stretch edge-to-edge on wide
   desktops, with responsive gutters. Used by every shell page. */
import type { CSSProperties, ReactNode } from 'react';

interface ContentContainerProps {
  children: ReactNode;
  /** Full-bleed: fill the whole content area instead of capping + centering. */
  fluid?: boolean;
  className?: string;
  /** Paint the page in a mode's colours: every brand-blue text, title and
      link inside takes the accent instead. Used by the practice setup screens,
      where blue writing clashed with a green, orange or purple mode. */
  accent?: { accent: string; accentDark: string };
}

export const ContentContainer = ({
  children,
  fluid = false,
  className,
  accent,
}: ContentContainerProps) => {
  const style = accent
    ? ({
        '--color-primary-blue': accent.accent,
        '--color-primary-blue-dark': accent.accentDark,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={[
        'mx-auto w-full px-5 py-6 sm:px-8 lg:px-10 lg:py-8',
        fluid ? '' : 'max-w-(--size-content-max)',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {children}
    </div>
  );
};
