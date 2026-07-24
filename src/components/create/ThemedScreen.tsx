/* Full-bleed colour wash behind a create screen — the single most visible
   trait of CreateFolderView / CreateSetView on iOS, where picking yellow turns
   the whole screen warm yellow.

   Positioned `absolute inset-0`, so it sizes to the shell's content column
   (the nearest positioned ancestor) rather than the viewport: the sidebar keeps
   its own background and nothing about the shell needs to change. */

interface ThemedScreenProps {
  /** A SetTheme.screenBackground value. */
  background: string;
}

export const ThemedScreen = ({ background }: ThemedScreenProps) => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 -z-10 transition-colors duration-300"
    style={{ background }}
  />
);
