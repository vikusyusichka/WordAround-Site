import type { ReactNode } from 'react';

interface SectionTitleProps {
  children: ReactNode;
  className?: string;
}

/* Matches the "Continue learning" / "Your sets" style used all over Home:
   .font(.system(size: Layout.homeSectionTitleSize, weight: .bold, design: .rounded))
   .foregroundColor(AppColors.primaryBlueDark) */
export const SectionTitle = ({ children, className }: SectionTitleProps) => {
  return (
    <h2
      className={[
        'text-(length:--text-large-title) font-bold',
        'text-(--color-primary-blue-dark)',
        'pt-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </h2>
  );
};
