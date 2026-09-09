/* The six avatar colours — web port of Features/Profile/Models/
   ProfileAvatarColor.swift. Each one is a pair: a pale `fill` for the circle
   and a saturated `accent` for the initials drawn on it. Hex values are the
   Swift Color(red:green:blue:) triples rounded to 8-bit.

   The chosen id is stored in preferences (localStorage) AND mirrored into the
   Firestore user document, exactly as iOS does — so the same account shows the
   same avatar on both. */

export type ProfileAvatarColorId =
  | 'blue'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'green'
  | 'cyan';

export interface ProfileAvatarColorMeta {
  id: ProfileAvatarColorId;
  /** Circle background. */
  fill: string;
  /** Initials / icon drawn on the circle. */
  accent: string;
}

/* Order = the order of the swatch row, same as ProfileAvatarColor.allCases. */
export const PROFILE_AVATAR_COLORS: ProfileAvatarColorMeta[] = [
  { id: 'blue', fill: '#d6e0ff', accent: '#2b5cfa' },
  { id: 'purple', fill: '#e8dbff', accent: '#8c4deb' },
  { id: 'pink', fill: '#ffdbed', accent: '#ed4d9e' },
  { id: 'orange', fill: '#ffe3c7', accent: '#f28c1a' },
  { id: 'green', fill: '#d9f2de', accent: '#21a657' },
  { id: 'cyan', fill: '#d1f0f7', accent: '#1a9ec7' },
];

export const AVATAR_COLOR_IDS: ProfileAvatarColorId[] = PROFILE_AVATAR_COLORS.map((c) => c.id);

export const DEFAULT_AVATAR_COLOR: ProfileAvatarColorId = 'blue';

export const isAvatarColorId = (value: string): value is ProfileAvatarColorId =>
  (AVATAR_COLOR_IDS as string[]).includes(value);

/** Never throws: an id from an older build (or a hand-edited localStorage)
    falls back to the default rather than rendering a colourless avatar. */
export const avatarColorMeta = (id: string | undefined | null): ProfileAvatarColorMeta =>
  PROFILE_AVATAR_COLORS.find((c) => c.id === id) ?? PROFILE_AVATAR_COLORS[0];
