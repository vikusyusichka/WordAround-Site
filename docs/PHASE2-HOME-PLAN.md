# Phase 2 — Home shell (WordAround Web)

## Context

WordAround (iOS SwiftUI) is being ported to a web SPA with pixel-accurate
design parity. **Phase 0 (scaffold) and Phase 1 (Onboarding + Auth) are done in
the working tree** (not yet committed). Phase 1 shipped the three auth screens,
real Firebase Auth, the router auth-gate (`waitForAuthReady()` + splash), the
exact iOS `BlobShape`, auth design tokens, and an `Icon` primitive that maps SF
Symbols → Phosphor.

Phase 2 builds the **Home shell** — the first screen a signed-in user sees. It
ports `Features/Home` from iOS 1:1: a blob background, a header, a vertical
category sidebar, a floating bottom navigation bar with a radial "create" menu,
and the dashboard content (today-goal progress card, three stat cards, and the
"Your sets" list). It **replaces the temporary `/phase0` landing with a real
`/home`** and repoints the auth-gate so `authenticated → /home`.

Real set/folder data and the create/detail flows arrive in **Phase 3**
(Firestore). In Phase 2 the stats and today-goal are static placeholders (they
are literally static in iOS too), and "Your sets" is fed by a small stub so the
UI can be built and verified now; the create-menu actions are no-ops until
Phase 3+. Everything is wired so Phase 3 only swaps the data source.

**Stack conventions (locked in Phase 0/1 — keep consistent):** colors from
`AppColors.swift` → CSS vars in `src/styles/index.css` `@theme`; sizes from
`Layout.swift` → Tailwind arbitrary values / responsive tokens at the 700px
`md` breakpoint; SF Symbols → `<Icon>` (extend `src/lib/icons.ts`); Zustand for
nav/UI state; **Motion** (`motion/react`) for the radial spring + plus-icon
rotation, CSS transitions for simple press/scale; every visible string via
i18next (`t()`), keys in `src/locales/*/common.json`.

Reference iOS source (branch `develop`, already fetched to this session's
scratchpad): `WordAround/Features/Home/**` (Views, ViewModels, Components,
Models, Mappers), `WordAround/Features/Flashcards/Sets/SetsListView.swift` +
`SetsListHeaderView.swift`, `WordAround/Core/Theme/{AppColors,Layout}.swift`.

---

## Design specs (embedded — SwiftUI → web)

### Responsive rule
iOS branches every size on `isPadLike` (iPad). Web maps: **< 700px = phone
values**, **≥ 700px (`md:`) = pad values**. `isCompactPhone` is always `false`
in iOS, so its branch is ignored (use the phone value). Sidebar width
86px (phone) / 108px (pad).

### 0. Colors — add a Home token block to `src/styles/index.css` `@theme`
The base tokens (`--color-primary-blue #2b5cfa`, `--color-primary-blue-dark
#214ad1`, `--color-text-secondary #828cab`, `--color-muted-text #8f99b7`,
`--color-app-bg #f6f6fb`, `--color-blob-blue #d6e0fa`, `--color-blob-green
#d1e3d9`, `--color-goal-bg #f2f5ff`, `--color-goal-progress-bg #d9e0f7`) already
exist and match `AppColors.swift`. Add these Home-specific tokens (hex computed
from the iOS RGB triples):

