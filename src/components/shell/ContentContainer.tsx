/* Caps and centers page content so it doesn't stretch edge-to-edge on wide
   desktops, with responsive gutters. Used by every shell page. */
import type { ReactNode } from 'react';

interface ContentContainerProps {
  children: ReactNode;
  /** Full-bleed: fill the whole content area instead of capping + centering. */
  fluid?: boolean;
  className?: string;
}

export const ContentContainer = ({ children, fluid = false, className }: ContentContainerProps) => {
  return (
    <div
      className={[
        'mx-auto w-full px-5 py-6 sm:px-8 lg:px-10 lg:py-8',
        fluid ? '' : 'max-w-(--size-content-max)',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
};
