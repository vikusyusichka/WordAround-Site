import { describe, expect, it } from 'vitest';

import { defaultSeparators, parseImportedCards, type ImportSeparators } from './importCards';

const withSeparators = (patch: Partial<ImportSeparators>): ImportSeparators => ({
  ...defaultSeparators(),
  ...patch,
});

describe('parseImportedCards', () => {
  it('reads tab-separated rows split by newlines', () => {
    const text = 'gato\tcat\nperro\tdog';

    expect(parseImportedCards(text, defaultSeparators())).toEqual([
      { term: 'gato', definition: 'cat' },
      { term: 'perro', definition: 'dog' },
    ]);
  });

  it('reads comma / semicolon separators', () => {
    const text = 'gato,cat;perro,dog';
    const separators = withSeparators({ term: 'comma', card: 'semicolon' });

    expect(parseImportedCards(text, separators)).toEqual([
      { term: 'gato', definition: 'cat' },
      { term: 'perro', definition: 'dog' },
    ]);
  });

  it('accepts custom separators', () => {
    const text = 'gato=cat | perro=dog';
    const separators = withSeparators({
      term: 'custom',
      termCustom: '=',
      card: 'custom',
      cardCustom: '|',
    });

    expect(parseImportedCards(text, separators)).toEqual([
      { term: 'gato', definition: 'cat' },
      { term: 'perro', definition: 'dog' },
    ]);
  });

  it('splits on the FIRST term separator only, so definitions may contain it', () => {
    const text = 'gato,cat, tomcat';
    const separators = withSeparators({ term: 'comma' });

    expect(parseImportedCards(text, separators)).toEqual([
      { term: 'gato', definition: 'cat, tomcat' },
    ]);
  });

  it('keeps a row that has no definition and drops one that has no term', () => {
    const text = 'gato\nperro\tdog\n\t orphan';

    expect(parseImportedCards(text, defaultSeparators())).toEqual([
      { term: 'gato', definition: '' },
      { term: 'perro', definition: 'dog' },
    ]);
  });

  it('skips blank rows and trims surrounding whitespace', () => {
    const text = '  gato \t  cat  \n\n\n  perro\tdog\n';

    expect(parseImportedCards(text, defaultSeparators())).toEqual([
      { term: 'gato', definition: 'cat' },
      { term: 'perro', definition: 'dog' },
    ]);
  });

  it('normalises Windows line endings', () => {
    const text = 'gato\tcat\r\nperro\tdog';

    expect(parseImportedCards(text, defaultSeparators())).toEqual([
      { term: 'gato', definition: 'cat' },
      { term: 'perro', definition: 'dog' },
    ]);
  });

  it('returns nothing while a chosen custom separator is still blank', () => {
    const text = 'gato\tcat\nperro\tdog';

    expect(parseImportedCards(text, withSeparators({ term: 'custom' }))).toEqual([]);
    expect(parseImportedCards(text, withSeparators({ card: 'custom' }))).toEqual([]);
  });

  it('returns nothing for empty input', () => {
    expect(parseImportedCards('', defaultSeparators())).toEqual([]);
    expect(parseImportedCards('   \n  ', defaultSeparators())).toEqual([]);
  });
});