```
/* Home header */
--color-home-avatar-from: #b3bfd9;   /* (0.70,0.75,0.85) */
--color-home-avatar-to:   #6b7a99;   /* (0.42,0.48,0.60) */
--color-home-notif:       #ff4a3d;   /* (1.0,0.29,0.24)  */
/* Bottom nav + create menu + sidebar brand blue */
--color-home-brand:        #2b5cfa;  /* (0.17,0.36,0.98) = primaryBlue */
--color-home-nav-inactive: #949eb5;  /* (0.58,0.62,0.71) */
--color-home-nav-sel-bg:   #ebf0ff;  /* (0.92,0.94,1.0)  */
/* Sidebar gradients / states */
--color-home-side-ind-from: #3d70fc; /* (0.24,0.44,0.99) */
--color-home-side-ind-to:   #2e5ceb; /* (0.18,0.36,0.92) */
--color-home-side-icon-from:#3361f0; /* (0.20,0.38,0.94) */
--color-home-side-icon-to:  #4f80fc; /* (0.31,0.50,0.99) */
--color-home-side-icon-off-from:#a3abbf; /* (0.64,0.67,0.75) */
--color-home-side-icon-off-to:  #99a1b8; /* (0.60,0.63,0.72) */
--color-home-side-circle-to:#f0f7ff; /* (0.94,0.97,1.0)  */
--color-home-side-text-sel: #3361f0; /* (0.20,0.38,0.94) */
--color-home-side-text-off: #9ea6ba; /* (0.62,0.65,0.73) */
/* Stat card 1 — Learned today (purple) */
--color-home-stat1-accent:#a38afa; --color-home-stat1-title:#9478fa;
--color-home-stat1-bg:#f5f0ff;     --color-home-stat1-blob:#dbcfff;
/* Stat card 2 — Accuracy (green) */
--color-home-stat2-accent:#6bccab; --color-home-stat2-title:#54ba94;
--color-home-stat2-sub:#1aa861;    --color-home-stat2-bg:#edfcf7;
--color-home-stat2-blob:#c4ebd9;
/* Stat card 3 — Streak (orange) */
--color-home-stat3-accent:#faad33; --color-home-stat3-title:#ab5c05;
--color-home-stat3-bg:#fff5e3;     --color-home-stat3-blob:#fadb9e;
/* Today-goal progress card */
--color-home-goal-blob:#d1dbfa;    --color-home-goal-sparkle:#a8b8ff;
```

### 1. Layout tokens — add a Home block to `@theme` (phone) + `tokens.css` (≥700 pad)
Mirror the Phase-0 pattern (compact defaults in `index.css`, `@media (min-width:
700px)` overrides in `tokens.css`). Values straight from `Layout.swift`:

| token | phone | pad |
|---|---|---|
| home sidebar width | 86 | 108 |
| home h-padding | 16 | 28 |
| home top spacing | 12 | 20 |
| home content spacing | 12 | 16 |
| home header↔sidebar spacing | 8 | 14 |
| bottom-bar h-padding | 14 | 28 |
| bottom-bar bottom padding | 10 | 20 |
| home bottom-safe spacing | 118 | 132 |
| stat-card spacing | 8 | 14 |
| sets-list spacing | 10 | 14 |
| section-title size | 22 | 34 |
| header title size | 29 | 34 |
| header subtitle size | 15 | 18 |
| header avatar circle / icon | 54 / 42 | 62 / 48 |
| header notif dot | 12 | 14 |

Component-local sizes (bottom nav, sidebar, stat, progress, set-item, create
menu) are dense; port them as **Tailwind arbitrary values with `md:` variants**
inside each component (phone value default, `md:` = pad value) rather than
global tokens, matching the numbers in the tables below. This keeps each
component auditable against its Swift source.

### 2. Home background → `src/components/home/HomeBackground.tsx`
Absolute layer over `--color-app-bg`. iOS positions via `GeometryReader` from
the **bottom**; replicate with `bottom`/`left` offsets:
- BlobShape (reuse `BlobBackground`), `--color-blob-blue` @0.45, rotate 18°,
  size 120×160 (phone) / 180×240 (pad); x = 28/90 from left, bottom offset
  110/130.
- Green dot: circle `--color-blob-green` @0.65, Ø12/16, x 78/142, bottom 76/98.
- Blue dot: circle `--color-blob-blue` @0.8, Ø10/14, x 128/210, bottom 142/148.
Wrap the whole screen in `overflow-hidden`.

### 3. Header → `src/components/home/HomeHeader.tsx`
Props `title`, `subtitle`. `HStack` top-aligned:
- Left `VStack` gap 6: title (bold, `--color-primary-blue-dark`, 29/34px) +
  subtitle (medium, `--color-muted-text`, 15/18px).
