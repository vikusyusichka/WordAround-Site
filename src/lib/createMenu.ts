/* The 5 "create" actions, shared by the desktop dropdown (CreateMenu) and the
   mobile radial overlay (CreateMenuOverlay). Icons resolve via <Icon>; offsets
   are only used by the radial variant. Actions are stubs until Phase 3 wires
   Folder/Set (and later Text/Audio/Essay). */
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

export const CREATE_ITEMS: CreateItem[] = [
  { id: 'folder', labelKey: 'home.create.folder', icon: 'folder.fill', x: -150, y: -74, xPad: -210, yPad: -92, delay: 0.04 },
  { id: 'set', labelKey: 'home.create.set', icon: 'square.stack.3d.up.fill', x: -86, y: -144, xPad: -120, yPad: -182, delay: 0.1 },
  { id: 'text', labelKey: 'home.create.text', icon: 'doc.text.fill', x: 0, y: -174, xPad: 0, yPad: -220, delay: 0.16 },
  { id: 'audio', labelKey: 'home.create.audio', icon: 'waveform', x: 86, y: -144, xPad: 120, yPad: -182, delay: 0.22 },
  { id: 'essay', labelKey: 'home.create.essay', icon: 'pencil.and.scribble', x: 150, y: -74, xPad: 210, yPad: -92, delay: 0.28 },
];
