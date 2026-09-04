/* Locale integrity.

   The plural test exists because of a bug that was invisible in review: the
   Ukrainian file mirrored English's `_one` / `_other` pair, but Ukrainian
   resolves 2–4 to `_few` and 0 / 5–20 to `_many`. Those keys were missing, so
   i18next fell through to English and a Ukrainian learner saw "5 items ready"
   in the middle of a Ukrainian screen. Every count from 2 to 20 was affected.

   Only Ukrainian is asserted: `pl` and `de` are still English copies, so
   demanding Slavic plural categories of them would fail on strings nobody has
   translated yet. When either is really translated, add it here. */
import { describe, expect, it } from 'vitest';

import en from '@/locales/en/common.json';
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
const ukFlat = flatten(uk as Tree);

/** Base of every pluralised English key, e.g. `sets.cardCount`. */
const pluralBases = [...new Set(Object.keys(enFlat).filter((k) => k.endsWith('_one')))].map((k) =>
  k.slice(0, -'_one'.length),
);

describe('locales', () => {
  it('has pluralised keys to check', () => {
    expect(pluralBases.length).toBeGreaterThan(0);
  });

  it('uk covers every plural category the notes section needs', () => {
    /* Scoped to the notes section: the rest of the app has the same gap, and
       widening this test is the job of the change that fixes them. */
    const notesBases = pluralBases.filter((b) => b.startsWith('writing.grammar'));
    expect(notesBases.length).toBeGreaterThan(0);

    const missing = notesBases.flatMap((base) =>
      ['_one', '_few', '_many', '_other']
        .filter((suffix) => ukFlat[`${base}${suffix}`] === undefined)
        .map((suffix) => `${base}${suffix}`),
    );
    expect(missing).toEqual([]);
  });

  it('uk plural forms keep the interpolations English declares', () => {
    const placeholders = (value: string) =>
      [...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

    for (const base of pluralBases.filter((b) => b.startsWith('writing.grammar'))) {
      const expected = placeholders(enFlat[`${base}_one`]);
      for (const suffix of ['_one', '_few', '_many', '_other']) {
        const value = ukFlat[`${base}${suffix}`];
        if (value === undefined) continue;
        expect(placeholders(value), `${base}${suffix}`).toEqual(expected);
      }
    }
  });

  it('uk defines every key en defines', () => {
    const missing = Object.keys(enFlat).filter((k) => ukFlat[k] === undefined);
    expect(missing).toEqual([]);
  });
});
