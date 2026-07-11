/* Shared set/folder color system — ports SetColor (CreateSet.swift) +
   CreateSetTheme.swift. Each color has a STORAGE hex (saved to `colorHex`,
   matching iOS so data stays compatible) and a THEME whose accent reuses the
   Phase-0 `--color-cs-*` tokens. The stored hex is a key distinct from the
   theme accent (e.g. blue stores #4169F5 but renders with --color-cs-blue). */

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
}

const makeTheme = (id: SetColorId): SetTheme => ({
  id,
  accent: `var(--color-cs-${id})`,
  soft: `color-mix(in srgb, var(--color-cs-${id}) 18%, transparent)`,
  bg: `color-mix(in srgb, var(--color-cs-${id}) 12%, white)`,
});

export const themeForColor = (id: SetColorId): SetTheme => makeTheme(id);

/** Map a stored `colorHex` back to a color id (default red), then to a theme. */
export const colorIdForHex = (hex: string): SetColorId => {
  const normalized = hex.trim().toUpperCase();
  const match = SET_COLOR_IDS.find((id) => SET_COLOR_HEX[id].toUpperCase() === normalized);
  return match ?? 'red';
};

export const themeForHex = (hex: string): SetTheme => makeTheme(colorIdForHex(hex));
