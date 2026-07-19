/* "Continue reading" hero card — web port of ReadingContinueReadingCardView.
   Shown for the single most-recent unfinished text. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { findLanguage } from '@/lib/essayTypes';
import type { ReadingLibraryItem } from '@/lib/models';

interface ContinueReadingCardProps {
  item: ReadingLibraryItem;
  onContinue: () => void;
}

export const ContinueReadingCard = ({ item, onContinue }: ContinueReadingCardProps) => {
  const { t } = useTranslation();
  const percent = Math.round(item.progress * 100);

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#21A8BD]/12">
          <Icon name="book.fill" className="size-[20px] text-[#21A8BD]" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wide text-(--color-muted-text)">
            {t('reading.continue.eyebrow')}
          </span>
          <h2 className="line-clamp-2 text-[16px] font-bold text-(--color-primary-blue-dark)">
            {item.title}
          </h2>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-(--color-goal-bg) px-2 py-0.5 text-[11px] font-bold text-(--color-text-secondary)">
          {findLanguage(item.languageCode).title}
        </span>
        <span className="rounded-full bg-(--color-goal-bg) px-2 py-0.5 text-[11px] font-bold text-(--color-text-secondary)">
          {item.detectedDifficulty}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="shrink-0 text-[12px] font-semibold text-(--color-text-secondary)">
          {t('reading.continue.percent', { percent })}
        </span>
        <div className="h-[6px] w-full overflow-hidden rounded-full bg-(--color-goal-bg)">
          <div
            className="h-full rounded-full bg-[#21A8BD]"
            style={{ width: `${Math.max(percent, 4)}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="h-11 w-fit rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-6 text-[14px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
      >
        {t('reading.continue.button')} →
      </button>
    </section>
  );
};
