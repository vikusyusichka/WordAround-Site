/* "Mistakes to fix" / "Weak quiz areas" — port of the two highlight sections
   on the iOS Notes home. A horizontally scrolling row of review items; each
   card opens the note it came from. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { GrammarReviewItem } from '@/lib/models';

interface ReviewHighlightsRowProps {
  title: string;
  subtitle: string;
  accent: string;
  items: GrammarReviewItem[];
  onOpen: (item: GrammarReviewItem) => void;
}

export const ReviewHighlightsRow = ({
  title,
  subtitle,
  accent,
  items,
  onOpen,
}: ReviewHighlightsRowProps) => {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[15px] font-black text-(--color-primary-blue-dark) lg:text-[17px]">
          {title}
        </h2>
        <p className="text-[12px] font-semibold text-(--color-text-secondary)">{subtitle}</p>
      </div>

      <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item)}
            className="flex w-[230px] shrink-0 flex-col gap-2 rounded-[20px] border border-white bg-white/95 p-3.5 text-left shadow-[0_4px_10px_rgba(0,0,0,0.045)] transition-transform hover:-translate-y-px focus-visible:outline-none"
          >
            <span
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide"
              style={{ color: accent }}
            >
              <Icon
                name={item.sourceType === 'quiz' ? 'questionmark.circle.fill' : 'exclamationmark.triangle.fill'}
                className="size-[11px]"
              />
              {t(`writing.grammar.review.sourceType.${item.sourceType}`)}
            </span>
            <span className="line-clamp-2 text-[14px] font-bold text-(--color-primary-blue-dark)">
              {item.title || t('writing.grammar.review.untitled')}
            </span>
            {item.previewText && (
              <span className="line-clamp-2 text-[11px] font-semibold text-(--color-text-secondary)">
                {item.previewText}
              </span>
            )}
            {item.mistakeCount > 0 && (
              <span className="text-[10px] font-bold text-(--color-muted-text)">
                {t('writing.grammar.review.mistakeCount', { count: item.mistakeCount })}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
};
