/* Set row — port of SetItemView. Icon circle + title/subtitle, optional
   trailing text + chevron, decorative SetCardBlobShape on the right. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { SetCardBlobShape } from '@/components/home/blobs';
import type { HomeSetPreviewItem } from '@/lib/homeTypes';

interface SetItemProps {
  item: HomeSetPreviewItem;
  /** Optional trailing label (e.g. "Review"). */
  trailingText?: string;
  showsArrow?: boolean;
}

export const SetItem = ({ item, trailingText, showsArrow = true }: SetItemProps) => {
  const { t } = useTranslation();

  return (
    <div
      className="relative h-[86px] w-full overflow-hidden rounded-[22px] border border-white/95 shadow-[0_6px_10px_rgba(0,0,0,0.04)] md:h-[104px] md:rounded-[30px]"
      style={{ background: item.backgroundColor }}
    >
      {/* Decorative blob — right side. */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <SetCardBlobShape
          color={item.blobColor}
          opacity={0.85}
          className="h-[62px] w-[92px] translate-x-[22px] translate-y-[14px] md:h-[86px] md:w-[130px] md:translate-x-[28px] md:translate-y-[18px]"
        />
      </div>

      <div className="relative flex h-full items-center gap-3 px-3.5 py-3.5 md:gap-4 md:px-[18px] md:py-[18px]">
        <div
          className="grid size-[46px] shrink-0 place-items-center rounded-full md:size-[62px]"
          style={{ background: item.accentColor, opacity: 0.95 }}
        >
          <Icon name={item.iconSystemName} className="size-[18px] text-white md:size-6" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:gap-[7px]">
          <span
            className="truncate text-[18px] font-bold md:text-2xl"
            style={{ color: item.titleColor }}
          >
            {item.title}
          </span>
          <span
            className="truncate text-[13px] font-medium md:text-base"
            style={{ color: item.accentColor }}
          >
            {item.subtitle}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-[5px]">
          {trailingText && (
            <span
              className="text-[12px] font-medium md:text-base"
              style={{ color: item.accentColor }}
            >
              {trailingText}
            </span>
          )}
          {showsArrow && (
            <Icon
              name="chevron.right"
              className="size-[11px] md:size-[15px]"
              style={{ color: item.accentColor }}
              aria-label={t('home.review')}
            />
          )}
        </div>
      </div>
    </div>
  );
};
