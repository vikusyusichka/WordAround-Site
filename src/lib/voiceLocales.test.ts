import { describe, expect, it } from 'vitest';

import { ESSAY_LANGUAGES } from './essayTypes';
import { voiceLocaleFor } from './voiceLocales';

describe('voiceLocaleFor', () => {
  /* Listening kept its own eight-language map and fell through to en-US for
     the other twenty-two, while the "no voice" warning beside the picker was
     computed from the full map — so the UI said Czech was available and the
     synthesiser was handed English. One map, one answer. */
  it('covers every language the pickers offer', () => {
    const missing = ESSAY_LANGUAGES.filter(
      (language) => language.id !== 'english' && voiceLocaleFor(language.id) === 'en-US',
    );
    expect(missing.map((l) => l.id)).toEqual([]);
  });

  it('answers the languages listening used to drop', () => {
    expect(voiceLocaleFor('czech')).toBe('cs-CZ');
    expect(voiceLocaleFor('greek')).toBe('el-GR');
    expect(voiceLocaleFor('estonian')).toBe('et-EE');
  });

  it('falls back to en-US for an unknown id', () => {
    expect(voiceLocaleFor('klingon')).toBe('en-US');
  });
});
