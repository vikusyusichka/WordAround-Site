import { describe, expect, it } from 'vitest';

import {
  assignOrder,
  compareByOrder,
  moveItem,
  orderChanged,
  sortByOrder,
  type Orderable,
} from '@/lib/collectionOrder';

const item = (id: string, createdAt: number, order?: number): Orderable =>
  order === undefined ? { id, createdAt } : { id, createdAt, order };

describe('compareByOrder', () => {
  it('sorts arranged items by their position', () => {
    expect(compareByOrder(item('a', 1, 0), item('b', 2, 1))).toBeLessThan(0);
    expect(compareByOrder(item('a', 1, 3), item('b', 2, 1))).toBeGreaterThan(0);
  });

  it('falls back to newest-first when nothing has been arranged', () => {
    expect(compareByOrder(item('new', 200), item('old', 100))).toBeLessThan(0);
  });

  it('puts a not-yet-arranged item first, so a new folder is not buried', () => {
    expect(compareByOrder(item('fresh', 500), item('placed', 100, 0))).toBeLessThan(0);
    expect(compareByOrder(item('placed', 100, 0), item('fresh', 500))).toBeGreaterThan(0);
  });
});

describe('sortByOrder', () => {
  it('applies the arrangement without mutating the input', () => {
    const input = [item('c', 1, 2), item('a', 3, 0), item('b', 2, 1)];
    const sorted = sortByOrder(input);
    expect(sorted.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(input.map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('moveItem', () => {
  const list = ['a', 'b', 'c', 'd'];

  it('moves an entry up and down', () => {
    expect(moveItem(list, 2, 0)).toEqual(['c', 'a', 'b', 'd']);
    expect(moveItem(list, 0, 3)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('is a no-op for a move that goes nowhere or off the ends', () => {
    expect(moveItem(list, 1, 1)).toBe(list);
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 3, 4)).toBe(list);
  });
});

describe('assignOrder / orderChanged', () => {
  it('numbers the list from zero', () => {
    expect(assignOrder([item('a', 1), item('b', 2)])).toEqual([
      { id: 'a', order: 0 },
      { id: 'b', order: 1 },
    ]);
  });

  it('reports a change only when the positions actually differ', () => {
    expect(orderChanged([item('a', 1, 0), item('b', 2, 1)])).toBe(false);
    expect(orderChanged([item('a', 1, 1), item('b', 2, 0)])).toBe(true);
    /* Never arranged before — saving is exactly what turns this false. */
    expect(orderChanged([item('a', 1), item('b', 2)])).toBe(true);
  });
});
