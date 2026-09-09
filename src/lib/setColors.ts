/* Shared set/folder color system — ports SetColor (CreateSet.swift) +
   CreateSetTheme.swift. Each color has a STORAGE hex (saved to `colorHex`,
   matching iOS so data stays compatible) and a THEME.

   The theme is the full 14-field CreateSetTheme from iOS, not just an accent:
   on iOS the whole Create Set / Create Folder screen repaints in the chosen
   color — background, section cards, fields, borders, title, shadow. Every
   value below is the literal iOS RGB triple converted to hex.

   `accent` and the six swatch values resolve to --color-cs-* variables, which
   live in :root (NOT Tailwind's @theme) — see the comment in styles/index.css
   for why. */

export type SetColorId = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'cyan';

export const SET_COLOR_IDS: SetColorId[] = ['red', 'blue', 'yellow', 'green', 'purple', 'cyan'];

/** Storage hex saved to Firestore `colorHex` (iOS SetColor.hex). */
export const SET_COLOR_HEX: Record<SetColorId, string> = {
  red: '#FF5759',
  blue: '#4169F5',
  yellow: '#F5B942',
  green: '#3CCF91',
  purple: '#9B6BFF',
  cyan: '#35C8E8',
};

export interface SetTheme {
  id: SetColorId;
  /** Solid accent (icon/border) — a design token. */
  accent: string;
  /** The accent when it is small text on the set's own card. Identical to
      `accent` in the light theme; lightened in the dark one, where the muted
      accent falls under 4.5:1 on that tinted ground. */
  accentText: string;
  /** Translucent accent for soft fills. */
  soft: string;
  /** Light card background tint. */
  bg: string;

  /* --- CreateSetTheme.swift --- */
  /** Whole-screen wash behind a create/detail screen. */
  screenBackground: string;
  /** Translucent white fill of a section card. */
  sectionBackground: string;
  /** Text field fill. */
  fieldBackground: string;
  /** Preview card fill (a shade deeper than screenBackground). */
  previewBackground: string;
  /** Image-well fill. */
  imageBackground: string;
  /** Heading color — a dark, saturated version of the accent. */
  titleColor: string;
  /** Body text. */
  textColor: string;
  /** Secondary text. */
  mutedTextColor: string;
  /** Stronger 1px border. */
  borderColor: string;
  /** Softer 1px border used by section cards. */
  softBorderColor: string;
  /** Tinted accent fill for decorative shapes. */
  softAccent: string;
  /** Accent-tinted drop shadow color. */
  shadowColor: string;
}

/** Per-color values that differ; the shared ones are filled in by makeTheme. */
interface ThemeSpec {
  sectionAlpha: number;
  borderAlpha: number;
  softBorderAlpha: number;
  softAccentAlpha: number;
  shadowAlpha: number;
  /* red overrides its borders with literal pinks rather than accent tints. */
  borderColor?: string;
  softBorderColor?: string;
}

const SPECS: Record<SetColorId, ThemeSpec> = {
  red: {
    sectionAlpha: 0.74,
    borderAlpha: 0,
    softBorderAlpha: 0,
    softAccentAlpha: 0.14,
    shadowAlpha: 0.18,
    /* Red is the one colour whose borders are literal pinks rather than tints
       of the accent — mirrored as variables so the dark theme can swap them. */
    borderColor: 'var(--color-cs-red-border)',
    softBorderColor: 'var(--color-cs-red-soft-border)',
  },
  blue: { sectionAlpha: 0.78, borderAlpha: 0.35, softBorderAlpha: 0.24, softAccentAlpha: 0.16, shadowAlpha: 0.18 },
  yellow: { sectionAlpha: 0.78, borderAlpha: 0.42, softBorderAlpha: 0.28, softAccentAlpha: 0.2, shadowAlpha: 0.2 },
  green: { sectionAlpha: 0.78, borderAlpha: 0.38, softBorderAlpha: 0.26, softAccentAlpha: 0.18, shadowAlpha: 0.18 },
  purple: { sectionAlpha: 0.78, borderAlpha: 0.38, softBorderAlpha: 0.26, softAccentAlpha: 0.18, shadowAlpha: 0.18 },
  cyan: { sectionAlpha: 0.78, borderAlpha: 0.38, softBorderAlpha: 0.26, softAccentAlpha: 0.18, shadowAlpha: 0.18 },
};

/** `color-mix` is how we apply an alpha to a CSS variable we can't inline. */
const tint = (id: SetColorId, alpha: number) =>
  `color-mix(in srgb, var(--color-cs-${id}) ${Math.round(alpha * 100)}%, transparent)`;

const makeTheme = (id: SetColorId): SetTheme => {
  const spec = SPECS[id];
  return {
    id,
    accent: `var(--color-cs-${id})`,
    accentText: `var(--color-cs-${id}-label)`,
    soft: tint(id, 0.18),
    /* Mixed into the themed surface, not literal white: mixing into white
       leaves every set tile pale on a dark page. */
    bg: `color-mix(in srgb, var(--color-cs-${id}) 12%, var(--color-cs-surface))`,

    /* Every surface is a variable so the dark theme swaps it without this
       function — or the 102 places that consume it — knowing anything about
       themes. The alpha stays per-colour; only the base it mixes into moves. */
    screenBackground: `var(--color-cs-${id}-screen)`,
    sectionBackground: `color-mix(in srgb, var(--color-cs-surface) ${Math.round(
      spec.sectionAlpha * 100,
    )}%, transparent)`,
    fieldBackground: 'var(--color-cs-field)',
    previewBackground: `var(--color-cs-${id}-preview)`,
    imageBackground: `var(--color-cs-${id}-image)`,
    titleColor: `var(--color-cs-${id}-title)`,
    textColor: 'var(--color-cs-dark-text)',
    mutedTextColor: 'var(--color-cs-text-muted)',
    borderColor: spec.borderColor ?? tint(id, spec.borderAlpha),
    softBorderColor: spec.softBorderColor ?? tint(id, spec.softBorderAlpha),
    softAccent: tint(id, spec.softAccentAlpha),
    shadowColor: tint(id, spec.shadowAlpha),
  };
};

export const themeForColor = (id: SetColorId): SetTheme => makeTheme(id);

/** Map a stored `colorHex` back to a color id (default red), then to a theme. */
export const colorIdForHex = (hex: string): SetColorId => {
  const normalized = hex.trim().toUpperCase();
  const match = SET_COLOR_IDS.find((id) => SET_COLOR_HEX[id].toUpperCase() === normalized);
  return match ?? 'red';
};

export const themeForHex = (hex: string): SetTheme => makeTheme(colorIdForHex(hex));
