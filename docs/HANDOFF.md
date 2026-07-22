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
(`src/lib/icons.ts`), i18next (**en + uk fully translated**; pl/de = English scaffold, structurally
in sync via `scripts/sync-locales.cjs`), Vitest +
Playwright. AI backend = Cloudflare Worker `VITE_AI_WORKER_URL`
(`https://wordaround-gemini-proxy.vikusyusichka-ai.workers.dev`, CORS `*`,
`POST /` `{prompt,task,responseMimeType?}` → `{text}`), no worker changes needed.

## Done so far (commits on `main`, newest first)
- Firebase security rules in version control + review — `90be85f`
- PWA (installable + offline shell) — `077e1c5`
- Ukrainian translation + language switcher — `55dc361`
- Real daily practice stats — `6cb570f`
- 7E — Speaking shadowing + pronunciation — `ad7762e`
- 7D — Speaking debate — `98db9ba`
- 7C — Speaking describe picture — `c5265e2`
- 7B — Speaking free speaking — `1688b98`
- 7A — Speaking landing + AI conversation — `b587ce2`
- 6A–6D — Listening module (landing/from-text, import audio, import video, saved+resume) — `405232e` `e7d6cce` `45359e1` `ad76fcc`
- 5A–5F — Reading module — `d90235b`
- 4D1 — GrammarNotes: topics + notes CRUD + block editor — `957b5c5`
- 4B — WriteWords difficulty system (medium/hard, timer, lose, settings) — `917b444`
- 4C3 — Essays helper toolbar (translate/synonym) — `c65dfb6`
- 4C2 — Essays AI hints + grammar check + local scoring — `6faa45e`
- Deploy config (SPA fallback + DEPLOY.md) — `ec5c60e`
- 4C1 — aiClient + Essays topic gen + editor — `0d74afa`
- 4A — Writing landing + WriteWords easy mode — `297357d`
- Phases 0–3 (scaffold, auth, shell+home, folders, sets, study) — earlier commits.

**`main` is in sync with `origin/main`** (everything through the PWA work is
pushed; each push triggers a fresh Cloudflare build).

History was rewritten once to drop `Co-Authored-By: Claude` trailers, then
force-pushed. **Never add that trailer** (memory `commit-attribution`).
Commit messages end at the last body paragraph — no trailer.

**Gates (must be green before every commit):**
`npm run typecheck` · `npm run test:run` (currently **611** passing) · `npm run lint`
(`--max-warnings 0`) · `npm run build` · `npm run e2e` (**38** passing).

## The Writing module is 100% COMPLETE (2026-07-17)
`/practice/writing` landing → 3 cards, all enabled:
- **Write from sets** (WriteWords game) — easy/medium/hard + timer + lose/win
  result + settings sheet + training-mode toggle. DONE.
- **Essays** — AI topic gen, editor, AI hints, LanguageTool grammar check,
  local 6-category scoring, translate/synonym helper toolbar, save grammar
  issues to Grammar Notes. DONE.
- **Grammar notes** — topics + notes CRUD + block editor (4D1), quizzes
  smart-local + AI (4D2), spaced review (4D3), templates library (4D4),
  quick-mistake + Common Mistakes topic (4D5). DONE.

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
  `src/locales/{en,uk,pl,de}/common.json`, then run
  `node scripts/sync-locales.cjs` so no locale silently loses a key. English and
  Ukrainian are real translations; pl/de still mirror English.

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
- **4D3 — Spaced review sessions. DONE (built + gates + live-verified
  2026-07-17).** Files: models.ts (GrammarReviewItem + enums),
  `src/lib/grammarReview{,Queue,Session,Service}.ts` +
  `grammarRecommendations.ts` (localStorage), `src/hooks/useGrammarReview.ts`,
  route `practice.writing.grammar.review.tsx`, components
  `{ReviewTodayCard,ReviewSessionScreen,ReviewSummaryView}.tsx`; editor
  records opened/edited recommendations; quiz <70% auto-queues review.
  Deferred: "Mistakes to Fix" / "Weak Quiz Areas" highlight rows.
- **4D4 — Templates library. DONE (built + gates + live-verified 2026-07-17).**
  Files: `src/lib/grammarTemplates.ts` (7 note + 5 topic templates, iOS block
  types mapped to the web 8), APPLY_TEMPLATE in `grammarNoteEditor.ts`,
  `useCreateTopicFromTemplate` in `useGrammarTopics.ts`,
  `src/components/grammar/TemplateLibraryModal.tsx`; entries in the
  create-topic modal + editor "Template" button.
