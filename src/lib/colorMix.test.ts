import { describe, expect, it } from 'vitest';

import { mix, tint } from './colorMix';

describe('tint', () => {
  it('makes a translucent version of a plain hex', () => {
    expect(tint('#4f7cff', 10)).toBe('color-mix(in srgb, #4f7cff 10%, transparent)');
  });

  /* The whole reason this helper exists: the palette is variables now, and the
     old `${color}1A` produced garbage the moment it stopped being a hex. */
  it('works on a variable, which string concatenation could not', () => {
    expect(tint('var(--color-accent-violet)', 8)).toBe(
      'color-mix(in srgb, var(--color-accent-violet) 8%, transparent)',
    );
  });

  it('rounds the odd percentages that two-digit hex alphas produce', () => {
    /* 0x1A / 0xFF = 10.196…, 0x3D / 0xFF = 23.92… */
    expect(tint('#000', 10.196)).toContain('10.2%');
    expect(tint('#000', 23.921)).toContain('23.9%');
  });
});

describe('mix', () => {
  it('blends into a second colour rather than into transparency', () => {
    expect(mix('var(--color-accent-blue)', 58, 'var(--color-tone-mix)')).toBe(
      'color-mix(in srgb, var(--color-accent-blue) 58%, var(--color-tone-mix))',
    );
  });
});
