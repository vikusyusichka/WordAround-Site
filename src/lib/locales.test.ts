/* Locale integrity.

   The plural test exists because of a bug that was invisible in review: the
   Ukrainian file mirrored English's `_one` / `_other` pair, but Ukrainian
   resolves 2–4 to `_few` and 0 / 5–20 to `_many`. Those keys were missing, so
   i18next fell through to English and a Ukrainian learner saw "5 items ready"
   in the middle of a Ukrainian screen. Every count from 2 to 20 was affected.

   Ukrainian and Polish both use those categories and are both asserted here.
   German is checked for completeness only: it resolves `one` and `other` like
   English, so demanding `_few` of it would fail on a category the language
   does not have. */
import { describe, expect, it } from 'vitest';

import de from '@/locales/de/common.json';
import en from '@/locales/en/common.json';
import pl from '@/locales/pl/common.json';
import uk from '@/locales/uk/common.json';

type Tree = { [key: string]: string | Tree };

const flatten = (tree: Tree, prefix = ''): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
};

const enFlat = flatten(en as Tree);
const LOCALES = {
  uk: flatten(uk as Tree),
  pl: flatten(pl as Tree),
  de: flatten(de as Tree),
};

/** Languages whose plural rules include `few` and `many`. */
const SLAVIC = ['uk', 'pl'] as const;

/** Base of every pluralised English key, e.g. `sets.cardCount`. */
const pluralBases = [...new Set(Object.keys(enFlat).filter((k) => k.endsWith('_one')))].map((k) =>
  k.slice(0, -'_one'.length),
);

const placeholders = (value: string) =>
  [...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

describe('locales', () => {
  it('has pluralised keys to check', () => {
    expect(pluralBases.length).toBeGreaterThan(0);
  });

  for (const lng of SLAVIC) {
    it(`${lng} covers every plural category, everywhere`, () => {
      const flat = LOCALES[lng];
      const missing = pluralBases.flatMap((base) =>
        ['_one', '_few', '_many', '_other']
          .filter((suffix) => flat[`${base}${suffix}`] === undefined)
          .map((suffix) => `${base}${suffix}`),
      );
      expect(missing).toEqual([]);
    });
  }

  for (const [lng, flat] of Object.entries(LOCALES)) {
    it(`${lng} plural forms keep the interpolations English declares`, () => {
      for (const base of pluralBases) {
        const expected = placeholders(enFlat[`${base}_one`]);
        for (const suffix of ['_one', '_few', '_many', '_other']) {
          const value = flat[`${base}${suffix}`];
          if (value === undefined) continue;
          expect(placeholders(value), `${lng}: ${base}${suffix}`).toEqual(expected);
        }
      }
    });

    it(`${lng} defines every key en defines`, () => {
      const missing = Object.keys(enFlat).filter((k) => flat[k] === undefined);
      expect(missing).toEqual([]);
    });

    /* Not a style rule — an emptiness check. pl and de were shipped as
       verbatim copies of English behind a translated language name, so the
       switcher offered four languages and delivered two. A handful of words
       are genuinely identical (Audio, PDF, Name, Quiz), which is why this
       allows some overlap rather than none. */
    it(`${lng} is a real translation, not a copy of English`, () => {
      const identical = Object.keys(enFlat).filter((k) => flat[k] === enFlat[k]);
      expect(identical.length / Object.keys(enFlat).length).toBeLessThan(0.1);
    });
  }
});
