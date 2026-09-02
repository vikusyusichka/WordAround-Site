/* Mirror of the iOS SFSymbolCatalog
   (WordAround/Features/Flashcards/CreateSet/Components/Customization/SFSymbolCatalog.swift).

   The set icon is stored as an SF Symbol name shared with the iOS app, so both
   pickers must offer the same symbols — a set made here has to show the right
   icon in the app and vice versa. Keep this list in step with the Swift one.

   Swift's `[String: [String]]` is unordered, so iOS renders the sections in
   whatever order the dictionary yields; the web fixes an order instead. */

export interface SFSymbolSection {
  /** Stable id — also the i18next key under `createSet.iconGroup`. */
  id: string;
  symbols: string[];
}

export const SF_SYMBOL_SECTIONS: SFSymbolSection[] = [
  {
    id: 'learning',
    symbols: [
      'book.fill',
      'book.closed.fill',
      'books.vertical.fill',
      'graduationcap.fill',
      'brain.head.profile',
      'pencil',
      'pencil.and.outline',
      'square.and.pencil',
      'text.book.closed.fill',
      'doc.text.fill',
      'note.text',
      'clipboard.fill',
    ],
  },
  {
    id: 'languages',
    symbols: [
      'globe',
      'globe.europe.africa.fill',
      'globe.americas.fill',
      'character.bubble.fill',
      'text.bubble.fill',
      'quote.bubble.fill',
      'bubble.left.and.bubble.right.fill',
      'translate',
      'mic.fill',
      'speaker.wave.2.fill',
    ],
  },
  {
    id: 'nature',
    symbols: [
      'leaf.fill',
      'tree.fill',
      'sun.max.fill',
      'moon.fill',
      'cloud.fill',
      'cloud.rain.fill',
      'flame.fill',
      'drop.fill',
      'snowflake',
    ],
  },
  {
    id: 'health',
    symbols: [
      'heart.fill',
      'cross.case.fill',
      'stethoscope',
      'bandage.fill',
      'pills.fill',
      'bed.double.fill',
      'figure.walk',
      'figure.run',
      'figure.cooldown',
    ],
  },
  {
    id: 'food',
    symbols: [
      'fork.knife',
      'cup.and.saucer.fill',
      'wineglass.fill',
      'takeoutbag.and.cup.and.straw.fill',
      'birthday.cake.fill',
      'carrot.fill',
    ],
  },
  {
    id: 'travel',
    symbols: [
      'airplane',
      'car.fill',
      'bus.fill',
      'tram.fill',
      'bicycle',
      'map.fill',
      'location.fill',
      'suitcase.fill',
    ],
  },
  {
    id: 'work',
    symbols: [
      'briefcase.fill',
      'calendar',
      'calendar.badge.clock',
      'clock.fill',
      'checkmark.seal.fill',
      'chart.bar.fill',
      'chart.pie.fill',
    ],
  },
  {
    id: 'tech',
    symbols: [
      'laptopcomputer',
      'desktopcomputer',
      'ipad',
      'iphone',
      'apple.logo',
      'keyboard.fill',
      'cpu.fill',
      'server.rack',
      'wifi',
      'antenna.radiowaves.left.and.right',
    ],
  },
  {
    id: 'creativity',
    symbols: [
      'paintbrush.fill',
      'paintpalette.fill',
      'scissors',
      'camera.fill',
      'video.fill',
      'music.note',
      'guitars.fill',
      'headphones',
    ],
  },
  {
    id: 'general',
    symbols: [
      'star.fill',
      'sparkles',
      'bolt.fill',
      'trophy.fill',
      'flag.fill',
      'bell.fill',
      'tag.fill',
      'folder.fill',
      'paperplane.fill',
      'bookmark.fill',
      'link',
      'gearshape.fill',
    ],
  },
];

export const ALL_SF_SYMBOLS: string[] = SF_SYMBOL_SECTIONS.flatMap((s) => s.symbols);

/* iOS filters with localizedCaseInsensitiveContains over the symbol name, and
   caps the grid at 120 — matched here so both pickers behave the same. */
export const SYMBOL_RESULT_LIMIT = 120;

export const searchSFSymbols = (query: string): string[] => {
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? ALL_SF_SYMBOLS.filter((symbol) => symbol.toLowerCase().includes(needle))
    : ALL_SF_SYMBOLS;
  return matches.slice(0, SYMBOL_RESULT_LIMIT);
};
