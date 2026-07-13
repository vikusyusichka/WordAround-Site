/* Chip list of previously requested AI hints. Each chip: category badge
   + hint text. Empty when no hints have been requested yet. */
import { useTranslation } from 'react-i18next';

import type { EssayGeneratedHint, EssayHintCategory } from '@/lib/essayTypes';

/* Category → accent color for the badge. Kept in-file rather than a token
   map so the map lives next to the component that owns it. */
const CATEGORY_COLOR: Record<EssayHintCategory, { bg: string; text: string }> = {
  content:    { bg: 'var(--color-goal-bg)', text: 'var(--color-primary-blue-dark)' },
  grammar:    { bg: 'var(--color-cs-soft-red)', text: 'var(--color-cs-dark-red)' },
  vocabulary: { bg: '#FFF3D6', text: 'var(--color-orange-title)' },
  structure:  { bg: 'var(--color-green-soft-bg)', text: 'var(--color-green-title)' },
};

interface EssayHintsListProps {
  hints: EssayGeneratedHint[];
}

export const EssayHintsList = ({ hints }: EssayHintsListProps) => {
  const { t } = useTranslation();
  if (hints.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {hints.map((h) => {
        const color = CATEGORY_COLOR[h.category];
        return (
          <div
            key={h.id}
            className="flex items-start gap-3 rounded-2xl border border-white bg-white/95 px-4 py-3 shadow-[0_4px_10px_rgba(0,0,0,0.045)] md:px-5"
          >
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide md:text-[12px]"
              style={{ background: color.bg, color: color.text }}
            >
              {t(`writing.essays.hint.category.${h.category}`)}
            </span>
            <span className="text-[14px] font-medium leading-snug text-(--color-primary-blue-dark) md:text-[15px]">
              {h.text}
            </span>
          </div>
        );
      })}
    </div>
  );
};
