import { forwardRef } from 'react';
import type { SVGProps } from 'react';

import {
  iconForSFSymbol,
  weightForSFSymbol,
  type SFSymbolWeight,
} from '@/lib/icons';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'weight'> {
  /** SF Symbol name as spelled in the SwiftUI source (e.g. `chart.bar.fill`). */
  name: string;
  /** Uniform size in px. */
  size?: number;
  /** Override the auto-picked weight (default: `fill` for .fill names, `bold` otherwise). */
  weight?: SFSymbolWeight;
}

/* Drop-in replacement for `Image(systemName:)`. Callers pass the SF name and
   we resolve to the Phosphor equivalent + weight, so SwiftUI-style .fill
   suffixes translate straight into filled icons on the web. */
export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ name, size = 20, weight, className, ...rest }, ref) => {
    const Component = iconForSFSymbol(name);
    const resolvedWeight = weight ?? weightForSFSymbol(name);
    return (
      <Component
        ref={ref}
        size={size}
        weight={resolvedWeight}
        className={className}
        {...rest}
      />
    );
  },
);

Icon.displayName = 'Icon';
