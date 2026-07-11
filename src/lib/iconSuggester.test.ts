import { describe, expect, it } from 'vitest';

import { resolveIcon, suggestIcon } from './iconSuggester';

describe('suggestIcon', () => {
  it.each([
    ['My Travel words', 'airplane'],
    ['Food & Cooking', 'fork.knife'],
    ['English basics', 'character.bubble.fill'],
    ['Work terms', 'briefcase.fill'],
  ])('maps "%s" → %s', (title, icon) => {
    expect(suggestIcon(title)).toBe(icon);
  });

  it('defaults to star.fill', () => {
    expect(suggestIcon('random qwerty')).toBe('star.fill');
  });
});

describe('resolveIcon', () => {
  it('keeps a chosen non-default icon', () => {
    expect(resolveIcon('heart.fill', 'Travel')).toBe('heart.fill');
  });

  it('suggests from the title when left at the default', () => {
    expect(resolveIcon('rectangle.stack.fill', 'Travel')).toBe('airplane');
  });
});
