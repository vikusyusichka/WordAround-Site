import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  APPEARANCE_THEMES,
  applyTheme,
  colorSchemeFor,
  isAppearanceTheme,
  resolveTheme,
} from '@/lib/appearance';

afterEach(() => {
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = '';
  vi.restoreAllMocks();
});

describe('resolveTheme', () => {
  it('passes an explicit choice straight through', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('reads the OS only for "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('colorSchemeFor', () => {
  it('hands the browser both schemes on "system" so its own chrome follows the OS', () => {
    expect(colorSchemeFor('system')).toBe('light dark');
  });

  it('pins the scheme when the reader has chosen', () => {
    expect(colorSchemeFor('light')).toBe('light');
    expect(colorSchemeFor('dark')).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('writes the theme actually in force, not the preference', () => {
    applyTheme('system');
    /* jsdom reports no match, so "system" resolves to light. */
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light dark');

    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  /* How the signed-out screens stay light whatever the preference says. */
  it('honours a forced theme over the preference', () => {
    applyTheme('dark', 'light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});

describe('the theme list', () => {
  it('offers the same three options iOS does', () => {
    expect(APPEARANCE_THEMES).toEqual(['system', 'light', 'dark']);
  });

  it('rejects anything else, so a hand-edited storage value cannot break a page', () => {
    expect(isAppearanceTheme('dark')).toBe(true);
    expect(isAppearanceTheme('sepia')).toBe(false);
  });
});
