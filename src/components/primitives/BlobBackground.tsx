/* Decorative background blob — SVG equivalent of the SwiftUI BlobShape used
   in Onboarding, Home background, Flashcard Detail header, etc.
   Sized by the parent via CSS width/height; the SVG scales via viewBox. */

interface BlobBackgroundProps {
  className?: string;
  /** Fill color (any CSS color, defaults to blob-blue token). */
  color?: string;
  /** Rotation in degrees — mimics SwiftUI .rotationEffect. */
  rotation?: number;
  /** Opacity 0..1 — usually 0.45–0.65 in iOS code. */
  opacity?: number;
}

export const BlobBackground = ({
  className,
  color = 'var(--color-blob-blue)',
  rotation = 0,
  opacity = 0.5,
}: BlobBackgroundProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      overflow="visible"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        transform: `rotate(${rotation}deg)`,
        opacity,
      }}
    >
      {/* Exact iOS BlobShape path (normalized 0..1 → ×100). Some control
          points intentionally overshoot the viewBox — overflow is visible. */}
      <path
        fill={color}
        d="M 12 24
           C 20 2, 53 -2, 70 8
           C 92 12, 105 24, 96 42
           C 90 70, 100 92, 84 88
           C 62 92, 40 106, 28 96
           C 4 82, -4 68, 4 56
           C 10 44, -2 28, 12 24
           Z"
      />
    </svg>
  );
};
