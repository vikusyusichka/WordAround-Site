/* Positions a list of decorative blobs relative to screen center — the web
   equivalent of the iOS auth screens' ZStack of offset BlobShapes. Offsets are
   iOS points (y-down) from the center of the viewport. */
import { BlobBackground } from '@/components/primitives/BlobBackground';

export interface BlobSpec {
  color: string;
  /** width × height in px (iOS points). */
  width: number;
  height: number;
  rotation: number;
  /** Offset from viewport center, iOS coordinates (y grows downward). */
  x: number;
  y: number;
  opacity?: number;
}

interface AuthBackgroundProps {
  blobs: BlobSpec[];
}

export const AuthBackground = ({ blobs }: AuthBackgroundProps) => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {blobs.map((blob, index) => (
        <div
          key={index}
          className="absolute top-1/2 left-1/2"
          style={{
            width: blob.width,
            height: blob.height,
            transform: `translate(-50%, -50%) translate(${blob.x}px, ${blob.y}px)`,
          }}
        >
          <BlobBackground
            className="h-full w-full"
            color={blob.color}
            rotation={blob.rotation}
            opacity={blob.opacity ?? 1}
          />
        </div>
      ))}
    </div>
  );
};
