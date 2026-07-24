/* SVG ports of the two Shape.path(in:) definitions inside FolderCardView.swift.

   iOS builds these against the live rect, mixing absolute values (an 18pt
   corner, a 26pt tab) with proportional ones (the tab is 32% of the width).
   The card has a fixed 128px height, so the paths below are drawn in that
   real pixel space with a viewBox sized by the caller — no normalizing, which
   keeps the corner radius from stretching on wide cards.

   FolderShape doubles as a CSS clip path for the decorations, so it is
   exported both as a <path d> string builder and as a rendered <svg>. */

/** iOS FolderShape: rounded rect whose top edge steps up into a tab on the left. */
export const folderPath = (w: number, h: number): string => {
  const corner = 18;
  const tabWidth = w * 0.32;
  const tabHeight = 26;

  return [
    `M ${corner} 0`,
    `L ${tabWidth - 20} 0`,
    `Q ${tabWidth - 2} 0 ${tabWidth} ${tabHeight}`,
    `L ${w - corner} ${tabHeight}`,
    `Q ${w} ${tabHeight} ${w} ${tabHeight + corner}`,
    `L ${w} ${h - corner}`,
    `Q ${w} ${h} ${w - corner} ${h}`,
    `L ${corner} ${h}`,
    `Q 0 ${h} 0 ${h - corner}`,
    `L 0 ${corner}`,
    `Q 0 0 ${corner} 0`,
    'Z',
  ].join(' ');
};

/** iOS BottomRightWaveShape: a crest sweeping up from the bottom-left corner. */
export const wavePath = (w: number, h: number): string =>
  [
    `M 0 ${h}`,
    `C ${w * 0.3} ${h * 0.25} ${w * 0.7} ${h * 0.95} ${w} ${h * 0.2}`,
    `L ${w} ${h}`,
    'Z',
  ].join(' ');
