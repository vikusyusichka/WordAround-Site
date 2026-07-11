# Phase 1 — Onboarding + Auth (WordAround Web)

> Durable in-repo copy of the approved Phase 1 plan, so a fresh chat session
> can pick it up. Phase 0 is already done and in the working tree. Execute this
> plan in a new chat. See also `MIGRATION.md` (full roadmap) and `README.md`.

## Context

WordAround is an iOS SwiftUI language-learning app being ported to a web SPA
with pixel-accurate design parity. **Phase 0 is complete** (Vite + React 19 +
TS + Tailwind v4 + Firebase + Zustand + TanStack Router + i18next + Phosphor
icons + Motion).

Phase 1 replaces the three placeholder auth screens
(`src/routes/onboarding.tsx`, `src/routes/auth.tsx`,
`src/routes/verify-email.tsx`) with faithful ports of the iOS screens, wires
real Firebase Auth (email/password + Google), and completes the router
auth-gate so the app routes correctly on load.

**Stack decisions already locked** (do not revisit): Motion (Motion One, not
Framer) for animation; Phosphor (`@phosphor-icons/react`) for icons via the
`Icon` primitive; react-hook-form + zod for forms; Firebase Web SDK v11
modular; same Firebase project as iOS (`wordaround-97f86`).

The reference iOS source lives at `github.com/vikusyusichka/WordAround` branch
`develop`. Re-fetch to read Swift beyond the specs embedded below:
```bash
curl -sL https://api.github.com/repos/vikusyusichka/WordAround/tarball/develop -o wa.tar.gz && tar -xzf wa.tar.gz
```
Reference files: `WordAround/Features/Onboarding/Views/OnboardingView.swift`,
`WordAround/Features/Onboarding/Components/BlobShape.swift`,
`WordAround/Features/Auth/Views/AuthView.swift`,
`WordAround/Features/Auth/ViewModels/AuthViewModel.swift`,
`WordAround/Features/Auth/Views/VerifyEmailView.swift`,
`WordAround/Features/Auth/ViewModels/VerifyEmailViewModel.swift`.

---

## Prerequisite (USER ACTION — do first, one-time)

