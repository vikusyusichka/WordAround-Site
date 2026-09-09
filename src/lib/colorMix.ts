/* Applying an alpha to a colour the code does not know the value of.

   The app used to write `${color}1A` — append two hex digits to a hex string.
   That works only while every colour IS a hex string, and it stopped being one
   the moment the palette moved into CSS variables so the dark theme could swap
   it: `var(--color-accent-blue)1A` is not a colour, and the element renders
   with no background at all rather than an error.

   `color-mix` is the replacement that works on both, so these helpers take any
   colour the browser understands — a hex, a var(), another color-mix. */

/** The colour at `percent` opacity, over whatever is behind it. */
export const tint = (color: string, percent: number): string =>
  `color-mix(in srgb, ${color} ${round(percent)}%, transparent)`;

/** The colour blended `percent` of the way into `into` — an opaque result,
    used where a translucent fill would let the wrong thing show through. */
export const mix = (color: string, percent: number, into: string): string =>
  `color-mix(in srgb, ${color} ${round(percent)}%, ${into})`;

/* Percentages come from two-digit hex alphas (1A → 10.2), so they are rarely
   whole. One decimal is past anything the eye resolves and keeps the generated
   string short. */
const round = (percent: number): number => Math.round(percent * 10) / 10;
