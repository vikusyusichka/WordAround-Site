/* Decorative card blobs — SVG ports of the SwiftUI Shape.path(in:) definitions
   in StatCardView / ProgressCardView / SetItemView. Each Swift path uses
   normalized factors (rect.width * f, rect.height * f); multiplied by 100 for a
   `viewBox="0 0 100 100"`. Some control points intentionally exceed the box, so
   overflow is visible. Sized by the parent via width/height (preserveAspectRatio
   none = stretch, matching how iOS frames each shape). */

interface BlobProps {
  color: string;
  className?: string;
  /** 0..1 fill opacity (iOS applies .opacity(...) to the fill). */
  opacity?: number;
}

const svgProps = {
  viewBox: '0 0 100 100',
  preserveAspectRatio: 'none' as const,
  overflow: 'visible' as const,
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
};

/* StatCardView.StatBlobShape */
export const StatBlobShape = ({ color, className, opacity = 1 }: BlobProps) => (
  <svg className={className} {...svgProps}>
    <path
      fill={color}
      fillOpacity={opacity}
      d="M 12 52 C 8 28, 20 14, 36 14 C 52 14, 58 0, 78 10 C 96 20, 100 30, 100 48 C 100 72, 98 100, 82 100 L 30 100 C 8 100, 0 76, 12 52 Z"
    />
  </svg>
);

/* ProgressCardView.ProgressBlobShape */
export const ProgressBlobShape = ({ color, className, opacity = 1 }: BlobProps) => (
  <svg className={className} {...svgProps}>
    <path
      fill={color}
      fillOpacity={opacity}
      d="M 5 48 C 4 25, 16 8, 33 10 C 50 12, 58 -3, 75 6 C 92 15, 100 24, 100 44 C 100 74, 98 100, 82 100 L 28 100 C 6 100, -2 75, 5 48 Z"
    />
  </svg>
);

/* SetItemView.SetCardBlobShape */
export const SetCardBlobShape = ({ color, className, opacity = 1 }: BlobProps) => (
  <svg className={className} {...svgProps}>
    <path
      fill={color}
      fillOpacity={opacity}
      d="M 4 42 C 8 20, 18 8, 30 10 C 45 12, 54 -4, 70 2 C 86 8, 100 12, 100 34 C 100 56, 98 74, 86 78 C 72 82, 62 100, 44 100 C 18 100, -4 72, 4 42 Z"
    />
  </svg>
);
