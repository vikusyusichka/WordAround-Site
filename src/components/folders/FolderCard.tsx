/* Folder card — port of FolderCardView.swift. The card is literally
   folder-shaped: a tab stepping up on the top-left, a wave sweeping the
   bottom-right corner and two sparkles, all tinted by the folder's color.

   Two shapes: a full-width `row` and a `tile` for the grid view, both drawn
   from the same path — only the height and the content flow differ.

   Web addition: edit and delete sit on the card itself, so neither needs the
   folder to be opened first. They are dimmed rather than hidden, because a
   hover-only control does not exist on a touch screen.

   The iOS shape mixes absolute values (18pt corner, 26pt tab) with a
   proportional one (tab = 32% of width), so the path needs the real pixel
   width — hence the ResizeObserver rather than a stretched viewBox, which
   would distort the corners on wide cards. */
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilSimple, Trash } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { folderPath, wavePath } from './FolderShape';
import { themeForHex } from '@/lib/setColors';
import type { Folder } from '@/lib/models';

/** Layout.swift has no folder constants — these are FolderCardView literals. */
const ROW_H = 128;
const TILE_H = 178;
const WAVE_W = 140;
const WAVE_H = 70;

export type FolderCardVariant = 'row' | 'tile';

interface FolderCardProps {
  folder: Folder;
  setCount: number;
  onOpen: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  variant?: FolderCardVariant;
  /** false renders a plain, unclickable card — used as the create-form preview. */
  interactive?: boolean;
}

export const FolderCard = ({
  folder,
  setCount,
  onOpen,
  onDelete,
  onEdit,
  variant = 'row',
  interactive = true,
}: FolderCardProps) => {
  const { t } = useTranslation();
  const theme = themeForHex(folder.colorHex);
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const height = variant === 'tile' ? TILE_H : ROW_H;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Measure synchronously first: a ResizeObserver only guarantees a callback
    // on *change*, and some environments never deliver the initial one — the
    // card would then render shapeless forever.
    setWidth(el.offsetWidth);
    // Not available in jsdom, and only ever a refinement of the measurement
    // above, so treat it as optional.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const clipId = `folder-clip-${variant}-${folder.id}`;
  const Surface = interactive ? 'button' : 'div';
  const surfaceProps = interactive
    ? ({ type: 'button', onClick: onOpen, 'aria-label': folder.title } as const)
    : ({ 'aria-hidden': true } as const);

  const subtitle = folder.description || t('folders.setCount', { count: setCount });

  return (
    <div ref={ref} className="group relative" style={{ height }}>
      <Surface
        {...surfaceProps}
        className="relative block h-full w-full text-left focus-visible:outline-none"
      >
        {width > 0 && (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="absolute inset-0"
            aria-hidden
            style={{
              filter: `drop-shadow(0 6px 10px color-mix(in srgb, ${theme.shadowColor} 55%, transparent))`,
            }}
          >
            <defs>
              <clipPath id={clipId}>
                <path d={folderPath(width, height)} />
              </clipPath>
            </defs>

            <path d={folderPath(width, height)} fill={theme.previewBackground} />

            <g clipPath={`url(#${clipId})`}>
              {/* iOS positions the wave by its CENTRE at (w-50, h-32). */}
              <g transform={`translate(${width - 50 - WAVE_W / 2}, ${height - 32 - WAVE_H / 2})`}>
                <path d={wavePath(WAVE_W, WAVE_H)} fill={theme.softAccent} />
              </g>
            </g>

            <path
              d={folderPath(width, height)}
              fill="none"
              stroke={theme.softBorderColor}
              strokeWidth={1}
            />
          </svg>
        )}

        {/* Sparkles — iOS places these by centre at 70%/45% and 78%/62%. */}
        <Icon
          name="sparkle"
          className="pointer-events-none absolute size-[13px] -translate-x-1/2 -translate-y-1/2"
          style={{ left: '70%', top: '45%', color: theme.accent, opacity: 0.2 }}
          aria-hidden
        />
        <Icon
          name="sparkle"
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2"
          style={{ left: '78%', top: '62%', color: theme.accent, opacity: 0.2 }}
          aria-hidden
        />

        {variant === 'tile' ? (
          <div className="relative flex h-full flex-col justify-end gap-2.5 px-5 pt-[26px] pb-5">
            <span className="grid size-[46px] place-items-center">
              <Icon name="folder.fill" className="size-[30px]" style={{ color: theme.accent }} />
            </span>
            <span className="flex min-w-0 flex-col gap-1.5">
              <span
                className="truncate text-[19px] font-bold"
                style={{ color: theme.titleColor }}
              >
                {folder.title}
              </span>
              <span
                className="truncate text-[14px] font-medium"
                style={{ color: theme.mutedTextColor }}
              >
                {subtitle}
              </span>
            </span>
          </div>
        ) : (
          <div className="relative flex h-full items-center gap-[18px] px-[26px] pt-[18px]">
            <span className="grid size-[54px] shrink-0 place-items-center">
              <Icon name="folder.fill" className="size-[34px]" style={{ color: theme.accent }} />
            </span>

            <span className="flex min-w-0 flex-col gap-[7px]">
              <span
                className="truncate text-[23px] font-bold"
                style={{ color: theme.titleColor }}
              >
                {folder.title}
              </span>
              <span
                className="truncate text-[16px] font-medium"
                style={{ color: theme.mutedTextColor }}
              >
                {subtitle}
              </span>
            </span>

            <Icon
              name="chevron.right"
              className="ml-auto size-[18px] shrink-0"
              style={{ color: theme.accent, opacity: 0.7 }}
            />
          </div>
        )}
      </Surface>

      {/* Actions sit outside the surface — a button inside a button is invalid
          markup and swallows the click. */}
      {interactive && (
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={t('folders.edit')}
              className="grid size-8 place-items-center rounded-full bg-white/90 shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
              style={{ color: theme.titleColor }}
            >
              <PencilSimple size={15} weight="bold" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('folders.delete')}
            className="grid size-8 place-items-center rounded-full bg-white/90 text-(--color-cs-red) shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
          >
            <Trash size={15} weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
};
