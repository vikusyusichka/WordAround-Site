import { describe, expect, it } from 'vitest';

import { ESSAY_LANGUAGES } from './essayTypes';
import { ocrLanguageFor } from './readingImport';

describe('ocrLanguageFor', () => {
  /* The import screen has had a language picker all along; OCR ignored it and
     always loaded the English model, so a photo of Ukrainian text came back as
     transliterated noise. */
  it('maps every language the import screen offers', () => {
    const fallenBack = ESSAY_LANGUAGES.filter(
      (language) => language.id !== 'english' && ocrLanguageFor(language.id) === 'eng',
    );
    expect(fallenBack.map((l) => l.id)).toEqual([]);
  });

  it('uses the Tesseract traineddata name, not the app id', () => {
    expect(ocrLanguageFor('ukrainian')).toBe('ukr');
    expect(ocrLanguageFor('german')).toBe('deu');
    expect(ocrLanguageFor('greek')).toBe('ell');
  });

  it('falls back to English for an unknown language', () => {
    expect(ocrLanguageFor('klingon')).toBe('eng');
  });
});
