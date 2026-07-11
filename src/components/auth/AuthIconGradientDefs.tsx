/* Zero-size SVG that registers the auth icon gradient (#auth-icon-grad) in
   the document so Phosphor icons can reference it via the .auth-icon-gradient
   utility class — the web stand-in for SwiftUI's LinearGradient foregroundStyle. */
export const AuthIconGradientDefs = () => (
  <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="auth-icon-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--color-auth-icon-from)" />
        <stop offset="1" stopColor="var(--color-auth-icon-to)" />
      </linearGradient>
    </defs>
  </svg>
);
