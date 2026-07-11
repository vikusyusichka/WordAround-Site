import type { ReactNode } from 'react';

interface ScreenProps {
  children: ReactNode;
  /** When true, the content column is centered and capped at a max width for wide viewports. */
  centered?: boolean;
  className?: string;
}

/* Web equivalent of a SwiftUI top-level VStack inside an .ignoresSafeArea ZStack.
   Applies the app background, horizontal padding, and (optionally) a max-width
   column that matches Layout.contentMaxWidthPad on ≥700px screens. */
export const Screen = ({ children, centered = false, className }: ScreenProps) => {
  return (
    <main
      className={[
        'min-h-dvh w-full bg-(--color-app-bg)',
        'px-(--spacing-screen-x) pt-(--spacing-home-top)',
        'text-(--color-primary-blue-dark)',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={
          centered
            ? 'mx-auto w-full max-w-[620px] md:max-w-[760px]'
            : 'w-full'
        }
      >
        {children}
      </div>
    </main>
  );
};
