/* The card chrome the profile and Grammar Notes are both built from — web port
   of ProfileDashboardCardChrome (Features/Profile/Views/ProfileCardStyle.swift)
   and, identically, of GrammarReviewSummaryView.cardBackground.

   Those two are the same surface in the iOS source, down to the numbers: a
   near-white ground, a hairline white border, a soft low shadow, and a
   BlobShape in the accent colour tucked into the top-right corner at 9%,
   rotated −9° and pushed past the edge so only its curve shows. That corner
   blob is the reason these screens read as WordAround and not as a generic
   settings list. Only the radius and the exact white differ between the two
   modules, so those are props.

   It is a component rather than a utility class because the blob is real SVG
   geometry (BlobBackground), not a border-radius trick. Feature-agnostic on
   purpose — it lives here, not under profile/ or grammar/. */
import type { ElementType, ReactNode } from 'react';

import { BlobBackground } from '@/components/primitives/BlobBackground';

interface SurfaceCardProps {
  children: ReactNode;
  /** Blob colour. Defaults to the brand blue, as iOS does. */
  accent?: string;
  /** iOS blobOpacity — 0.09 normally, 0.07 for the profile's danger card. */
  blobOpacity?: number;
  /** Tailwind radius classes. Profile uses 22; Grammar Notes 24, 28 from lg. */
  radiusClass?: string;
  /** Ground. A token rather than a literal white, so the dark theme can swap
      it — see --color-surface-card in styles/index.css. Grammar Notes passes a
      slightly different one (GRAMMAR_SURFACE). */
  fillClass?: string;
  className?: string;
  /** Render as something other than a <div> (e.g. `section`). */
  as?: ElementType;
}

export const SurfaceCard = ({
  children,
  accent = 'var(--color-primary-blue)',
  blobOpacity = 0.09,
  radiusClass = 'rounded-[22px]',
  fillClass = 'bg-(--color-surface-card)',
  className = '',
  as: Tag = 'div',
}: SurfaceCardProps) => (
  <Tag
    className={`relative overflow-hidden border border-(--color-surface-border) shadow-[0_10px_18px_var(--shadow-color-card)] ${radiusClass} ${fillClass} ${className}`}
  >
    {/* iOS: 110×90 offset (36, −28); 150×120 offset (48, −40) on iPad-like
        widths. The web's regular breakpoint is lg. */}
    <div
      aria-hidden
      className="pointer-events-none absolute top-[-28px] right-[-36px] h-[90px] w-[110px] lg:top-[-40px] lg:right-[-48px] lg:h-[120px] lg:w-[150px]"
    >
      <BlobBackground
        className="h-full w-full"
        color={accent}
        rotation={-9}
        opacity={blobOpacity}
      />
    </div>
    <div className="relative">{children}</div>
  </Tag>
);

/* Grammar Notes' variant of the same surface — the radius and ground iOS uses
   for its topic, note and review cards. */
export const GRAMMAR_SURFACE = {
  radiusClass: 'rounded-[24px] lg:rounded-[28px]',
  fillClass: 'bg-(--color-surface-card)',
} as const;
