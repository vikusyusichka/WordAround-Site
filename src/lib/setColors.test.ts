import { describe, expect, it } from 'vitest';

import { colorIdForHex, SET_COLOR_HEX, themeForHex } from './setColors';

describe('colorIdForHex', () => {
  it('maps each storage hex back to its id (case-insensitive)', () => {
    expect(colorIdForHex('#4169F5')).toBe('blue');
    expect(colorIdForHex('#3ccf91')).toBe('green');
    expect(colorIdForHex(' #9B6BFF ')).toBe('purple');
  });

  it('defaults to red for an unknown hex', () => {
    expect(colorIdForHex('#123456')).toBe('red');
  });
});

describe('themeForHex', () => {
  it('returns a theme whose accent uses the matching cs token', () => {
    expect(themeForHex(SET_COLOR_HEX.cyan).accent).toBe('var(--color-cs-cyan)');
  });
});
