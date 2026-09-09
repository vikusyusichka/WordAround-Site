/* The card chrome the whole profile is built from — web port of
   ProfileDashboardCardChrome (Features/Profile/Views/ProfileCardStyle.swift).

   Four things make it: an 88%-white ground, a 22px radius, a hairline white
   border, and a soft low shadow — plus a BlobShape in the accent colour tucked
   into the top-right corner at 9% opacity, rotated and pushed past the edge so
   only its curve shows. That corner blob is the reason this reads as WordAround
   and not as a generic settings list.

   It is a component rather than a utility class because the blob is real SVG
   geometry (src/components/primitives/BlobBackground.tsx), not a border-radius
   trick. Grammar Notes reuses this in a later slice — keep it feature-agnostic. */
import type { ElementType, ReactNode } from 'react';

import { BlobBackground } from '@/components/primitives/BlobBackground';

interface ProfileCardProps {
  children: ReactNode;
  /** Blob colour. Defaults to the brand blue, as iOS does. */
  accent?: string;
  /** iOS blobOpacity — 0.09 normally, 0.07 for the danger card. */
  blobOpacity?: number;
  className?: string;
  /** Render as something other than a <div> (e.g. `section`). */
  as?: ElementType;
}

export const ProfileCard = ({
  children,
  accent = 'var(--color-primary-blue)',
  blobOpacity = 0.09,
  className = '',
  as: Tag = 'div',
}: ProfileCardProps) => (
  <Tag
    className={`relative overflow-hidden rounded-[22px] border border-white/60 bg-white/[0.88] shadow-[0_10px_18px_rgba(0,0,0,0.045)] ${className}`}
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
