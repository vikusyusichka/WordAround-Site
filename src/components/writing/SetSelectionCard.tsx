/* One row in the Set Selection modal: icon circle + title + subtitle + word
   count. Rendered as a button so the parent modal can react to the choice and
   navigate. Web port of WritingSetCardView, using set-theme colors via the
   existing mapSetToPreview helper. */
import { Icon } from '@/components/primitives/Icon';
import type { HomeSetPreviewItem } from '@/lib/homeTypes';

interface SetSelectionCardProps {
  preview: HomeSetPreviewItem;
  wordsCountLabel: string;
  onClick: () => void;
}

export const SetSelectionCard = ({ preview, wordsCountLabel, onClick }: SetSelectionCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-[22px] border border-white bg-white/95 p-3 text-left shadow-[0_4px_10px_rgba(0,0,0,0.045)] transition-transform hover:-translate-y-px active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--color-home-brand) md:rounded-[26px] md:p-4"
  >
    <div
      className="grid size-[48px] shrink-0 place-items-center rounded-full md:size-[58px]"
      style={{ background: preview.iconBackground }}
    >
      <Icon
        name={preview.iconSystemName}
        className="size-[22px] text-white md:size-[26px]"
      />
    </div>

    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span
        className="truncate text-[16px] font-bold md:text-[18px]"
        style={{ color: preview.titleColor }}
      >
        {preview.title}
      </span>
      <span className="truncate text-[13px] font-medium text-(--color-text-secondary) md:text-[14px]">
        {preview.subtitle}
      </span>
    </div>

    <span
      className="shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold md:text-[13px]"
      style={{ background: preview.progressBackgroundColor, color: preview.accentColor }}
    >
      {wordsCountLabel}
    </span>
  </button>
);