Google popup sign-in and the shared real Firebase project require authorized
domains. In [Firebase Console](https://console.firebase.google.com) →
project **WordAround** (`wordaround-97f86`) → **Authentication** → **Settings**
→ **Authorized domains** → add:
- `localhost` (for local dev testing)
- `wordaround-site.pages.dev` (for the deployed site later)

Also confirm **Authentication → Sign-in method** has **Email/Password** and
**Google** providers enabled (they should already be, since iOS uses them).

Verification in Phase 1 uses a **real throwaway test account** created through
the signup form on this real project (user's choice).

---

## Design specs (embedded — SwiftUI → web)

All three screens share: background `#F5F5FB`, the exact `BlobShape` path, a
rounded font (Manrope), and a distinct **auth blue palette** that is LIGHTER
than the app's main `--color-primary-blue`. Add these auth-specific tokens to
`src/styles/index.css` `@theme` (do not reuse the main primary blue):

```
--color-auth-blue: #408FF7;        /* links, accents (0.25,0.56,0.97) */
--color-auth-title: #3D5299;       /* headings (0.24,0.32,0.60) */
--color-auth-subtitle: #828CAB;    /* subtitles (0.51,0.55,0.67) */
--color-auth-field-border: #DBE3F2;/* (0.86,0.89,0.95) */
--color-auth-field-icon: #7094F2;  /* (0.44,0.58,0.95) */
--color-auth-label: #59637D;       /* field labels (0.35,0.39,0.49) */
/* Button gradient stops */
--color-auth-grad-from: #298FF7;   /* (0.16,0.56,0.97) */
--color-auth-grad-to: #4FA3FC;     /* (0.31,0.64,0.99) */
/* Globe / icon gradient stops */
--color-auth-icon-from: #78B0FC;   /* (0.47,0.69,0.99) */
--color-auth-icon-to: #3380F5;     /* (0.20,0.50,0.96) */
```

### 0. Shared: fix the BlobShape primitive

The current `src/components/primitives/BlobBackground.tsx` uses a generic blob
path. **Replace its `<path d="...">` with the exact iOS BlobShape** so blobs
match 1:1. The SwiftUI path (normalized 0..1, multiply by 100 for a
`viewBox="0 0 100 100"`; note some control points intentionally exceed the
box):
```
M 12 24
C 20 2,  53 -2,  70 8
C 92 12, 105 24, 96 42
C 90 70, 100 92, 84 88
C 62 92, 40 106, 28 96
C 4 82,  -4 68,  4 56
C 10 44, -2 28,  12 24
Z
```
Keep the existing props (`color`, `rotation`, `opacity`, `className`); callers
size via `className` width/height. Blobs are positioned absolutely by each
screen (see per-screen blob tables below).

### 1. OnboardingView → `src/routes/onboarding.tsx`

Layout (centered column, horizontal padding 24px):
- Top spacer ~105px → hero → title (top 24) → start button (top 24).
- **Hero** (concentric circles, centered): outer circle Ø320 `#E8EFFB`@0.78;
  inner Ø238 `#F2F5FC`; white stroke ring Ø268 width 18 @0.55; thin ring Ø292
  width 1 `#E3EBF7`; then the rotating greeting ring; then the globe Ø150.
- **Rotating greetings** (5 capsules orbiting): container rotates 0→360° over
  **18s linear infinite**. Each greeting is a white@0.72 capsule (px14 py8,
  1px border of its own color @0.18, soft shadow), positioned at `translateY(-132px)`
  then `rotate(angle)`. Items:
  | text | color | angle |
  |---|---|---|
  | Hello | `#408FF7` | -18 |
  | Hola | `#FABD45` | 52 |
  | Bonjour | `#F28AA8` | 126 |
  | 你好 | `#6BC794` | 198 |
  | नमस्ते | `#8CA1F7` | 272 |
  In iOS the text rotates with the ring (no counter-rotation) — replicate that.
- **Globe** Ø150: radial-gradient white→`#F5F7FC`→`#E8EEF7` disc with a soft
  top-left highlight, containing a globe glyph filled with the
  `auth-icon-from→auth-icon-to` gradient, **spinning 0→-360° over 10s linear
  infinite**. iOS uses SF Symbol `globe.europe.africa.fill` — use Phosphor
  `Globe` (or `GlobeHemisphereWest`) at `weight="fill"` with the gradient via
  an SVG `<linearGradient>` fill, or a CSS `background-clip` trick.
- **Title**: "WordAround" 40px bold `#3D5299`; subtitle "Learn words in a fun
  and simple way" (two lines) 18px semibold `#828CAB`, centered, line-height ~1.3.
- **Start button**: "Let's Start" + arrow-right (Phosphor `ArrowRight`
  weight bold), 24px bold white, fixed 305×78, capsule, gradient
  `auth-grad-from→auth-grad-to` (leading→trailing), shadow
  `0 12px 18px rgba(48,145,247,0.24)`. On click: `localStorage.setItem('wa.onboarded','1')`
  then navigate to `/auth`.
- Background blobs (offsets are from center, iOS points ≈ px; y-down):
  | color | size | rotate | x | y | opacity |
  |---|---|---|---|---|---|
  | `#F2DBA1` | 270×315 | 14 | 195 | -330 | 1 |
  | `#F2DBA1` | 270×330 | -18 | -200 | 360 | 1 |
  | `#EBD1DE` | 120×135 | 22 | -175 | -40 | 0.55 |
  | `#D4DEF5` | 125×140 | -18 | -185 | 245 | 0.55 |
  | `#D1E3D9` | 145×155 | 16 | 180 | 305 | 0.60 |
  | `#FAC7D1` | 95×110 | -8 | 170 | -55 | 0.32 |
  | `#C7E3F7` | 105×115 | 28 | -150 | 120 | 0.35 |
  | `#D1EDD1` | 110×120 | -24 | 120 | 160 | 0.28 |

  Use a centered absolute container; position each blob with
  `translate(-50%,-50%) translate(x, y)`. Blobs overflow the viewport (intended
  — wrap the screen in `overflow-hidden`).

Use plain CSS `@keyframes` for the two infinite rotations (simplest; already
respects `prefers-reduced-motion` handled globally in `tokens.css`). Motion is
available if a spring is wanted.

### 2. AuthView → `src/routes/auth.tsx`

Centered column, horizontal padding 28px, top spacer ~50px.
- **Back button** (top-left, fixed): Phosphor `CaretLeft` bold 18px in a white@0.9
  Ø38 circle with soft shadow → navigate to `/onboarding`.
- **Header**: white@0.85 Ø110 circle (shadow), Phosphor `UserCircle` weight fill
  72px filled with `auth-icon` gradient; "Welcome Back" 34px bold `#3D5299`;
  "Sign in to continue learning" 17px medium `#828CAB`.
- **Form** (top 36, spacing 18): reusable `AuthField` component —
  label (15px semibold `#59637D`) above a 58px-tall white@0.9 rounded-20 input
  with 1px `#DBE3F2` border, a leading Phosphor icon (`#7094F2`, Ø20 slot) and
  the input. Fields:
  - Email — icon `Envelope` (fill), type=email, placeholder "Enter your email".
  - Password — icon `Lock` (fill), type=password + show/hide eye toggle
    (`Eye`/`EyeSlash`), placeholder "Enter your password".
  - "Forgot password?" link, right-aligned, 14px semibold `#408FF7`.
- **Actions** (top 28, spacing 18):
  - Error text (red, 14px) / info text (green, 14px) above the button.
  - **Sign In** button: 64px full-width capsule, `auth-grad` gradient, 22px bold
    white, shadow `0 10px 14px rgba(48,145,247,0.22)`; "Signing In..." + spinner
    while loading; disabled while loading.
  - **Continue with Google**: 56px white@0.95 capsule, 1px `#DBE3F2` border, a
    proper multicolor Google "G" mark (inline SVG) + "Continue with Google" 18px
    semibold black. Calls `signInWithPopup`.
  - **Create Account** text button, 16px semibold `#408FF7`.
- Background: 4 blobs (from center):
  | color | size | rotate | x | y |
  |---|---|---|---|---|
  | `#F2DBA1` | 240×270 | 18 | 180 | -320 |
  | `#D1E3D9` @0.55 | 150×170 | -14 | 180 | 300 |
  | `#D4DEF5` @0.50 | 150×170 | 20 | -180 | 250 |
  | `#EBD1DE` @0.42 | 120×140 | -18 | -175 | -40 |

### 3. VerifyEmailView → `src/routes/verify-email.tsx`

Centered column, padding 28px, top spacer ~56px.
- **Hero**: envelope in pulsing rings + 3 floating badges.
  - Center: white@0.88 Ø130 circle (shadow); gradient disc Ø100
    (`#E0F0FF`→white) pulsing scale 0.96↔1.04 over 1.8s ease-in-out infinite;
    white stroke ring Ø112 pulsing scale 0.92↔1.10 / opacity 0.55↔0.25;
    envelope glyph (Phosphor `Envelope` fill) Ø56 in `auth-icon` gradient,
    pulsing 0.95↔1.05 over 1.6s.
  - 3 badges (13px bold white capsule, px14 py9, colored shadow), animating from
    a collapsed state (scale 0.82, opacity 0.15, y+6) to their offset, each
    `ease-in-out 1.9s` with a stagger delay, repeat-forever autoreverse:
    | text | color | x | y | delay |
    |---|---|---|---|---|
    | Check inbox | `#FAC980` | -140 | -14 | 0.0s |
    | Confirm | `#A8D6B8` | 108 | -22 | 0.45s |
    | Done | `#B8C9FA` | 82 | 72 | 0.9s |
  - Title "Verify Your Email" 34px bold `#3D5299`; "One more step before you
    start learning" 17px medium `#828CAB`.
- **Content card** (white@0.88, rounded-28, 1px `#DBE3F2` border, shadow):
  "We sent a verification link to" 16px medium `#828CAB`; the email 20px bold
  black; then 3 numbered steps — each a Ø28 `#E0F0FF` circle with a bold number
  `#3D7AE6`, then step text 15px medium `#5C6680`:
  1. "Open the email in your inbox"
  2. "Tap the confirmation link"
  3. "Return here and continue"
- **Status cards**: error (red@0.12 bg, red@0.18 border, red text) / info
  (green tint) — rounded-18, 14px medium, centered.
- **Actions**: "I Verified My Email" button (same primary style as Sign In;
  calls check-status); "Resend Email" (56px white capsule outline, 16px semibold
  `#408FF7`); "Use Another Account" text button (17px bold `#408FF7`) → signs out.
- Background: 4 blobs (near-identical to Auth; sizes 250×285@180,-320 /
  150×170@175,305 / 155×175@-178,250 / 125×145@-170,-45).

---

## Implementation steps

### Step A — Auth service layer  `src/lib/authService.ts`
Thin wrapper over `firebase/auth` mirroring the iOS `AuthServiceProtocol`.
Reuse existing `auth` and `googleProvider` from `src/lib/firebase.ts`.
Functions (all async): `signIn(email,password)` →
`signInWithEmailAndPassword`; `signUp(email,password)` →
`createUserWithEmailAndPassword` then `sendEmailVerification(user)`;
`signInWithGoogle()` → `signInWithPopup(auth, googleProvider)`;
`sendPasswordReset(email)` → `sendPasswordResetEmail`;
`resendVerification()` → `sendEmailVerification(auth.currentUser)`;
`reloadUser()` → `reload(auth.currentUser)`. Trim email before use.

### Step B — Firebase Web error mapping  `src/lib/authErrors.ts`
iOS maps numeric `NSError` codes; **Web SDK uses string `error.code`**. Map to
the SAME user-facing copy the iOS app uses:
| web code | message |
|---|---|
| `auth/invalid-email` | Invalid email format |
| `auth/wrong-password` | Incorrect password |
| `auth/user-not-found` | No account found with this email |
| `auth/invalid-credential` | Incorrect email or password |
| `auth/email-already-in-use` | This account already exists |
| `auth/weak-password` | Password must be at least 6 characters |
| `auth/network-request-failed` | Network error. Check your internet connection |
| `auth/too-many-requests` | Too many attempts. Try again later |
| `auth/account-exists-with-different-credential` | This email is already used with another sign-in method |
| `auth/popup-closed-by-user`, `auth/cancelled-popup-request` | *(return null — no error shown)* |
| default | Authentication failed. Please try again |
Route all copy through i18next (`errors.*` namespace).

### Step C — Validation  `src/lib/authValidation.ts` (+ zod schemas)
Port iOS rules: email regex
`^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`; password required; sign-up
password ≥ 6. Provide zod `signInSchema` and `signUpSchema` for
react-hook-form, plus standalone `isValidEmail` for the reset path. Messages
match iOS: "Email is required", "Enter a valid email", "Password is required",
"Password must be at least 6 characters".

### Step D — Auth actions store  `src/stores/authStore.ts` (Zustand)
Equivalent of `AuthViewModel`: `isLoading`, `errorMessage`, `infoMessage` +
`signIn/signUp/signInWithGoogle/resetPassword` calling Step A, mapping errors
via Step B, and on success calling
`useSessionStore.getState().refreshAuthState()`. Form field state lives in
react-hook-form, not here. `signUp` sets info "Account created. We sent a
verification email." A verify store covers `resendVerification`
("Verification email sent again") and `checkVerification` ("Email is not
verified yet" when still unverified) → both refresh session.

### Step E — Screens (specs in sections 1–3)
Rewrite the three route files. Extract shared pieces:
- `src/components/auth/AuthField.tsx` (label + iconed input, password eye toggle)
- `src/components/auth/PrimaryButton.tsx` (gradient capsule + loading state)
- `src/components/auth/AuthBackground.tsx` (positions a passed blob list)
- `src/components/auth/GoogleButton.tsx` (Google G mark + popup call)
Reuse existing `Screen`, `Card`, `Icon`, and the fixed `BlobBackground`.

### Step F — Router auth-gate  `src/routes/index.tsx` + gate helper
Firebase resolves auth asynchronously (`state.kind` may be `loading`). Add
`waitForAuthReady()` in `src/stores/sessionStore.ts` — a promise resolving
after the first `onAuthStateChanged` fires. In `index.tsx` `beforeLoad`: await
it, then redirect: not-onboarded → `/onboarding`; `loggedOut` → `/auth`;
`emailVerificationRequired` → `/verify-email`; `authenticated` → `/phase0`
(temporary landing until Phase 2 Home). Also: `/auth` redirects to `/phase0` if
already authenticated; `/verify-email` bounces to `/auth` when `loggedOut` or
`/phase0` when fully `authenticated`. While `loading`, render a light splash
(BlobBackground + spinner) so there is no flash of the wrong screen.

### Step G — i18n keys
Extend `src/locales/en/common.json` with all Phase 1 copy under `auth.*`,
`onboarding.*`, `verify.*`, `errors.*`; add matching keys (English ok for now)
to `uk/pl/de`. Every visible string goes through `t()`.

---

## Files summary

Create: `src/lib/authService.ts`, `src/lib/authErrors.ts`,
`src/lib/authValidation.ts`, `src/stores/authStore.ts`,
`src/components/auth/{AuthField,PrimaryButton,AuthBackground,GoogleButton}.tsx`.
Modify: `src/components/primitives/BlobBackground.tsx` (exact path),
`src/routes/{onboarding,auth,verify-email,index}.tsx`,
`src/stores/sessionStore.ts` (add `waitForAuthReady`),
`src/styles/index.css` (auth tokens), all four `src/locales/*/common.json`.

---

## Tests

- **Unit (Vitest)**: `authValidation` (email regex, password rules);
  `authErrors` (each web code → copy, popup-closed → null); `authStore` with a
  mocked `authService` (success sets info/refreshes; failure sets mapped error;
  loading toggles).
- **Component (RTL)**: `AuthField` renders label + placeholder + toggles
  password visibility; Auth screen shows a validation error on empty submit.
- **E2e (Playwright)**: onboarding → "Let's Start" → `/auth`; empty submit shows
  "Email is required"; invalid email shows "Enter a valid email". (Real
  Google/login not asserted in CI.)

## Verification (end-to-end, real project)

1. Ensure the USER prerequisite (authorized domains) is done.
2. `npm run dev`; drive with the browser MCP:
   - Clear `localStorage` → `/` redirects to `/onboarding`; visually diff hero,
     orbiting greetings, globe spin, blobs against iOS.
   - Click "Let's Start" → `/auth`. Check fields, icons, gradient button.
   - **Create a real throwaway test account** (e.g. `webtest+<rand>@gmail.com`)
     via "Create Account" → expect `/verify-email` + info copy; confirm the user
     appears in Firebase Console → Authentication → Users.
   - `/verify-email`: "Resend Email" → email arrives; after clicking the link,
     "I Verified My Email" → routes to `/phase0`.
   - Sign out → `/auth`; sign back in → `/phase0`. Test Google popup once.
   - Reload while authenticated → brief splash, then `/phase0` (no `/auth` flash).
3. `npm run typecheck`, `npm run test:run`, `npm run lint`, `npm run build`
   all green. Zero console errors.
4. Delete the test account from Firebase Console when done (optional).

## Out of scope for Phase 1
Home shell, bottom nav, sidebar, dashboard, flashcards (Phase 2+). Apple
Sign-In (not in iOS). The authenticated landing stays as the temporary
`/phase0` page until Phase 2 replaces it with the real Home.
