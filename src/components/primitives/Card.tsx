import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Card corner radius variant — matches Layout.swift naming. */
  radius?: 'card' | 'card-sm' | 'stat' | 'set-item' | 'fc-card';
  /** Background: white (0.95 alpha) mirrors AppColors.cardWhite; solid uses the token. */
  surface?: 'white' | 'blob-blue' | 'goal-bg' | 'fc-card-bg';
}

const RADIUS_CLASS: Record<NonNullable<CardProps['radius']>, string> = {
  card: 'rounded-(--radius-card)',
  'card-sm': 'rounded-(--radius-card-sm)',
  stat: 'rounded-(--radius-stat-card)',
  'set-item': 'rounded-(--radius-set-item)',
  'fc-card': 'rounded-(--radius-fc-card)',
};

const SURFACE_CLASS: Record<NonNullable<CardProps['surface']>, string> = {
  white: 'bg-(--color-card-white)',
  'blob-blue': 'bg-(--color-blob-blue)',
  'goal-bg': 'bg-(--color-goal-bg)',
  'fc-card-bg': 'bg-(--color-fc-card-bg)',
};

/* Reusable Card container. Every SwiftUI RoundedRectangle(cornerRadius:).fill(...)
   collapses to <Card radius="..." surface="..."> here. */
export const Card = ({
  children,
  radius = 'card',
  surface = 'white',
  className,
  ...rest
}: CardProps) => {
  return (
    <div
      className={[
        RADIUS_CLASS[radius],
        SURFACE_CLASS[surface],
        'shadow-[0_10px_30px_var(--shadow-color-card)]',
        'p-(--spacing-card-inner)',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
};
