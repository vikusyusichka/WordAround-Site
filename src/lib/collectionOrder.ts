/* Manual ordering for the library screens — folders and sets.

   iOS lets you drag both lists into an order but never saves it: `moveFolders`
   just reorders the in-memory array, so the arrangement is gone the next time
   the app opens. On the web the order is persisted in an `order` field, per the
   owner's decision, so it follows the account to any browser. iOS has no such
   field and ignores it, and its updates go through `setData(from:, merge: true)`
   — so editing a folder on the phone leaves the order intact.

   The mixed case matters: a folder created after you arranged the list has no
   `order` yet. It sorts FIRST, keeping the existing "newest on top" behaviour,
   rather than being buried at the bottom where a new folder would be easy to
   miss. Rearranging again assigns an order to everything and the mixed case
   disappears. */

export interface Orderable {
  id: string;
  createdAt: number;
  order?: number;
}

export const compareByOrder = (a: Orderable, b: Orderable): number => {
  const hasA = typeof a.order === 'number';
  const hasB = typeof b.order === 'number';
  if (hasA && hasB) return (a.order as number) - (b.order as number);
  /* Un-placed items first — they are the new ones. */
  if (hasA !== hasB) return hasA ? 1 : -1;
  return b.createdAt - a.createdAt;
};

export const sortByOrder = <T extends Orderable>(items: T[]): T[] =>
  [...items].sort(compareByOrder);

/** Pure move, as the drag and the arrow buttons both need. Out-of-range
    indices leave the list untouched rather than dropping an item. */
export const moveItem = <T>(items: T[], from: number, to: number): T[] => {
  if (from === to) return items;
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/** The batch to write after a rearrange: every item gets its position, so the
    list stops depending on createdAt entirely. */
export const assignOrder = (items: Orderable[]): { id: string; order: number }[] =>
  items.map((item, index) => ({ id: item.id, order: index }));

/** True when the arrangement differs from what is already stored — lets the
    "done" button skip a pointless batch write. */
export const orderChanged = (items: Orderable[]): boolean =>
  items.some((item, index) => item.order !== index);
