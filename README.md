# WordAround — Web

Web version of the WordAround iOS language-learning app. Shares the same
Firebase project and Cloudflare AI Worker as iOS, so users and data are
common between both platforms.

See [MIGRATION.md](MIGRATION.md) for the full plan and phase breakdown.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** — design tokens ported 1:1 from `AppColors.swift` +
  `Layout.swift`
- **Motion** (Motion One) — springs match SwiftUI `.spring(response:)`
- **Firebase Web SDK v11** — Auth (email/password + Google) + Firestore +
  Storage
- **Zustand** — session store equivalent
- **TanStack Router** + **TanStack Query**
- **react-hook-form** + **zod**
- **lucide-react** — SF Symbols replacement
- **Manrope** (self-hosted via `@fontsource-variable/manrope`) — SF Pro
  Rounded substitute
- **i18next** — English active from day 1, `uk`/`pl`/`de` scaffolded
- **Vitest** + **Playwright** — unit + e2e from day 1

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 — you'll be redirected to `/onboarding`. Click
the sign-in button to seed the onboarding flag, then hit `/phase0` in the
URL to see the design-token / icon / session state smoke page.

### Environment

Real values live in `.env.local` (git-ignored). Template is
`.env.example`. Firebase Web config is not secret — real security lives in
Firestore rules. The Cloudflare Worker URL is likewise safe to expose.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | Type-check + production build |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | tsc `--noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest watch |
| `npm run test:run` | Vitest one-shot (CI mode) |
| `npm run e2e:install` | Install Playwright browsers |
| `npm run e2e` | Playwright end-to-end |

## Repo layout

```
src/
  main.tsx                     App entry
  styles/                      Tailwind + design tokens + font
    index.css                    @theme, @layer base, imports the rest
    tokens.css                   Responsive overrides at ≥700px
    fonts.css                    Manrope Variable
  lib/
    env.ts                       Runtime-validated env config
    firebase.ts                  Modular Firebase init
    i18n.ts                      i18next boot
    icons.ts                     SF Symbol → Lucide map
    queryClient.ts               TanStack Query client
  stores/
    sessionStore.ts              Auth state machine (Zustand)
  components/
    primitives/                  Reusable Screen/Card/Icon/SectionTitle/BlobBackground
  routes/                        TanStack Router file-based routes
    __root.tsx                     Root shell
    index.tsx                      /  → onboarding/auth/phase0 redirect
    onboarding.tsx                 /onboarding
    auth.tsx                       /auth
    verify-email.tsx               /verify-email
    phase0.tsx                     /phase0 — smoke landing
  locales/                       i18n resources
    en/common.json                 English (source of truth)
    uk/common.json                 Ukrainian (scaffolded)
    pl/common.json                 Polish (scaffolded)
    de/common.json                 German (scaffolded)
  test/setup.ts                  Vitest jsdom + jest-dom + cleanup

e2e/
  smoke.spec.ts                  Playwright landing checks
```

## What Phase 0 delivers

- Vite dev-server boots
- Firebase initialized against the same project the iOS app uses
- Design tokens (colors, radii, spacing, typography) available as CSS vars
  and as Tailwind utilities
- Manrope loaded, SF Pro fallback for Apple devices
- Router boots with an auth-gate redirect logic scaffolded
- Session store subscribes to `onAuthStateChanged`
- SF Symbols → Lucide mapping for the icons Phase 1–3 will need
- 12 base UI primitives ready to compose (Screen, Card, SectionTitle,
  BlobBackground, Icon)
- Unit tests via Vitest, e2e tests via Playwright — both runnable

## What's next — Phase 1

Real onboarding illustration + email/password + Google sign-in +
verify-email flow. Real screens replace the placeholders in
`routes/onboarding.tsx`, `routes/auth.tsx`, `routes/verify-email.tsx`.
