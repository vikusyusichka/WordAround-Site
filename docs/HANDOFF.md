# WordAround Web — Handoff (context + forward plan)

> Read this first in a new chat, together with `docs/PORTING-REFERENCE.md`,
> `MIGRATION.md`, `README.md`, and the project memory files
> (`project-state`, `web-adaptation-principle`, `user-profile`,
> `porting-reference`, `commit-attribution`). This file is the practical
> "where are we / what next / which files" map.

## What this is
Web SPA port of the iOS app **WordAround** (SwiftUI, `github.com/vikusyusichka/WordAround`,
branch `develop`). Shares the **same Firebase project** (`wordaround-97f86`) and the
same Cloudflare AI Worker as iOS, so users/data are common.
Working dir: `H:\Projects\WordAround-Site` (git, branch `main`).

Fetch iOS source for reference:
```
curl -sL https://api.github.com/repos/vikusyusichka/WordAround/tarball/develop -o wa.tar.gz && tar -xzf wa.tar.gz
# extracts to vikusyusichka-WordAround-<sha>/WordAround/Features/<Module>/...
```

## THE guiding rule (not 1:1 with iOS)
**Web-first adaptation.** Take iOS **design DNA** (palette from AppColors.swift,
blobs, rounded cards, soft shadows, gradient icons, Manrope, Motion micro-anims)
and **features + data model**. Make **navigation / layout / interaction**
web-native (real URLs + back/forward + deep links, left sidebar on desktop /
drawer on mobile, capped width, hover/keyboard/focus, standard modals/popovers
instead of touch-only sheets). See memory `web-adaptation-principle`.

## Stack
Vite + React 19 + TS, Tailwind v4 (tokens in `src/styles/index.css` `@theme` +
`tokens.css` ≥700px), TanStack Router (file-based, `src/routes/`), TanStack Query
(reads=useQuery, mutations=invalidate), Zustand (UI state only), Firebase Web SDK
v11 (Auth+Firestore+Storage), react-hook-form+zod, Phosphor icons via `<Icon>`
(`src/lib/icons.ts`), i18next (en real; uk/pl/de = English scaffold), Vitest +
Playwright. AI backend = Cloudflare Worker `VITE_AI_WORKER_URL`
(`https://wordaround-gemini-proxy.vikusyusichka-ai.workers.dev`, CORS `*`,
`POST /` `{prompt,task,responseMimeType?}` → `{text}`), no worker changes needed.

## Done so far (commits on `main`, newest first)
- 4D1 — GrammarNotes: topics + notes CRUD + block editor — `957b5c5`
- 4B — WriteWords difficulty system (medium/hard, timer, lose, settings) — `917b444`
- 4C3 — Essays helper toolbar (translate/synonym) — `c65dfb6`
- 4C2 — Essays AI hints + grammar check + local scoring — `6faa45e`
- Deploy config (SPA fallback + DEPLOY.md) — `ec5c60e`
- 4C1 — aiClient + Essays topic gen + editor — `0d74afa`
- 4A — Writing landing + WriteWords easy mode — `297357d`
- Phases 0–3 (scaffold, auth, shell+home, folders, sets, study) — earlier commits.

**`main` is ~4 commits ahead of `origin/main`** (4C2 + 4C3 + 4B + 4D1 unpushed).
Push when convenient — a push also triggers a fresh Cloudflare build.

History was rewritten once to drop `Co-Authored-By: Claude` trailers, then
force-pushed. **Never add that trailer** (memory `commit-attribution`).
Commit messages end at the last body paragraph — no trailer.

**Gates (must be green before every commit):**
`npm run typecheck` · `npm run test:run` (currently ~349 passing) · `npm run lint`
(`--max-warnings 0`) · `npm run build` · `npm run e2e` (18 passing).

## The Writing module is now COMPLETE except quiz/review/templates
`/practice/writing` landing → 3 cards, all enabled:
- **Write from sets** (WriteWords game) — easy/medium/hard + timer + lose/win
  result + settings sheet + training-mode toggle. DONE.
- **Essays** — AI topic gen, editor, AI hints, LanguageTool grammar check,
  local 6-category scoring, translate/synonym helper toolbar. DONE.
- **Grammar notes** — topics + notes CRUD + rich block editor. **4D1 DONE**;
  quiz/review/templates deferred (see below).

## Key patterns to reuse (don't reinvent)
- **Pure reducer + hook + thin components + Vitest reducer tests.** Every
  feature's logic lives in `src/lib/*Session.ts` (or `*Editor.ts`) as a pure
  reducer; timing/network side-effects live in the `src/hooks/use*.ts` wrapper
  (AbortController in a ref, cancel on unmount). Examples: `studySession`,
  `writingSession`, `essaySession`, `grammarNoteEditor`.
- **Firestore services** in `src/lib/*Service.ts` using helpers from
  `src/lib/firestore.ts` (Timestamp↔millis at the boundary; collection refs).
  Path convention: `users/{uid}/<collection>`. Examples: `folderService`,
  `setService`, `grammarTopicService`, `grammarNoteService`.
