/* The 5 "create" actions, shared by the desktop dropdown (CreateMenu) and the
   mobile radial overlay (CreateMenuOverlay). Icons resolve via <Icon>; offsets
   are only used by the radial variant. Every action has a destination — see
   CREATE_ROUTES below. */
export interface CreateItem {
  id: string;
  labelKey: string;
  icon: string;
  /** Radial offsets (phone / pad), y-up negative — mobile overlay only. */
  x: number;
  y: number;
  xPad: number;
  yPad: number;
  delay: number;
}

/* Destination route per create action, one per item in CREATE_ITEMS.

   Text, Audio and Essay sat here as `// later phases` long after those phases
   landed, so three of the five items in the "+" menu did nothing at all: the
   menu opened, you picked one, and it just closed again. The screens they
   belong to have existed since Phases 5-7. Destinations mirror what iOS opens
   from the same menu (HomeView.swift): the add-text sheet, audio import, and
   the essay practice screen. */
export const CREATE_ROUTES: Record<string, string> = {
  folder: '/folders/new',
  set: '/sets/new',
  text: '/practice/reading/my-texts/new',
  audio: '/practice/listening/import-audio',
  essay: '/practice/writing/essays',
};

export const CREATE_ITEMS: CreateItem[] = [
  { id: 'folder', labelKey: 'home.create.folder', icon: 'folder.fill', x: -150, y: -74, xPad: -210, yPad: -92, delay: 0.04 },
  { id: 'set', labelKey: 'home.create.set', icon: 'square.stack.3d.up.fill', x: -86, y: -144, xPad: -120, yPad: -182, delay: 0.1 },
  { id: 'text', labelKey: 'home.create.text', icon: 'doc.text.fill', x: 0, y: -174, xPad: 0, yPad: -220, delay: 0.16 },
  { id: 'audio', labelKey: 'home.create.audio', icon: 'waveform', x: 86, y: -144, xPad: 120, yPad: -182, delay: 0.22 },
  { id: 'essay', labelKey: 'home.create.essay', icon: 'pencil.and.scribble', x: 150, y: -74, xPad: 210, yPad: -92, delay: 0.28 },
];
