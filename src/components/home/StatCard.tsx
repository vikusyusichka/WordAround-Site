/* Stat card — port of StatCardView. Fixed height 122, decorative blob +
   3 sparkles bottom-right, icon/title/value/subtitle top-left. iOS switches to
   an `isSmall` layout below 120px width; in the 3-across grid that maps cleanly
   to phone = small, pad = large, so we use the md: breakpoint (matches the
   isPadLike branch iOS actually renders on device). */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { StatBlobShape } from '@/components/home/blobs';
import type { StatCardItem } from '@/lib/homeTypes';

interface StatCardProps {
  item: StatCardItem;
}

export const StatCard = ({ item }: StatCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <div
        className="relative min-h-[122px] w-full overflow-hidden rounded-[20px] border border-white/95 shadow-[0_6px_10px_rgba(0,0,0,0.08)]"
        style={{ background: item.backgroundColor }}
      >
        {/* Decorative blob — bottom-trailing. small 64×54 / large 78×66. */}
        <StatBlobShape
          color={item.blobColor}
          opacity={0.78}
          className="absolute bottom-[13px] right-[-20px] h-[54px] w-[64px] md:bottom-[16px] md:right-[-24px] md:h-[66px] md:w-[78px]"
        />

        {/* Sparkles — sizes/offsets from statSparkleSize/Offset (small vs large). */}
        <Icon
          name="sparkle"
          className="absolute top-1/2 left-1/2 size-[8px] md:size-[10px]"
          style={{ color: item.accentColor, opacity: 0.42, transform: 'translate(-20px, -80px)' }}
        />
        <Icon
          name="sparkle"
          className="absolute top-1/2 left-1/2 size-[6px] md:size-[8px]"
          style={{ color: item.accentColor, opacity: 0.28, transform: 'translate(-42px, -48px)' }}
        />
        <Icon
          name="sparkle"
          className="absolute top-1/2 left-1/2 size-[5px] md:size-[7px]"
          style={{ color: item.accentColor, opacity: 0.34, transform: 'translate(-8px, -36px)' }}
        />

        {/* Content — top-leading. Tight line-heights keep the large variant
            inside the fixed 122px height (web text leading runs taller than
            SwiftUI's, which would otherwise clip the subtitle). */}
        <div className="relative flex flex-col items-start gap-[4px] pt-[10px] pr-2 pb-[12px] pl-[11px] md:gap-[6px] md:pt-[12px] md:pb-[14px] md:pl-[14px]">
          <div
            className="grid size-[34px] shrink-0 place-items-center rounded-full md:size-[40px]"
            style={{ background: item.accentColor, opacity: 0.9 }}
          >
            <Icon name={item.iconSystemName} className="size-[14px] text-white md:size-4" />
          </div>
          <span
            className="max-w-full truncate text-[10px] leading-none font-semibold md:text-[12px]"
            style={{ color: item.titleColor }}
          >
            {t(item.titleKey)}
          </span>
          <span
            className="text-[22px] leading-none font-bold md:text-[26px]"
            style={{ color: item.valueColor }}
          >
            {item.value}
          </span>
          <span
            className="max-w-full truncate text-[10px] leading-none font-semibold md:text-[11px]"
            style={{ color: item.subtitleColor }}
          >
            {t(item.subtitleKey)}
          </span>
        </div>
      </div>
    </div>
  );
};