- Right: Ø54/62 white(0.95) circle (shadow `0 4px 8px rgba(0,0,0,0.05)`) with a
  `person.crop.circle.fill` glyph Ø42/48 filled with an avatar gradient
  (`--color-home-avatar-from→to`, top-leading→bottom-trailing) — use the
  `<Icon>` + gradient-fill trick from Phase 1 (`AuthIconGradientDefs` precedent
  → add a small `HomeIconGradientDefs`), or an inline SVG. Overlay a Ø12/14
  `--color-home-notif` dot (2px white stroke) at top-trailing, offset (1,1).

### 4. Category sidebar → `src/components/home/CategorySidebar.tsx`
Vertical stack (spacing 12/16, vertical padding 2/6) of 4 items
(`speaking/listening/reading/writing`), each `HStack` (spacing 6/8, h-padding
4/6):
- **Indicator bar** (ZStack, container width 3/4): a `Capsule`; when selected a
  gradient `--color-home-side-ind-from→to` (top→bottom), width 4 (pad) /3, height
  80/96; unselected transparent, width max(2,w-1), height 68/82; selected adds a
  shadow (`--color-home-side-ind` @0.16, radius 6/8) and a white(0.55) highlight
  capsule (1.4×18 / 1.8×22) offset y −16/−18. Spring on select.
- **Item content** (VStack, spacing 8/10, frame 60×78 / 78×98): Ø46/50
  (unselected) or 50/58 (selected) circle with a white→`--color-home-side-circle-to`
  gradient (selected) or white(0.90→0.76) (unselected), soft shadow; inside a
  `category.icon` via `<Icon>` (size 18/21) filled with the selected/unselected
  icon gradient; press scale 0.88, selected 1.05. Label below: `category.title`
  **UPPERCASE** (bold rounded, 9/10.5px), color selected `--color-home-side-text-sel`
  / off `--color-home-side-text-off`, 2 lines, minScale 0.85.
- Icons: speaking `bubble.left.and.bubble.right`, listening `headphones`,
  reading `book`, writing `pencil.and.scribble` (all already mapped in
  `icons.ts`). Tap → `homeStore.setSelectedCategory(cat)` with a spring.

### 5. Bottom navigation bar → `src/components/home/BottomNavigationBar.tsx`
Fixed near the bottom (h-padding 14/28, bottom padding 10/20), height 84/110,
white(0.96) rounded 26/34 with shadow (`0 5px 12px` / `0 8px 18px`
rgba(0,0,0,0.04)) + 1px white(0.95) inner stroke. 5 tabs
(`home/folders/create/flashcards/profile`), each `flex-1`:
- **Regular tab** (home/folders/flashcards/profile): VStack (spacing 5/8),
  button height 60/82. Icon frame height 40/52: when selected a Ø40/50
  `--color-home-nav-sel-bg` circle behind the icon; icon size 20/26, color
  selected `--color-home-brand` / off `--color-home-nav-inactive`; press scale
  0.92. Below: Ø6/8 dot, `--color-home-brand` when selected (scale 1, spring)
  else transparent (scale 0.5). Icon names swap on select: home
  `house`↔`house.fill`, folders `folder`↔`folder.fill`, flashcards
  `square.stack.3d.up` (no fill variant), profile `person`↔`person.fill`.
- **Create tab** (center): Ø60/72 `--color-home-brand` circle with colored
  shadow (`--color-home-brand` @0.24, radius 10/14, y 6/8); white `plus` icon
  size 30/36 that **rotates 45° via Motion** when the menu is open; press scale
  0.92. Tap → `homeStore.toggleCreateMenu()`.
- Selected state derives from `homeStore` (`selectedTab ?? 'home'`). Tapping a
  regular tab sets it and closes the create menu (spring). Press state can be
  local component state.

