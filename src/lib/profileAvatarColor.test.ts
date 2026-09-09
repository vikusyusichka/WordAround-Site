import { describe, expect, it } from 'vitest';

import {
  AVATAR_COLOR_IDS,
  DEFAULT_AVATAR_COLOR,
  PROFILE_AVATAR_COLORS,
  avatarColorMeta,
  isAvatarColorId,
} from '@/lib/profileAvatarColor';

describe('profile avatar colours', () => {
  it('offers the same six colours as ProfileAvatarColor.allCases, in order', () => {
    expect(AVATAR_COLOR_IDS).toEqual(['blue', 'purple', 'pink', 'orange', 'green', 'cyan']);
  });

  it('gives every colour both a fill and an accent', () => {
    for (const color of PROFILE_AVATAR_COLORS) {
      expect(color.fill).toMatch(/^#[0-9a-f]{6}$/);
      expect(color.accent).toMatch(/^#[0-9a-f]{6}$/);
      expect(color.accent).not.toBe(color.fill);
    }
  });

  it('resolves a known id', () => {
    expect(avatarColorMeta('pink').id).toBe('pink');
  });

  it('falls back to the default rather than rendering a colourless avatar', () => {
    expect(avatarColorMeta('chartreuse').id).toBe(DEFAULT_AVATAR_COLOR);
    expect(avatarColorMeta(null).id).toBe(DEFAULT_AVATAR_COLOR);
    expect(avatarColorMeta(undefined).id).toBe(DEFAULT_AVATAR_COLOR);
  });

  it('recognises only the six ids', () => {
    expect(isAvatarColorId('green')).toBe(true);
    expect(isAvatarColorId('teal')).toBe(false);
  });
});