- **4D5 — Quick-mistake + Essays "Save to Grammar Notes". DONE (built +
  gates + live-verified 2026-07-17).** Files: `src/lib/grammarMistakeService.ts`,
  `ensureMistakesTopic`/`MISTAKES_TOPIC_ID` in grammarTopicService,
  `fetchNoteBySavedIssueKey` + `savedIssueKey` in grammarNoteService/models,
  `src/hooks/useSaveMistake.ts`, save button on GrammarIssueCard (threaded
  through EssayFeedbackSection/EssaysScreen), QuickMistakeSheet + header
  button on the grammar home. Saved mistakes auto-queue spaced review (+1h).
  **Writing module is now 100% complete.**
- Also deferred in 4D1: pin/favorite/search/drag-reorder, cover images (needs
  Storage CORS), per-note language. Fields already exist where needed.

### Phase 5 — Reading `L` (IN PROGRESS — plan approved, 6 slices)
Slice plan: `C:\Users\vikusyusichka\.claude\plans\parallel-sparking-sun.md`.
- **5A — landing + data layer + My Texts library. DONE (built + gates +
  live-verified 2026-07-18).** Files: models.ts (ReadingLibraryItem),
  `src/lib/{readingTextAnalyzer,readingTypes,readingStorageService}.ts`,
  `src/hooks/useReadingItems.ts`, routes `practice.reading.index` /
  `my-texts.index` / `my-texts.new` / `my-texts.$itemId` (read-only until 5B),
  components `src/components/reading/*`.
- **5B — session engine. DONE (built + gates + live-verified 2026-07-18).**
  Files: `src/lib/{readingQuestionService,readingScoring,readingSession,
  readingHighlight}.ts`, `src/hooks/useReadingSession.ts`, session UI in
  `src/components/reading/*`, `my-texts.$itemId` = full session.
  5A+5B both uncommitted (user batching commits).
- **5C — import + AI generation. DONE (built + gates + live-verified
  2026-07-18).** Deps +tesseract.js +pdfjs-dist (lazy dynamic imports).
  Files: `src/lib/{readingImport,readingGenerationService}.ts`; Add Text has
  the 5-source selector (Paste/Photo OCR/PDF/Generate/Wikipedia Explore).
  5A+5B+5C uncommitted (user batching commits).
- **5D — Reading From Sets. DONE (built + gates + live-verified
  2026-07-18).** Files: `src/lib/readingFromSets.ts`, route
  `practice.reading.from-sets.index.tsx`; the 5B session route moved to
  SHARED `practice.reading.session.$itemId.tsx` (serves any modeID, vocab
  highlighting). 5A-5D uncommitted (user batching).
- **5E — Speed Reading. DONE (built + gates + live-verified 2026-07-18).**
  Files: `src/lib/speedReading.ts`, route `practice.reading.speed.index.tsx`.
  5A-5E uncommitted (user batching).
- **5F — Story Mode. DONE (built + gates + live-verified 2026-07-18).**
  Files: `src/lib/storyMode.ts`, routes `practice.reading.story.index.tsx` +
  `story.$itemId.tsx`.

**READING MODULE (Phase 5) IS 100% BUILT + LIVE-VERIFIED. All of 5A-5F is
UNCOMMITTED** — the user batched commits; when committing, one combined
Phase-5 commit is cleaner than a per-slice split (locales + my-texts.new.tsx
span multiple slices). Gates at completion: typecheck · 506 tests · lint 0 ·
build · 26 e2e. Next big phase: **Phase 6 Listening**.

### Phase 5 reference (original notes) — `Features/Reading`, ~130 files
Shared: `ReadingView` grid + mode/library/setup cards + progress summary.
Submodules: **MyTexts** (paste / OCR=`Tesseract.js` / PDF=`pdf.js`; AI question
gen via worker `POST /`; tappable-text session where each word→translate;
scoring), **SpeedReading** (countdown→timer→read→WPM), **StoryMode** (AI stories,
streaming), **ReadingFromSets**. Firestore `users/{uid}/readingItems` filtered by
`modeID`. Services to mirror: `MyTextsAIGenerationService`, `ReadingOCRService`,
`ReadingPDFImportService`, `ReadingScoringService`, `ReadingQuestionService`,
`ReadingSessionService`. Wire the `/practice/reading` route (currently
`PlaceholderPage` via `practice.$mode.tsx`).