### 6. Radial create-menu overlay → `src/components/home/CreateMenuOverlay.tsx`
Shown when `homeStore.isCreateMenuPresented`. Full-screen backdrop
(`backdrop-blur` ~ `.ultraThinMaterial`, subtle white tint) that closes the menu
on click (spring). Above it, 5 FAB items on an arc; each is a VStack: Ø58/78
white(0.98) circle (shadow `rgba(0,0,0,0.10)`, radius 12/16, y 7/9) with a
`--color-home-brand` icon (size 22/30) + a `--color-home-brand` label (13/16px),
item frame 78×86 / 100×112. Items, offsets (phone / pad, px, y-up negative) and
stagger delays:

| item | icon | x (phone/pad) | y (phone/pad) | delay |
|---|---|---|---|---|
| Folder | `folder.fill` | -150 / -210 | -74 / -92 | 0.04 |
| Set | `square.stack.3d.up.fill` | -86 / -120 | -144 / -182 | 0.10 |
| Text | `doc.text.fill` | 0 | -174 / -220 | 0.16 |
| Audio | `waveform` | 86 / 120 | -144 / -182 | 0.22 |
| Essay | `pencil.and.scribble` | 150 / 210 | -74 / -92 | 0.28 |

Animate with **Motion**: each item springs from `{scale:0.2, opacity:0,
x:0, y:0}` (collapsed onto the center button) to `{scale:1, opacity:1, x, y}`
with `type:'spring', stiffness:90, damping:18, mass:1, delay` (matches the iOS
`interpolatingSpring`). The menu container sits above the bar (`z-index`),
bottom padding 48/58, frame height 235/300. **Actions are stubs in Phase 2**:
tapping an item closes the menu (Folder/Set get wired in Phase 3, the rest
later); optionally show a transient "coming soon" info — recommend just closing
for now to stay clean.

### 7. Stat card → `src/components/home/StatCard.tsx`
Fixed height 122, radius 20, 1px white(0.95) stroke, shadow `0 6px 10px
rgba(0,0,0,0.08)`. `isSmall = card width < 120px` — the three-across row on a
phone is ~77px each ⇒ small; use a **CSS container query** (`@container
(min-width:120px)`) so the card picks small/large sizes declaratively (add
`@container` on the card wrapper). Contents (bottom-trailing decorative layer +
top-leading text):
- `StatBlobShape` (new SVG, path from Swift, normalized) filled `blob` @0.78,
  size 64×54 (small)/78×66, offset x 20/24, y 13/16.
- Three `sparkle` glyphs (`<Icon name="sparkle">`) at accent @0.42/0.28/0.34,
  sizes {8/10, 6/8, 5/7}, offsets per the `statSparkleOffset` table.
- VStack (spacing 5/7, top pad 10/12, leading 11/14, bottom 12/14, trailing 8):
  Ø34/40 accent(0.9) circle + white icon (`item.iconSystemName`, size 14/16);
  title (semibold, `titleColor`, 10/12px); value (bold, `valueColor`, 22/26px);
  subtitle (semibold, `subtitleColor`, 10/11px).
- 3 static cards (from `HomeViewModel`): **Learned today** 24 "words"
  `chart.bar.fill` (stat1 palette); **Accuracy** 87% "Great job!" `target`
  (stat2 palette, value = `--color-primary-blue-dark`); **Streak** 5 "days"
  `flame.fill` (stat3 palette, value = title color).

### 8. Progress card → `src/components/home/ProgressCard.tsx`
Two layouts via a `layout: 'goal' | 'action'` prop. Radius 22/30, 1px
white(0.95) stroke, shadow `0 6px 10px rgba(0,0,0,0.035)`, `ProgressBlobShape`
(new SVG, path from Swift) top-trailing filled `blobColor` @0.9.
- **goal** (height 170/230): left VStack — title row (semibold `titleColor`
  15/21px + a `sparkles` glyph `--color-home-goal-sparkle` 9/12px); value line
  (`currentValue` bold `valueColor` 38/56px + `/ total unit` medium
  `subtitleColor` 15/25px); progress section (bar + subtitle `tint`), width
  116/190. Right: Ø78/98 `iconBackground`(0.96) circle + `iconSystemName` (tint,
  size 29/34) in a 136×136 / 180×180 container, trailing pad 8/18.
