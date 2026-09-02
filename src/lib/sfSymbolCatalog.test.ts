import { describe, expect, it } from 'vitest';
import { Question } from '@phosphor-icons/react';

import { iconForSFSymbol } from './icons';
import {
  ALL_SF_SYMBOLS,
  SF_SYMBOL_SECTIONS,
  SYMBOL_RESULT_LIMIT,
  searchSFSymbols,
} from './sfSymbolCatalog';

describe('SF symbol catalog', () => {
  /* The picker offers these to the user, so a missing mapping would put a
     question mark on their set — on the web only, while iOS drew it fine. */
  it('renders every offered symbol (none falls back to Question)', () => {
    const unmapped = ALL_SF_SYMBOLS.filter((symbol) => iconForSFSymbol(symbol) === Question);
    expect(unmapped).toEqual([]);
  });

  it('has no duplicate symbols across sections', () => {
    expect(new Set(ALL_SF_SYMBOLS).size).toBe(ALL_SF_SYMBOLS.length);
  });

  it('mirrors the ten iOS sections', () => {
    expect(SF_SYMBOL_SECTIONS.map((s) => s.id)).toEqual([
      'learning',
      'languages',
      'nature',
      'health',
      'food',
      'travel',
      'work',
      'tech',
      'creativity',
      'general',
    ]);
  });
});

describe('searchSFSymbols', () => {
  it('returns the whole catalog for an empty query', () => {
    expect(searchSFSymbols('')).toEqual(ALL_SF_SYMBOLS.slice(0, SYMBOL_RESULT_LIMIT));
    expect(searchSFSymbols('   ')).toHaveLength(ALL_SF_SYMBOLS.length);
  });

  it('matches anywhere in the name, case-insensitively (same rule as iOS)', () => {
    expect(searchSFSymbols('BOOK')).toContain('book.closed.fill');
    expect(searchSFSymbols('glass')).toEqual(['wineglass.fill']);
    expect(searchSFSymbols('cloud')).toEqual(['cloud.fill', 'cloud.rain.fill']);
  });

  it('returns nothing for a query that matches no symbol name', () => {
    expect(searchSFSymbols('літак')).toEqual([]);
    expect(searchSFSymbols('zzzz')).toEqual([]);
  });
});
