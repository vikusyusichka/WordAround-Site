/* Zero-size SVG registering the Home icon gradients so Phosphor glyphs can
   reference them via the .home-*-gradient utility classes (index.css). Web
   stand-in for SwiftUI's LinearGradient foregroundStyle. Mount once on the
   Home screen. Mirrors the Phase-1 AuthIconGradientDefs precedent. */
export const HomeIconGradientDefs = () => (
  <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
    <defs>
      {/* Header avatar (person.crop.circle.fill) */}
      <linearGradient id="home-avatar-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--color-home-avatar-from)" />
        <stop offset="1" stopColor="var(--color-home-avatar-to)" />
      </linearGradient>
      {/* Sidebar icon — selected */}
      <linearGradient id="home-side-icon-sel-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--color-home-side-icon-from)" />
        <stop offset="1" stopColor="var(--color-home-side-icon-to)" />
      </linearGradient>
      {/* Sidebar icon — unselected */}
      <linearGradient id="home-side-icon-off-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--color-home-side-icon-off-from)" />
        <stop offset="1" stopColor="var(--color-home-side-icon-off-to)" />
      </linearGradient>
    </defs>
  </svg>
);