- **action** (height 130/190): HStack — Ø52/74 `iconBackground` circle + white
  icon (bold 20/28); VStack title (bold `titleColor` 25/34) + subtitle (medium
  `tint` 17/20) + progress bar + `"cur / total unit"` (medium `subtitleColor`
  15/18); trailing rounded-14/18 `tint` button Ø46/62 with a white
  `actionSystemName` (`arrow.right`, 18/24).
- **Progress bar**: full-width `progressBackgroundColor` capsule with a `tint`
  fill at `progress` fraction, height 7/10.
- Today-goal uses layout `goal`, `book.closed` icon, progress 0.80, 24/30
  "words", "6 words left", palette: tint `--color-primary-blue`, bg
  `--color-goal-bg`, progressBg `--color-goal-progress-bg`, title/value
  `--color-primary-blue-dark`, subtitle `--color-text-secondary`, iconBg white,
  blob `--color-home-goal-blob`.

### 9. Set item + list → `src/components/home/SetItem.tsx`, `SetsList.tsx`
- **SetItem** (height 86/104, radius 22/30, 1px white(0.95) stroke, shadow `0
  6px 10px rgba(0,0,0,0.04)`): `SetCardBlobShape` (new SVG, path from Swift)
  right side, `blobColor` @0.85, 92×62 / 130×86, offset (22,14)/(28,18). Content
  HStack (spacing 12/16, padding 14/18): Ø46/62 `accentColor`(0.95) circle +
  white icon (`iconSystemName`, 18/24); VStack title (bold `titleColor` 18/24) +
  subtitle (medium `accentColor` 13/16); trailing optional `trailingText`
  ("Review", `accentColor` 12/16) + `chevron.right` (`accentColor` 11/15).
- **SetsList** = `SetsListHeader` (title bold `--color-primary-blue-dark` 21/34;
  right "View all"/"Create" action pill: `--color-primary-blue` 14/18 in a
  white(0.98) capsule h 40/52, h-pad 14/18, soft shadow — `showsEditButton`
  pencil/checkmark button is Phase-3, omit for now) + a vertical list of
  `SetItem` (spacing 10/14), each a button → `onSelect`. Empty state → a
  white(0.92) rounded-24 placeholder card "No sets yet" / "Create your first
  flashcard set using the Create button." (title 22/30, subtitle 15/18, height
  140/180). Skip the drag-reorder/edit `List` path (Phase 3, macCatalyst-only).

### 10. Home screen → `src/routes/home.tsx`
Ports `HomeView` shell + dashboard. `beforeLoad`: `await waitForAuthReady()`;
redirect `loggedOut → /auth`, `emailVerificationRequired → /verify-email` (only
`authenticated` stays). Layout (ZStack, bottom-aligned):
1. `HomeBackground` (absolute, behind).
2. Column: `HomeHeader` (title/subtitle from `homeStore` derived getters, top +
   h padding); then an `HStack` (`CategorySidebar` fixed sidebar-width + main
   content, top + h padding); bottom safe spacer.
3. **Main content** = a vertical scroll area that switches on `selectedTab`
   (default `home`) and `selectedCategory`:
   - home + no category → **dashboard**: today-goal `ProgressCard` (goal) → row
     of 3 `StatCard` → (if a continue-learning set exists) section title
     "Continue learning" + action `ProgressCard` → `SetsList` "Your sets" /
     "View all".
   - home + a category selected → placeholder card ("<Category> — coming soon").
   - folders/flashcards/create/profile tabs → placeholder cards (title from
     header logic; profile subtitle = current email). Real modules land later.
4. `CreateMenuOverlay` (conditional, above content) + `BottomNavigationBar`
   (top z). On `selectedTab === 'home'` or when the create menu toggles, clear
   the selected category (mirrors iOS `clearSelectedCategory`).

Header title/subtitle derive exactly from iOS `HomeViewModel.headerTitle` /
`headerSubtitle(currentEmail:)`: default (home, no category) → **"Flashcards" /
"Pick a set to practice"**; per-category and per-tab strings per the VM switch
(all via `t('home.*')`).

---

## Implementation steps

