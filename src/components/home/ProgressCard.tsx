/* Progress card — port of ProgressCardView (goal + action layouts). Colors and
   values come from a HomeSetPreviewItem; title/subtitle are passed in so the
   caller can localize. Decorative ProgressBlobShape sits top-trailing. */
import { Icon } from '@/components/primitives/Icon';
import { ProgressBlobShape } from '@/components/home/blobs';
import type { HomeSetPreviewItem } from '@/lib/homeTypes';

interface ProgressCardProps {
  item: HomeSetPreviewItem;
  layout: 'goal' | 'action';
  title: string;
  subtitle: string;
  /** action layout only — trailing button glyph (e.g. arrow.right). */
  actionSystemName?: string;
  onClick?: () => void;
  /** Sits four-across from xl up (the home grid): scale the goal layout back
      down there, or the number and the icon would collide. */
  dense?: boolean;
}

const ProgressBar = ({
  progress,
  tint,
  track,
}: {
  progress: number;
  tint: string;
  track: string;
}) => (
  <div
    className="h-[7px] w-full overflow-hidden rounded-full md:h-2.5"
    style={{ background: track }}
  >
    <div
      className="h-full rounded-full"
      style={{ width: `${Math.max(0, Math.min(progress, 1)) * 100}%`, background: tint }}
    />
  </div>
);

export const ProgressCard = ({
  item,
  layout,
  title,
  subtitle,
  actionSystemName,
  onClick,
  dense = false,
}: ProgressCardProps) => {
  /* Appended only for a dense card, so every other caller is untouched. */
  const d = (classes: string) => (dense ? classes : '');
  const heightClass =
    layout === 'goal'
      ? `h-[170px] md:h-[230px] ${d('xl:h-[188px]')}`
      : 'h-[130px] md:h-[190px]';

  const shell = (
    <div
      className={`relative w-full overflow-hidden rounded-[22px] border border-white/95 shadow-[0_6px_10px_rgba(0,0,0,0.035)] md:rounded-[30px] ${heightClass}`}
      style={{ background: item.backgroundColor }}
    >
      {/* Decorative blob — top-trailing, overshoots the right edge. */}
      <div className="absolute top-0 right-0 flex justify-end">
        <ProgressBlobShape
          color={item.blobColor}
          opacity={0.9}
          className={
            layout === 'goal'
              ? `mr-[-24px] mt-5 h-[170px] w-[170px] md:h-[280px] md:w-[250px] ${d('xl:h-[214px] xl:w-[190px]')}`
              : 'mr-[-24px] mt-[-16px] h-[56px] w-[180px] md:h-[70px] md:w-[270px]'
          }
        />
      </div>

      {layout === 'goal' ? (
        <div className="relative flex h-full items-center">
          <div
            className={`flex flex-1 flex-col gap-2 py-4 pr-[112px] pl-[18px] md:gap-3 md:py-6 md:pr-[180px] md:pl-7 ${d('xl:gap-2.5 xl:py-5 xl:pr-[124px] xl:pl-5')}`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[15px] font-semibold md:text-[21px] ${d('xl:text-[17px]')}`}
                style={{ color: item.titleColor }}
              >
                {title}
              </span>
              <Icon
                name="sparkles"
                className={`size-[9px] md:size-3 ${d('xl:size-[10px]')}`}
                style={{ color: 'var(--color-home-goal-sparkle)' }}
              />
            </div>

            <div className="flex items-baseline gap-[3px]">
              <span
                className={`text-[38px] font-bold md:text-[56px] ${d('xl:text-[42px]')}`}
                style={{ color: item.valueColor }}
              >
                {item.currentValue}
              </span>
              <span
                className={`text-[15px] font-medium md:text-[25px] ${d('xl:text-[18px]')}`}
                style={{ color: item.subtitleColor }}
              >
                / {item.totalValue} {item.unit}
              </span>
            </div>

            <div
              className={`flex w-[116px] flex-col gap-1.5 md:w-[190px] md:gap-2.5 ${d('xl:w-[132px] xl:gap-2')}`}
            >
              <ProgressBar
                progress={item.progress}
                tint={item.accentColor}
                track={item.progressBackgroundColor}
              />
              <span
                className={`text-[15px] font-medium md:text-[18px] ${d('xl:text-[15px]')}`}
                style={{ color: item.accentColor }}
              >
                {subtitle}
              </span>
            </div>
          </div>

          {/* Icon container — trailing. */}
          <div
            className={`absolute right-2 flex size-[136px] items-center justify-center md:right-[18px] md:size-[180px] ${d('xl:right-3 xl:size-[138px]')}`}
          >
            <div
              className={`grid size-[78px] place-items-center rounded-full md:size-[98px] ${d('xl:size-[80px]')}`}
              style={{ background: item.iconBackground, opacity: 0.96 }}
            >
              <Icon
                name={item.iconSystemName}
                className={`size-[29px] md:size-[34px] ${d('xl:size-[30px]')}`}
                style={{ color: item.accentColor }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full items-center gap-3 px-4 py-[18px] md:gap-5 md:px-6 md:py-6">
          <div
            className="grid size-[52px] shrink-0 place-items-center rounded-full md:size-[74px]"
            style={{ background: item.iconBackground }}
          >
            <Icon
              name={item.iconSystemName}
              className="size-5 text-white md:size-7"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:gap-2.5">
            <span
              className="truncate text-[25px] font-bold md:text-[34px]"
              style={{ color: item.titleColor }}
            >
              {title}
            </span>
            <span
              className="truncate text-[17px] font-medium md:text-[20px]"
              style={{ color: item.accentColor }}
            >
              {subtitle}
            </span>
            <ProgressBar
              progress={item.progress}
              tint={item.accentColor}
              track={item.progressBackgroundColor}
            />
            <span
              className="text-[15px] font-medium md:text-[18px]"
              style={{ color: item.subtitleColor }}
            >
              {item.currentValue} / {item.totalValue} {item.unit}
            </span>
          </div>

          {actionSystemName && (
            <div
              className="grid size-[46px] shrink-0 place-items-center rounded-[14px] md:size-[62px] md:rounded-[18px]"
              style={{ background: item.accentColor }}
            >
              <Icon name={actionSystemName} className="size-[18px] text-white md:size-6" />
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left">
        {shell}
      </button>
    );
  }
  return shell;
};