- **TanStack Query hooks** in `src/hooks/use*.ts` mirroring `useFolders`:
  `useXQuery()` (reads), `useCreateX/useUpdateX/useDeleteX` (mutations →
  `invalidateQueries`). `useUid()` (from `useFolders.ts`) gives the current uid.
- **AI:** `src/lib/aiClient.ts` (`generateText`/`generateJSON<T>`, 45s timeout,
  typed `AIClientError`) + `src/lib/aiTextCleaner.ts` (strip ```json fences,
  extract first balanced JSON). Per-feature prompt builders + services compose
  these. Worker `task` string selects the provider chain.
- **Routing:** all signed-in pages under pathless `src/routes/_authed.tsx`
  (auth-gate + `<AppShell>`). **Flat-route index trap:** a route file that has
  nested routes below it MUST be named `X.index.tsx` (not `X.tsx`), else it
  becomes a layout-without-`<Outlet/>`. Nav copy per route in
  `src/lib/navigation.ts` `pageCopyForPath`.
- **Reusable UI:** `src/components/create/{ColorPicker,IconPicker,...}`,
  `src/components/home/{ProgressCard,StatCard,blobs}`, modal pattern from
  `src/components/study/CardEditDialog.tsx` (AnimatePresence + backdrop-blur +
  Esc/click-outside). Icons: extend the SF→Phosphor map in `src/lib/icons.ts`
  (`.fill` suffix auto-selects `weight="fill"`).
- **i18n:** every user string via `t('ns.key')`; add keys to ALL 4
  `src/locales/{en,uk,pl,de}/common.json` (en real, others copy the English).

## Live-verify recipe (authed + Firestore/AI features)
The gates can't exercise authed Firestore/AI. Verify in a **fresh browser tab**
via the preview MCP:
1. `preview_start {name:'wordaround-site-dev'}`, open a fresh tab, navigate to `/`.
2. In the page: `import('/src/lib/authService.ts')` → `signUp(email,'test-1234')`
   (bare `firebase/auth` won't resolve in eval — import the service). Wait ~1.5s
   for `onAuthStateChanged`.
3. Override the store with the REAL user:
   `useSessionStore.setState({state:{kind:'authenticated',user:auth.currentUser,email},currentEmail:email})`.
4. Client-nav: `history.pushState({},'', path); dispatchEvent(new PopStateEvent('popstate'))`.
5. React controlled inputs in eval: use the value-setter descriptor +
   `dispatchEvent(new Event('input',{bubbles:true}))`.
6. To prove Firestore persistence, call the service directly
   (`import('/src/lib/grammarNoteService.ts').fetchNotes(uid, topicId)`).
7. **Cleanup:** delete created docs, then re-`signIn` (recent-login) and
   `auth.currentUser.delete()`. ⚠️ If the preview closes mid-flow the throwaway
   account/docs linger on shared Firebase — harmless but delete them next time.
   (There is currently one orphaned test account `wa-4d-1783984045092@example.com`
   + its grammar topic to clean up.)

## Grammar-notes 4D1 file map (just landed)
- Models: `src/lib/models.ts` (GrammarNoteType/BlockType/Block/Topic/Note).
- Services: `src/lib/grammarTopicService.ts` (`users/{uid}/grammarNoteTopics/{id}`),
  `src/lib/grammarNoteService.ts` (subcollection `.../{topicId}/notes/{noteId}`).
  Firestore helpers added to `src/lib/firestore.ts`.
- Editor reducer: `src/lib/grammarNoteEditor.ts` (title/noteType/blocks; ADD/
  UPDATE/DELETE/MOVE_BLOCK, list-item ops; `makeBlock`, `derivePreviewText`,
  `toNote`).
- Meta (icons/colors per type): `src/lib/grammarMeta.ts`.
- Hooks: `src/hooks/useGrammarTopics.ts`, `src/hooks/useGrammarNotes.ts`
  (notesCount bump on note create/delete via `setNotesCount`).
- Routes: `src/routes/_authed/practice.writing.grammar.index.tsx` (topics home +
  create modal), `.grammar.$topicId.index.tsx` (notes list),
  `.grammar.$topicId.$noteId.tsx` (editor; `$noteId==='new'` = blank).
- Components: `src/components/grammar/{GrammarTopicCard,GrammarTopicForm,
  GrammarNoteRow,GrammarNoteTypePicker,GrammarBlockEditor,AddBlockMenu,
  GrammarNotesEmptyState}.tsx` + `grammar.test.tsx`.
- Wiring: `writingTypes.ts` (grammarNotes `enabled:true`),
  `practice.writing.index.tsx` (menu → navigate), `navigation.ts` (+test),
  `icons.ts` (+block/note SF symbols), i18n `writing.grammar.*` in 4 locales.
- Block types shipped (subset of iOS 15): heading, paragraph, bulletList, rule,
  example, warning, quote, divider. Note types (6): standard/mistake/rule/
  comparison/cheatSheet/exercise.

## FORWARD PLAN (pick a slice → plan mode → build → gates → live → commit)

### Deploy — DONE (2026-07-17)
Pushed ec5c60e..971ab6a → Cloudflare Pages auto-built → Success; live at
`wordaround-site.pages.dev`. Still pending user action (not code):
**Storage CORS** on bucket `wordaround-97f86.firebasestorage.app` (for
flashcard + note images) via `gsutil cors set` — blocks image uploads only.

### Phase 4 leftovers (GrammarNotes tail) — iOS in `Features/Writing/GrammarNotes`
Approved slice plan for 4D2–4D5:
`C:\Users\vikusyusichka\.claude\plans\parallel-sparking-sun.md`.
- **4D2 — AI quiz. DONE (built + gates + live-verified 2026-07-17).** Files:
  models.ts (quiz types + `hasQuiz?`), `src/lib/grammarQuiz{Generator,Prompts,
  Validator,Session,Service}.ts`, `src/hooks/useGrammarQuizzes.ts`, route
  rename `$noteId.tsx`→`$noteId.index.tsx` + new `$noteId.quiz.tsx`,
  `src/components/grammar/{CreateQuizSheet,QuizCard,QuizQuestionView,
  QuizResultView}.tsx`. Manual-authoring mode deferred.
- **4D3 — Spaced review sessions.** iOS: `Notes/Editor/Services/GrammarReview*`,
  `ViewModels/GrammarReview*`, `Views/GrammarReview*`, `Models/GrammarReview*`.
  Web: a review-queue builder (pure) + session reducer + review route.
- **4D4 — Templates library.** iOS: `Notes/Editor/Services/GrammarTemplate*`,
  `Views/GrammarTemplate*`, `Models/GrammarNoteTemplate.swift`,
  `Topics/Models/GrammarTopicTemplate.swift`. Web: a template provider (static
  data) + "start from template" in the create flow.
- **4D5 — Quick-mistake + Essays "Save issue to Grammar Notes".** iOS:
  `Domain/SaveQuickGrammarMistakeUseCase.swift`, `Views/{QuickGrammarMistakeSheet,
  QuickGrammarNoteSheet,SaveGrammarMistakeConfirmationSheet}.swift`, and the
  auto-provisioned "Common Mistakes" topic (`GrammarNoteTopic.commonMistakes`).
  Web: wire the currently-dangling "save to notes" affordance from the Essays
  grammar-issue cards (`src/components/writing/GrammarIssueCard.tsx`) into a note.
- Also deferred in 4D1: pin/favorite/search/drag-reorder, cover images (needs
  Storage CORS), per-note language. Fields already exist where needed.

### Phase 5 — Reading `L` (largest module, `Features/Reading`, ~130 files)
Shared: `ReadingView` grid + mode/library/setup cards + progress summary.
Submodules: **MyTexts** (paste / OCR=`Tesseract.js` / PDF=`pdf.js`; AI question
gen via worker `POST /`; tappable-text session where each word→translate;
scoring), **SpeedReading** (countdown→timer→read→WPM), **StoryMode** (AI stories,
streaming), **ReadingFromSets**. Firestore `users/{uid}/readingItems` filtered by
`modeID`. Services to mirror: `MyTextsAIGenerationService`, `ReadingOCRService`,
`ReadingPDFImportService`, `ReadingScoringService`, `ReadingQuestionService`,
`ReadingSessionService`. Wire the `/practice/reading` route (currently
`PlaceholderPage` via `practice.$mode.tsx`).

### Phase 6 — Listening `M` (`Features/Listening`, 63 files)
ListenFromText (Web Speech TTS / Azure, word-sync highlight), ImportAudio
(→ worker `POST /api/listening/transcribe` Whisper), ImportVideo (+`<video>`+VTT),
SavedPractice. Persistence **local** (IndexedDB, audio as Blob).

### Phase 7 — Speaking `L` (`Features/Speaking`, 113 files, hardest)
AIConversation (streaming replies — add worker `POST /api/stream` SSE),
Debate, DescribePicture (`/api/describe-picture/random-image`), FreeSpeaking.
Voice: Azure Speech SDK via `/api/speech/azure-token`; TTS Web Speech.

### Phase 8 — Polish `M`
PWA (manifest + service worker, offline flashcards via IndexedDB), container-query
pad layout ≥700px, virtualized long lists (`@tanstack/react-virtual`), perf,
Firestore security-rules review before public launch.

## Working process (follow strictly)
1. Big phase → **plan mode** → detailed slice plan → user approval → build.
   Split big phases into **vertical slices** (plan→build→verify→commit each).
2. Gates green before every commit (list above).
3. Live-verify authed features in the browser (recipe above).
4. Commit only when the user says; one commit per slice; **no `Co-Authored-By`
   trailer**. Don't push without being asked. User is **non-technical** —
   explain simply, guide console/web-panel steps click-by-click, ask for
   screenshots.
5. Update memory `project-state` after each slice; update this handoff when the
   forward plan shifts.