### Step A — Types + static data  `src/lib/homeTypes.ts`, data in the store
Port models as TS types: `HomeTab` (`'home'|'folders'|'create'|'flashcards'|
'profile'`), `HomeCategory` (`'speaking'|'listening'|'reading'|'writing'` with
`title`/`icon` helpers), `StatCardItem`, `HomeSetPreviewItem` (token-based color
fields as CSS-var strings). Provide the static `statCards` (3) and `todayGoal`,
plus a **stub** `userSets` (2–3 illustrative `HomeSetPreviewItem`s so SetItem is
exercised and Home matches the iOS demo look) and `continueLearningSet` (one of
them). Clearly comment these are replaced by Firestore in Phase 3
(`flashcardSetService` + `HomeSetPreviewMapper`).

### Step B — Nav/UI store  `src/stores/homeStore.ts` (Zustand)
Equivalent of `HomeViewModel`'s navigation half: state `selectedTab: HomeTab`
(default `'home'`), `selectedCategory: HomeCategory | null`, `isCreateMenuPresented`;
actions `setSelectedTab` (also closes create menu; clears category when tab
becomes `home`), `setSelectedCategory`, `clearSelectedCategory`, `toggleCreateMenu`,
`closeCreateMenu`. Add pure derived helpers `headerTitle(state)` /
`headerSubtitle(state, currentEmail)` (or a `useHomeHeader()` hook) ported from
the VM. Static data (Step A) can live here as module constants. Keep press/hover
state inside components, not the store.

### Step C — Icon map additions  `src/lib/icons.ts`
Add SF→Phosphor entries used by Home: `house.fill`→House, `person`→User (add if
missing), `person.fill`→User, `person.crop.circle.fill`→UserCircle,
`sparkle`→Sparkle (singular; `sparkles` already maps), `checkmark`→Check,
`pencil`→Pencil. Import the new Phosphor components. (`.fill` suffix already
auto-selects `weight="fill"`.)

### Step D — Blob SVG shapes  `src/components/home/blobs.tsx`
Three small SVG components porting the exact Swift `path(in:)` control points,
normalized to a `viewBox` and scaled with `preserveAspectRatio="none"`:
`StatBlobShape`, `ProgressBlobShape`, `SetCardBlobShape` (each takes `color`,
`className`). Precedent: the Phase-1 `BlobBackground` path technique.

### Step E — Components (specs 2–9)
Create under `src/components/home/`: `HomeBackground`, `HomeHeader`,
`HomeIconGradientDefs` (avatar/sidebar gradients), `CategorySidebar`,
`BottomNavigationBar`, `CreateMenuOverlay`, `StatCard`, `ProgressCard`,
`SetItem`, `SetsList` (+ inline `SetsListHeader`). Reuse `BlobBackground`,
`Icon`. Use Motion (`motion/react`) for the create-menu radial stagger and the
plus-icon 45° rotation; CSS transitions for press/scale.

### Step F — Route + auth-gate  `src/routes/home.tsx` (new), gate updates
New `/home` route (spec 10). Repoint the gate: `src/routes/index.tsx`
(`authenticated → /home`), `src/routes/auth.tsx` (beforeLoad + post-login effect
`→ /home`), `src/routes/verify-email.tsx` (`authenticated → /home`). **Delete
`src/routes/phase0.tsx`**; the router plugin regenerates `routeTree.gen.ts` on
dev/build.

### Step G — i18n keys  `src/locales/en/common.json` (+ uk/pl/de scaffolds)
Add a `home.*` namespace: header titles/subtitles per tab & category
(`home.title.flashcards`, `home.subtitle.pickSet`, `home.title.speaking`, …),
stat labels (`Learned today`/`words`, `Accuracy`/`Great job!`, `Streak`/`days`),
`home.todayGoal.*`, section titles (`Continue learning`, `Your sets`,
`View all`), create-menu labels (`Folder/Set/Text/Audio/Essay`), placeholders
(`No sets yet` + body, `<Category> coming soon`). English copy in all four
locale files (uk/pl/de stay English scaffolds, matching Phase 1).