### Phase 6 — Listening (IN PROGRESS — plan approved, 4 slices)
Slice plan: `C:\Users\vikusyusichka\.claude\plans\parallel-sparking-sun.md`.
- **6A — landing + local store + Listen from Text. DONE (built + gates +
  live-verified 2026-07-20), uncommitted.** Dep +idb-keyval. Files:
  `src/lib/listening{Types,Store,QuestionGenerator,Scoring}.ts`, speech.ts
  extension (speakListening), routes `practice.listening.index` /
  `from-text.index` / `from-text.session`, component
  `src/components/listening/ListeningResultView.tsx`. ALL listening data is
  device-local (IndexedDB) — iOS parity.
- **6B — Import Audio + transcription. DONE (built + gates + live-verified
  2026-07-20; real worker round-trip proven with a generated WAV — verify
  once manually with a real voice recording).** Files:
  `src/lib/listening{Transcribe,Import}.ts`, route
  `practice.listening.import-audio.index.tsx`, shared
  `ListeningQuestionList` component.
- **6C — Import Video + word translate + save to set. DONE (built + gates +
  live-verified 2026-07-20 incl. real Whisper + real MyMemory + real
  Firestore set creation).** Files: `src/lib/listeningSetSaving.ts`,
  `src/components/listening/ListeningWordSheet.tsx`, route
  `practice.listening.import-video.index.tsx`.
- **6D — Saved Practice + resume. DONE (built + gates + live-verified
  2026-07-20).** Route `practice.listening.saved.index.tsx` (continue card,
  session cards, inline review); import-audio route gained ?sid= resume
  (seeks to playbackPosition); from-text resumes via its existing ?sid=;
  import-video review-only.

**LISTENING MODULE (Phase 6) IS 100% BUILT + LIVE-VERIFIED.** Next big
phase: **Phase 7 Speaking** (hardest — realtime voice, Azure STT, streaming
worker endpoint) per the reference notes below.

### Phase 6 reference (original notes) — `Features/Listening`, 63 files
ListenFromText (Web Speech TTS / Azure, word-sync highlight), ImportAudio
(→ worker `POST /api/listening/transcribe` Whisper), ImportVideo (+`<video>`+VTT),
SavedPractice. Persistence **local** (IndexedDB, audio as Blob).

### Phase 7 — Speaking `L` (IN PROGRESS — plan approved, 5 slices)
Plan `parallel-sparking-sun.md`. Web deviation: STT = **Web Speech API**
(`webkitSpeechRecognition`, Chromium/Edge only) with a **first-class text-input
fallback** on every mode (also drives automated verify). TTS reuses
`speakListening`. No persistence (ephemeral); recent topic titles → localStorage.
- **7A DONE + LIVE-VERIFIED** — landing + speech infra + AI Conversation.
  `src/lib/speechRecognition.ts` (Web Speech wrapper), `speakingTypes.ts`,
  `speakingConversation.ts` (task `speaking_conversation`, plain text, hist 4),
  `speakingFeedback.ts` (task `speaking_feedback`/`debate_feedback` JSON + local
  fallback formulas), `speakingTopics.ts` (`POST /api/speaking/topic` + recent
  store). Hook `useSpeakingConversation.ts` (state machine: mic/text, timer,
  hint 9s, End→feedback). Components `SpeakingInputBar`, `ConversationResultView`.
  Routes `practice.speaking.index` / `.conversation.index` / `.conversation.session`.
  Live-verified vs real worker: reply + hint + feedback (overall 75, 4 metrics).
- **7B DONE + LIVE-VERIFIED** — Free Speaking (monologue). Pure
  `src/lib/speakingFreeSpeaking.ts` (appendTranscriptChunk: trim, drop empties,
  dedupe an immediate repeat; transcriptText/WordCount). Hook
  `useFreeSpeaking.ts` (auto-generates a topic on mount, collects chunks from
  mic OR text, countdown timer, End→`speaking_feedback`; no AI replies).
  Component `FreeSpeakingTopicCard`; routes `practice.speaking.free.index`
  (setup) + `.free.session`. Reuses `SpeakingInputBar` + `ConversationResultView`.
  Landing card enabled. Live-verified vs real worker: topic "Favorite Local
  Eats" → 2 transcript chunks → feedback 85 overall.
