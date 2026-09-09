/* A section heading with its own actions — port of
   GrammarNotesHomeView.sectionHeader + sectionActionButton.

   The actions sit with the heading rather than in the page header because they
   act on that section: "Arrange" rearranges these topics, "New topic" adds to
   this list. A control in the page header reads as acting on the page. */
import type { ReactNode } from 'react';

interface GrammarSectionHeaderProps {
  title: string;
  /** Rendered after the action buttons — e.g. the list/grid toggle. */
  children?: ReactNode;
  actions?: SectionAction[];
}

export interface SectionAction {
  id: string;
  label: string;
  /** Filled blue while the mode it toggles is on (iOS isFilled). */
  isActive?: boolean;
  onClick: () => void;
}

export const GrammarSectionHeader = ({
  title,
  actions = [],
  children,
}: GrammarSectionHeaderProps) => (
  <div className="flex flex-wrap items-center gap-2">
    <h2 className="text-[17px] font-black text-(--color-primary-blue-dark) lg:text-[20px]">
      {title}
    </h2>

    <span className="ml-auto flex flex-wrap items-center gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          aria-pressed={action.isActive}
          onClick={action.onClick}
          className={`h-9 rounded-full px-3.5 text-[12px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none lg:text-[13px] ${
            action.isActive
              ? 'bg-(--color-primary-blue-solid) text-white'
              : 'border border-(--color-auth-field-border) bg-(--color-surface) text-(--color-primary-blue) hover:bg-(--color-home-nav-sel-bg)'
          }`}
        >
          {action.label}
        </button>
      ))}
      {children}
    </span>
  </div>
);
