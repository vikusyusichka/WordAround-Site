/* Progress card — port of ProgressCardView (goal + action layouts). Colors and
   values come from a HomeSetPreviewItem; title/subtitle are passed in so the
   caller can localize. Decorative ProgressBlobShape sits top-trailing.

   Sizing follows the CONTAINER's width, not the viewport's: the same card is
   rendered full-bleed at the top of a practice block and four across on the
   home dashboard, and only the card knows how much room it actually got. A
   viewport breakpoint can't express that — a tablet showing two columns gives
   the card less room than a phone showing one. */
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
    className="h-[7px] w-full overflow-hidden rounded-full @min-[420px]:h-2.5"
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
}: ProgressCardProps) => {
  /* Three tiers: tight (four across), regular (two across or a phone) and
     full (a card on its own line). */
  const heightClass =
    layout === 'goal'
      ? 'h-[150px] @min-[300px]:h-[170px] @min-[420px]:h-[230px]'
      : 'h-[130px] @min-[420px]:h-[190px]';

  /* @container goes on a WRAPPER, never on the sized card itself: an element
     answers its nearest ANCESTOR container, so a card carrying both would
     query something else entirely (or nothing) and silently keep tier one. */
  const shell = (
    <div className="@container w-full">
      <div
        className={`relative w-full overflow-hidden rounded-[22px] border border-white/95 shadow-[0_6px_10px_rgba(0,0,0,0.035)] @min-[420px]:rounded-[30px] ${heightClass}`}
        style={{ background: item.backgroundColor }}
      >
        {/* Decorative blob — top-trailing, overshoots the right edge. */}
        <div className="absolute top-0 right-0 flex justify-end">
          <ProgressBlobShape
            color={item.blobColor}
            opacity={0.9}
            className={
              layout === 'goal'
                ? 'mt-4 mr-[-24px] h-[140px] w-[140px] @min-[300px]:mt-5 @min-[300px]:h-[170px] @min-[300px]:w-[170px] @min-[420px]:h-[280px] @min-[420px]:w-[250px]'
                : 'mt-[-16px] mr-[-24px] h-[56px] w-[180px] @min-[420px]:h-[70px] @min-[420px]:w-[270px]'
            }
          />
        </div>

        {layout === 'goal' ? (
          <div className="relative flex h-full items-center">
            <div className="flex flex-1 flex-col gap-1.5 py-3.5 pr-[92px] pl-4 @min-[300px]:gap-2 @min-[300px]:py-4 @min-[300px]:pr-[112px] @min-[300px]:pl-[18px] @min-[420px]:gap-3 @min-[420px]:py-6 @min-[420px]:pr-[180px] @min-[420px]:pl-7">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[14px] font-semibold @min-[300px]:text-[15px] @min-[420px]:text-[21px]"
                  style={{ color: item.titleColor }}
                >
                  {title}
                </span>
                <Icon
                  name="sparkles"
                  className="size-[8px] @min-[300px]:size-[9px] @min-[420px]:size-3"
                  style={{ color: 'var(--color-home-goal-sparkle)' }}
                />
              </div>

              <div className="flex items-baseline gap-[3px]">
                <span
                  className="text-[30px] font-bold @min-[300px]:text-[38px] @min-[420px]:text-[56px]"
                  style={{ color: item.valueColor }}
                >
                  {item.currentValue}
                </span>
                <span
                  className="text-[13px] font-medium @min-[300px]:text-[15px] @min-[420px]:text-[25px]"
                  style={{ color: item.subtitleColor }}
                >
                  / {item.totalValue} {item.unit}
                </span>
              </div>

              <div className="flex w-[96px] flex-col gap-1 @min-[300px]:w-[116px] @min-[300px]:gap-1.5 @min-[420px]:w-[190px] @min-[420px]:gap-2.5">
                <ProgressBar
                  progress={item.progress}
                  tint={item.accentColor}
                  track={item.progressBackgroundColor}
                />
                <span
                  className="text-[13px] font-medium @min-[300px]:text-[15px] @min-[420px]:text-[18px]"
                  style={{ color: item.accentColor }}
                >
                  {subtitle}
                </span>
              </div>
            </div>

            {/* Icon container — trailing. */}
            <div className="absolute right-1.5 flex size-[104px] items-center justify-center @min-[300px]:right-2 @min-[300px]:size-[136px] @min-[420px]:right-[18px] @min-[420px]:size-[180px]">
              <div
                className="grid size-[62px] place-items-center rounded-full @min-[300px]:size-[78px] @min-[420px]:size-[98px]"
                style={{ background: item.iconBackground, opacity: 0.96 }}
              >
                <Icon
                  name={item.iconSystemName}
                  className="size-[24px] @min-[300px]:size-[29px] @min-[420px]:size-[34px]"
                  style={{ color: item.accentColor }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative flex h-full items-center gap-3 px-4 py-[18px] @min-[420px]:gap-5 @min-[420px]:px-6 @min-[420px]:py-6">
            <div
              className="grid size-[52px] shrink-0 place-items-center rounded-full @min-[420px]:size-[74px]"
              style={{ background: item.iconBackground }}
            >
              <Icon name={item.iconSystemName} className="size-5 text-white @min-[420px]:size-7" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5 @min-[420px]:gap-2.5">
              <span
                className="truncate text-[22px] font-bold @min-[420px]:text-[34px]"
                style={{ color: item.titleColor }}
              >
                {title}
              </span>
              <span
                className="truncate text-[16px] font-medium @min-[420px]:text-[20px]"
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
                className="text-[14px] font-medium @min-[420px]:text-[18px]"
                style={{ color: item.subtitleColor }}
              >
                {item.currentValue} / {item.totalValue} {item.unit}
              </span>
            </div>

            {actionSystemName && (
              <div
                className="grid size-[46px] shrink-0 place-items-center rounded-[14px] @min-[420px]:size-[62px] @min-[420px]:rounded-[18px]"
                style={{ background: item.accentColor }}
              >
                <Icon
                  name={actionSystemName}
                  className="size-[18px] text-white @min-[420px]:size-6"
                />
              </div>
            )}
          </div>
        )}
      </div>
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