- **7C DONE + LIVE-VERIFIED** — Describe Picture. `src/lib/describePicture.ts`:
  `fetchRandomImage()` POST `/api/describe-picture/random-image` (20s timeout,
  429→`rate-limited`, non-2xx→`server-error`, missing id/imageURL→`no-image`,
  bad body→`invalid-response`, fetch reject→`network`; author defaults to
  "Unknown"/unsplash.com), plus `PICTURE_CONTEXT` (fixed monologue topic,
  iOS-verbatim promptContext) and `PICTURE_PROMPT_HINTS` (people/objects/
  actions/colors/emotions). Hook `useDescribePicture.ts` (loads an image,
  reuses the 7B transcript accumulator, "New photo" swaps image + resets
  transcript, timer, End→`speaking_feedback` with PICTURE_CONTEXT). Component
  `DescribePictureImageCard` (photo + **required Unsplash attribution link** +
  prompt chips + error/retry state). Routes `practice.speaking.picture.index` +
  `.picture.session`. Icons +5 (cube.box.fill→Cube, paintpalette.fill→Palette,
  text.bubble.fill→ChatTeardropText, photo.fill→ImageIcon,
  arrow.clockwise→ArrowClockwise). Landing card enabled. Live-verified: real
  Unsplash photo (1080×608) + credit, New photo swapped it, typed description →
  feedback 75 quoting the learner's own adjectives.
