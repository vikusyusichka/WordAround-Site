import { describe, expect, it } from 'vitest';
import { House, Question } from '@phosphor-icons/react';

import { iconForSFSymbol, weightForSFSymbol } from './icons';

describe('iconForSFSymbol', () => {
  it('maps known SF Symbol names to the paired Phosphor component', () => {
    expect(iconForSFSymbol('house')).toBe(House);
  });

  it('falls back to Question for unknown names', () => {
    expect(iconForSFSymbol('does.not.exist.at.all')).toBe(Question);
  });
});

describe('weightForSFSymbol', () => {
  it('picks `fill` for names ending in .fill', () => {
    expect(weightForSFSymbol('flame.fill')).toBe('fill');
    expect(weightForSFSymbol('chart.bar.fill')).toBe('fill');
  });

  it('picks `bold` for outline variants', () => {
    expect(weightForSFSymbol('house')).toBe('bold');
    expect(weightForSFSymbol('folder')).toBe('bold');
  });
});
