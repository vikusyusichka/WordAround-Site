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
  screenBackground: string;
  previewBackground: string;
  imageBackground: string;
  titleColor: string;
  sectionAlpha: number;
  borderAlpha: number;
  softBorderAlpha: number;
  softAccentAlpha: number;
  shadowAlpha: number;
  /** red overrides its borders with literal pinks rather than accent tints. */
  borderColor?: string;
  softBorderColor?: string;
}

const SPECS: Record<SetColorId, ThemeSpec> = {
  red: {
    screenBackground: '#FFF5F5',
    previewBackground: '#FFF0F0',
    imageBackground: '#FFF2F5',
    titleColor: '#94051E',
    sectionAlpha: 0.74,
    borderAlpha: 0,
    softBorderAlpha: 0,
    softAccentAlpha: 0.14,
    shadowAlpha: 0.18,
    borderColor: '#FAC7D1',
    softBorderColor: '#FAD1DB',
  },
  blue: {
    screenBackground: '#F0F7FF',
    previewBackground: '#EDF5FF',
    imageBackground: '#F2F7FF',
    titleColor: '#1A3DC2',
    sectionAlpha: 0.78,
    borderAlpha: 0.35,
    softBorderAlpha: 0.24,
    softAccentAlpha: 0.16,
    shadowAlpha: 0.18,
  },
  yellow: {
    screenBackground: '#FFFAEB',
    previewBackground: '#FFF5DB',
    imageBackground: '#FFF7E3',
    titleColor: '#9E6105',
    sectionAlpha: 0.78,
    borderAlpha: 0.42,
    softBorderAlpha: 0.28,
    softAccentAlpha: 0.2,
    shadowAlpha: 0.2,
  },
  green: {
    screenBackground: '#F0FCF5',
    previewBackground: '#EBFAF2',
    imageBackground: '#F0FCF5',
    titleColor: '#1A7A4D',
    sectionAlpha: 0.78,
    borderAlpha: 0.38,
    softBorderAlpha: 0.26,
    softAccentAlpha: 0.18,
    shadowAlpha: 0.18,
  },
  purple: {
    screenBackground: '#F7F2FF',
    previewBackground: '#F5EDFF',
    imageBackground: '#F7F2FF',
    titleColor: '#6B33B8',
    sectionAlpha: 0.78,
    borderAlpha: 0.38,
    softBorderAlpha: 0.26,
    softAccentAlpha: 0.18,
    shadowAlpha: 0.18,
  },
  cyan: {
    screenBackground: '#EDFCFF',
    previewBackground: '#E8FAFF',
    imageBackground: '#F0FCFF',
    titleColor: '#14708F',
    sectionAlpha: 0.78,
    borderAlpha: 0.38,
    softBorderAlpha: 0.26,
    softAccentAlpha: 0.18,
    shadowAlpha: 0.18,
  },
};

/** `color-mix` is how we apply an alpha to a CSS variable we can't inline. */
const tint = (id: SetColorId, alpha: number) =>
  `color-mix(in srgb, var(--color-cs-${id}) ${Math.round(alpha * 100)}%, transparent)`;

const makeTheme = (id: SetColorId): SetTheme => {
  const spec = SPECS[id];
  return {
    id,
    accent: `var(--color-cs-${id})`,
    soft: tint(id, 0.18),
    bg: `color-mix(in srgb, var(--color-cs-${id}) 12%, white)`,

    screenBackground: spec.screenBackground,
    sectionBackground: `rgba(255, 255, 255, ${spec.sectionAlpha})`,
    fieldBackground: '#FFFFFF',
    previewBackground: spec.previewBackground,
    imageBackground: spec.imageBackground,
    titleColor: spec.titleColor,
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