- **7D DONE + LIVE-VERIFIED** — Debate. `src/lib/speakingDebate.ts`: sides
  (agree/disagree/**surpriseMe** → `resolveConcreteSide(side, coin)`, AI always
  `oppositeSide`), round plans (short 3 / medium 4 / long 5, iOS kind
  sequences), pure session (`makeDebateSession` / `currentRound` /
  `advanceSession` → `{session, didAdvance}`; `didAdvance:false` on the last
  round ends the debate), iOS-verbatim `buildOpeningPrompt` / `buildReplyPrompt`
  (stance verbs support/oppose, round aiInstruction, history labelled
  Opponent/Learner, `speaking_conversation` task, history 4), fallbacks +
  5 local hints per language. Hook `useDebate.ts` (topic → AI opening + TTS →
  per-round reply → advance → auto-end → `debate_feedback`). Routes
  `practice.speaking.debate.index` (side picker) + `.debate.session` (round
  progress bar + learner prompt + chat + hint + input). Icons +3
  (hand.thumbsup.fill→ThumbsUp, hand.thumbsdown.fill→ThumbsDown,
  shuffle→Shuffle). Landing card enabled. Live-verified: 5-round debate
  played to the end → AI feedback overall 70 with **all 7 metrics** (incl.
  Argument Quality 60 / Persuasiveness 80 / Structure 80) + 5 correction cards;
  separately the timer expiry auto-end produced the 7-metric local fallback.
- **7E DONE + LIVE-VERIFIED (degraded)** — Shadowing + Pronunciation Trainer.
  **Worker reality check:** `/api/shadowing/phrases` ✅ and
  `/api/pronunciation/content` ✅ both work, but **`/api/speech/azure-token`
  returns 502 "Azure rejected the speech credentials"** → automatic pronunciation
  SCORING is unavailable. Shipped accordingly:
  `src/lib/azureSpeech.ts` (token fetch + 8-min cache; any non-2xx ⇒
  `not-configured`; `isPronunciationScoringAvailable()` never throws),
  `src/lib/audioRecorder.ts` (MediaRecorder wrapper — first supported mime of
  webm/opus→webm→mp4→ogg, blob URL for playback, permission/unsupported/failed
  codes), `src/lib/shadowing.ts` (phrases + localStorage recent store, cap 20 per
  language·level·category, last-30 avoidPhrases), `src/lib/pronunciationTrainer.ts`
  (items, focus promptValue, unknown type→`word`). Hooks `useVoiceRecorder`
  (shared), `useShadowing`, `usePronunciationTrainer`. Component
  `PracticeRecorderBar` (Listen / Record / Play mine). Routes
  `practice.speaking.shadowing.index` + `.pronunciation.index` (both do
  setup→session in one route via local state). Both landing cards enabled — the
  Speaking grid now has **zero "Coming soon"**.
  **The Speech SDK is deliberately NOT installed** — shipping
  `microsoft-cognitiveservices-speech-sdk` for an endpoint that 502s would be
  dead weight. To finish scoring later: fix the Worker's Azure credentials, then
  add the SDK and implement `assessPronunciation()` on top of `fetchAzureToken()`
  (the availability probe and the degraded UI are already in place).

**7D verify note:** navigating session→session with only different search params
does NOT remount the route component (TanStack reuses it), so a finished session
stays finished — navigate away and back to force a fresh one. Also the debate
hint auto-hides after 6s (iOS parity), which is shorter than a browser-tool
round-trip: click and assert in the SAME evaluation or it looks like a bug.

**7B gotcha (bites any "fetch once on mount" effect):** guarding a mount effect
with a `seededRef` AND cancelling in its cleanup silently drops the result under
React StrictMode — the double-invoke is mount→cleanup→mount, so the cleanup sets
`cancelled=true` for the only in-flight request while the second run early-returns
on the ref. Symptom: a permanent "Generating…" state in dev. Use the ref guard
alone (a late setState on an unmounted component is a harmless no-op in React 18+).

**Verify note:** auth-gate is bypassed for preview by injecting session state:
`import('/src/stores/sessionStore.ts').then(m=>m.useSessionStore.setState({state:{kind:'authenticated',…}}))`
then client-nav via `window.__TSR_ROUTER__.navigate({to:…})` (full page reload
resets auth). Screenshot tool may hang while TTS speaks — page-text is enough.

### Phase 8 — Polish `M` (IN PROGRESS)
**DONE:**
- **Real daily practice stats** (`6cb570f`) — `src/lib/dailyPracticeStats.ts`
  replaces the static Today-progress stubs. localStorage log, one entry per
  practice bout, stamped with the local day so totals reset at midnight; 90-day
  retention. Units per iOS: speaking/listening/reading = SECONDS, writing =
  WORDS; `totalTodayDisplay` floors seconds to whole minutes. Recorded by the 4
  timed Speaking modes (total − remaining, guarded by an `endedRef` so End +
  timer-expiry can't double-count), the Reading session (readingTimeSeconds) and
  Essays (word count on check). Listening keeps its own existing real store.
  Cards read via `useDailyProgress` (re-reads on window focus).
- **Full Ukrainian translation + language switcher** (`55dc361`) — all 978
  translatable strings (brand name and "PDF" stay as-is). `LanguageSwitcher` in
  Profile: until now the language came from the browser with NO way to change
  it, so translations were unreachable. Also added `scripts/sync-locales.cjs` —
  non-English locales had silently lost keys; run it after adding en keys.

- **PWA** (`077e1c5`) — `public/manifest.webmanifest`, generated icons
  (`scripts/generate-icons.cjs`: 192/512/maskable-512/apple-touch, hand-rolled
  PNG encoder, no image dep), hand-rolled `public/sw.js` (no Workbox), registered
  from `src/lib/registerServiceWorker.ts` (PRODUCTION ONLY — a SW over Vite's
  dev modules causes stale-module bugs). Caching: navigations network-first →
  cached shell → `/offline.html`; `/assets/*` cache-first (content-hashed);
  other same-origin static stale-while-revalidate; cross-origin never touched.
  `_headers` serves sw.js + manifest `must-revalidate`. **Test it with
  `npm run preview` (launch config `web-prod`, port 4173) — not `npm run dev`.**
  **Two real bugs found and fixed during verification:** (1) `cache.match(req)`
  silently missed because responses carry a `Vary` header → every offline
  fallback failed; all lookups now pass `{ignoreVary: true}`. (2)
  stale-while-revalidate only searched the asset cache, so precached
  shell items (favicon/manifest) missed → now searches all caches.
  Verified with the server STOPPED: the full app boots from cache.

- **Firebase security rules** (`90be85f`, corrected in `8d1a7b7`) —
  `firestore.rules` is now a VERBATIM COPY of what is live on the project.
  **The live rules turned out to be correct and complete — no change was made
  and none is needed.** Audited against every Firestore path in both codebases:
  all owner-scoped, all covered (nested grammar notes/quizzes ride the
  `grammarNoteTopics/{topicId}/{document=**}` rule). The Cloud Function never
  touches Firestore. The real gap was that the rules lived only in the Console
  with no history/undo — that is now fixed.
  ⚠️ An earlier proposal to collapse everything into one
  `users/{uid}/{document=**}` was REVERTED: it would have denied the
  `users/{uid}` profile doc that the live rules allow — regression risk on a
  shipped iOS app for zero security gain.
  ⚠️ **Storage rules are still UNREVIEWED** — `storage.rules` is a proposal, not
  a copy of live. Capture and reconcile before publishing.
  Not executed (emulator needs Java 11+, box has Java 8); the Console's Rules
  Playground is the practical check. See `docs/SECURITY-RULES.md`.

**REMAINING:** offline flashcards via IndexedDB, container-query pad layout ≥700px, virtualized long lists
(`@tanstack/react-virtual`), perf, Firestore security-rules review before public
launch. Polish/German are still English scaffolds (structure is in sync).

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
