/* Per-page header: title + subtitle, with an optional right-aligned actions
   slot. Copy is passed in by each page (derived from the route via
   src/lib/navigation.ts). Replaces the in-content iOS HomeHeader. */
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const PageHeader = ({ title, subtitle, actions }: PageHeaderProps) => {
  return (
    /* Stacked on a phone, side by side once there is room. Sharing one line
       with the actions left the title of a busy screen — the note editor
       carries eight buttons — squeezed into a two-word column beside them. */
    <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4 lg:mb-8">
      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-1">
        <h1 className="text-[28px] font-bold text-(--color-primary-blue-dark) lg:text-[34px]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[15px] font-medium text-(--color-muted-text) lg:text-[17px]">
            {subtitle}
          </p>
        )}
      </div>
      {/* Allowed to shrink and wrap. With `shrink-0` a header carrying many
          buttons could not wrap them, so it overflowed and scrolled the whole
          page sideways on a phone. The capped share keeps a busy header
          wrapping its buttons onto a second line rather than squeezing the
          title into a narrow column beside them. */}
      {actions && (
        <div className="flex w-full min-w-0 shrink flex-wrap items-center gap-2 sm:w-auto sm:max-w-[62%] sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
};
