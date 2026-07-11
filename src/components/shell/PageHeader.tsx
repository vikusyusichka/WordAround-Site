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
    <div className="mb-6 flex items-start justify-between gap-4 lg:mb-8">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-[28px] font-bold text-(--color-primary-blue-dark) lg:text-[34px]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[15px] font-medium text-(--color-muted-text) lg:text-[17px]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
};