---

## Files summary

**Create:** `src/lib/homeTypes.ts`; `src/stores/homeStore.ts`;
`src/components/home/{HomeBackground,HomeHeader,HomeIconGradientDefs,
CategorySidebar,BottomNavigationBar,CreateMenuOverlay,StatCard,ProgressCard,
SetItem,SetsList,blobs}.tsx`; `src/routes/home.tsx`.
**Modify:** `src/styles/index.css` (Home color + layout tokens, `@theme`);
`src/styles/tokens.css` (≥700 pad overrides for the Home layout tokens);
`src/lib/icons.ts` (new SF names); `src/routes/{index,auth,verify-email}.tsx`
(gate → `/home`); all four `src/locales/*/common.json`; `e2e/smoke.spec.ts`
(replace the `/phase0` assertions).
**Delete:** `src/routes/phase0.tsx`.
**Regenerated:** `src/routeTree.gen.ts` (by the router plugin).

---

## Tests

- **Unit (Vitest)** `src/stores/homeStore.test.ts`: default state (`home`, no
  category, menu closed); `setSelectedTab` closes the menu and, when switching
  to a non-home tab then back, category-clearing on `home`; `toggleCreateMenu`;
  `setSelectedCategory` + `clearSelectedCategory`; `headerTitle`/`headerSubtitle`
  for every tab/category combination (incl. profile → email).
- **Component (RTL)**: `HomeHeader` renders title/subtitle; `StatCard` renders
  value/title/subtitle + icon; `ProgressCard` goal vs action (value line vs
  action button); `SetItem` renders title/subtitle/trailing; `BottomNavigationBar`
  tab click calls the store and marks the active tab; `CategorySidebar` select
  calls the store; `SetsList` empty → "No sets yet".
- **E2e (Playwright)** `e2e/home.spec.ts`: logged-out visit to `/home` redirects
  to `/auth` (gate). Update `e2e/smoke.spec.ts` to drop `/phase0`. Authenticated
  Home UI is verified via the browser MCP with a throwaway login (below), not in
  CI — same approach Phase 1 used for real-auth flows.

## Verification (end-to-end)

1. `npm run dev`; drive with the browser MCP (`preview_*`). Because `/home` is
   auth-gated, sign in with a **real throwaway test account** on the shared
   Firebase project (create via the Phase-1 signup, verify email), then land on
   `/home`.
2. Visually diff against iOS: background blob + 2 dots; header title
   "Flashcards" / "Pick a set to practice" + avatar with red notification dot;
   left sidebar 4 categories (select Reading → header becomes "Reading" /
   subtitle changes, indicator + icon gradient animate); today-goal card
   (24/30, 80% bar, book icon); 3 stat cards (purple/green/orange with blobs +
   sparkles); "Your sets" list (stub sets render, or "No sets yet" if stubs
   disabled); bottom nav 5 tabs (active dot + circle), center blue create button.
3. Tap the center create button → backdrop blurs, plus rotates 45°, 5 FABs
   spring out on the arc with stagger; tap backdrop → they collapse back. Tap a
   regular tab → active state moves, category clears.
4. `preview_inspect` a few elements to confirm exact sizes/colors (avatar Ø,
   nav height, stat card height 122, brand blue `#2b5cfa`). Check console = 0
   errors. `preview_resize` mobile vs desktop (≥700 pad values kick in).
5. Gates green: `npm run typecheck`, `npm run test:run`, `npm run lint`,
   `npm run build`. Delete the throwaway account afterward (optional).
6. **Ask the user before any git commit** (they are non-technical) — explain in
   plain words what changed.

## Out of scope for Phase 2 (later phases)
Real Firestore sets/folders + `flashcardSetService`/`HomeSetPreviewMapper`
(Phase 3); the Create Set / Create Folder / Set Detail flows and wiring the
create-menu actions (Phase 3); the Writing/Reading/Listening/Speaking category
modules (Phases 4–7); sets edit/drag-reorder `List` path; real stats/streak
backend (stays static). The non-home tabs and selected categories show
placeholder cards until their phases land.
