/* Home decorative background — port of HomeView.backgroundLayer. iOS positions
   each shape from the bottom via GeometryReader; we mirror with bottom/left
   offsets (phone value default, md: = pad value). One blob + two accent dots.
   Wrap the screen in overflow-hidden. Positions use translateX(-50%) so the
   left offset is the shape's center, matching SwiftUI .position(x:). */
import { BlobBackground } from '@/components/primitives/BlobBackground';

export const HomeBackground = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Main blob — blobBlue @0.45, rotate 18°. 120×160 / 180×240 (pad). */}
      <div className="absolute bottom-[110px] left-[28px] h-40 w-30 -translate-x-1/2 md:bottom-[130px] md:left-[90px] md:h-60 md:w-45">
        <BlobBackground
          className="h-full w-full"
          color="var(--color-blob-blue)"
          rotation={18}
          opacity={0.45}
        />
      </div>

      {/* Green dot — blobGreen @0.65, Ø12/16. */}
      <div className="absolute bottom-[76px] left-[78px] h-3 w-3 -translate-x-1/2 rounded-full bg-(--color-blob-green) opacity-65 md:bottom-[98px] md:left-[142px] md:h-4 md:w-4" />

      {/* Blue dot — blobBlue @0.8, Ø10/14. */}
      <div className="absolute bottom-[142px] left-[128px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-(--color-blob-blue) opacity-80 md:bottom-[148px] md:left-[210px] md:h-3.5 md:w-3.5" />
    </div>
  );
};
