import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { colorIdForHex, SET_COLOR_HEX, SET_COLOR_IDS, themeForHex, themeForColor } from './setColors';

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

describe('swatch variables', () => {
  // Regression guard. These six were declared inside Tailwind's @theme block,
  // where v4 drops any variable it cannot find written out literally in the
  // source. ColorPicker/setColors build the name at runtime, so --color-cs-yellow
  // and --color-cs-purple were silently stripped from the production CSS and
  // every yellow/purple swatch, folder and set rendered transparent. Only blue,
  // green and cyan survived, and only because test files happened to mention
  // them. Declaring them in :root is what keeps them in the build.
  // Read from disk: vitest stubs CSS module imports, so `?raw` comes back empty.
  const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
  const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('@layer base'));

  it.each(SET_COLOR_IDS)('declares --color-cs-%s outside @theme', (id) => {
    expect(rootBlock).toContain(`--color-cs-${id}:`);
  });

  it('gives every color a full, distinct iOS theme', () => {
    const titles = SET_COLOR_IDS.map((id) => themeForColor(id).titleColor);
    expect(new Set(titles).size).toBe(SET_COLOR_IDS.length);

    for (const id of SET_COLOR_IDS) {
      const theme = themeForColor(id);
      expect(theme.screenBackground).toMatch(/^#[0-9A-F]{6}$/i);
      expect(theme.previewBackground).toMatch(/^#[0-9A-F]{6}$/i);
      expect(theme.titleColor).toMatch(/^#[0-9A-F]{6}$/i);
      expect(theme.softBorderColor).toBeTruthy();
      expect(theme.shadowColor).toBeTruthy();
    }
  });
});
