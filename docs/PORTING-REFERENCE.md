# WordAround Web — Porting reference for ALL phases

> Standalone reference so any chat can produce a detailed per-phase plan (like
> `docs/PHASE1-AUTH-PLAN.md`) for any later phase. Complements `MIGRATION.md`
> (high-level roadmap) with the concrete data model, AI backend catalogue, and
> the SwiftUI→web translation conventions discovered from the iOS source.
> Phase 0 (scaffold) and Phase 1 (auth) are done; use this to plan Phase 2+.

## ⚠️ Guiding principle (updated 2026-07-11): web-first adaptation

WordAround Web is a **web-first adaptation, NOT a 1:1 iOS clone.** This
supersedes any earlier "pixel-accurate 1:1" language in this doc and the phase
plans.

- **Take from iOS:** the **design language** (palette, BlobShape decorations,
  rounded cards, soft shadows, gradient icons, Manrope, Motion micro-animations)
  and the **features + data model**.
- **Do NOT copy 1:1:** **navigation, layout, and interaction patterns** — these
  follow **web standards** and may differ from iOS (real routes/URLs with
  back-forward + deep links, desktop left sidebar instead of a mobile bottom tab
  bar, capped/centered multi-column layouts, hover + keyboard + focus states,
  standard menus/modals/popovers). Even mobile web is web-native, not the iOS
  chrome.

### Web app shell (built in the "Web shell" phase — the frame every screen uses)
- **Routing:** all signed-in pages live under a pathless layout route
  `src/routes/_authed.tsx` that runs the auth-gate once and renders `AppShell`.
  Pages are real routes: `/home`, `/practice/$mode`, `/folders`, `/sets`,
  `/profile`. Add new feature screens as children of `_authed/`.
- **Shell:** `src/components/shell/*` — `AppShell` (≥lg left `Sidebar`; <lg
  `MobileNav` top bar + drawer), `ContentContainer` (max-w
  `--size-content-max`), `PageHeader`, `CreateMenu` (desktop dropdown; mobile
  radial `CreateMenuOverlay`). Nav config + per-route page copy live in
  `src/lib/navigation.ts`; create actions in `src/lib/createMenu.ts`.
- **State:** navigation = the URL (router), not a store. Only UI state (drawer /
  create-menu open) lives in `src/stores/uiStore.ts`.
- **Reused visual components:** `src/components/home/{StatCard,ProgressCard,
  SetItem,blobs,HomeBackground,HomeIconGradientDefs}` (the design DNA); the
  Phase-2 mobile-nav components were removed.

## How to read the iOS source
```bash
curl -sL https://api.github.com/repos/vikusyusichka/WordAround/tarball/develop -o wa.tar.gz && tar -xzf wa.tar.gz
# modules live under WordAround/Features/<Module>/{Views,ViewModels,Models,Services,Components}
```
516 Swift files across 10 modules (branch `develop`). Each feature follows MVVM:
`Views` (SwiftUI) · `ViewModels` (ObservableObject) · `Models` (Codable) ·
`Services` (Firestore / AI / device).

## SwiftUI → Web translation rules (conventions locked in Phase 0/1 — keep consistent)

| SwiftUI | Web |
|---|---|
| `Color(red:g:b:)` literal | hex CSS var in `src/styles/index.css` `@theme`; add per screen. Use `--color-auth-*` naming precedent. |
| `Layout.swift` constant | Tailwind arbitrary value `text-[34px]` / token; responsive `isPadLike` → `md:` at the 700px breakpoint (`--breakpoint-md`). |
| `View` (screen) | route file `src/routes/*.tsx` (TanStack file-based) |
| `View` (subcomponent) | `src/components/<feature>/*.tsx`; shared → `src/components/primitives/` |
| `ViewModel : ObservableObject` | Zustand store `src/stores/*.ts` (precedent: `authStore`, `sessionStore`). Forms → react-hook-form + zod, not the store. |
| `Service` (Firestore) | `src/lib/<name>Service.ts` using modular `db` from `src/lib/firebase.ts` (first one lands in Phase 2/3) |
| `Service` (AI) | shared `src/lib/aiClient.ts` (see AI section) + per-feature prompt builders |
| `Image(systemName:)` | `<Icon name="sf.symbol">` — extend the map in `src/lib/icons.ts`; `.fill` suffix auto-selects Phosphor `weight="fill"` |
| SF-only glyph (globe, brand marks) | inline SVG component |
| `.animation(.spring)` / `withAnimation` | CSS `@keyframes` in `index.css` (precedent: `wa-badge-float`, `wa-pulse-*`) or Motion (`motion`) for drag/gesture/spring |
| `.sheet` / `.fullScreenCover` | route or a portal/dialog component; modal state in component or store |
| user-visible string | `t('ns.key')` via i18next; add to `src/locales/en/common.json` (+ scaffold uk/pl/de) |

**Verification convention (every phase):** `npm run typecheck` + `test:run` +
`lint` + `build` green; drive the real UI with the browser MCP (`preview_*`);
diff visually against iOS; use the real shared Firebase project for data.

## Data model — persistence map (CRITICAL for planning)

### Firestore (cloud, shared with iOS) — under `users/{uid}/`
| Collection path | Model | Notes |
|---|---|---|
| `folders/{id}` | Folder | `{id, ownerUID, title, colorHex, icon, createdAt, order?}` |
| `flashcardSets/{id}` | FlashcardSet | embeds `cards: [{id, word, translation, example, imageURL?}]`; `{ownerUID, ownerEmail, title, description, privacy, folderID?, folderName?, colorHex, icon, createdAt, updatedAt}` |
| `grammarNoteTopics/{topicId}` | topic | `{title, notesCount, updatedAt, ...}` |
| `grammarNoteTopics/{topicId}/notes/{noteId}` | GrammarNote | rich `contentBlocks[]`, `isPinned/isFavorite`, `noteType`, `searchableText`, `sortIndex`, images |
| `readingItems/{id}` | ReadingLibraryItem | `{modeID, progress, status, lastOpenedAt, updatedAt, createdAt, ...}` — one collection, filtered by `modeID` |

Firestore write pattern: `setData(from:merge:)` → web `setDoc(ref, data, {merge:true})`;
`updateData` → `updateDoc`; batches → `writeBatch`; `FieldValue.increment` →
`increment()`. Timestamps → Firestore `Timestamp`.

### Local device storage (NOT in Firestore) — per-device on iOS
| iOS store | Data | Web equivalent |
|---|---|---|
| `LocalListeningSessionStore` (`listening_sessions.json`) | saved listening practice sessions + local audio file refs | **IndexedDB** (audio as Blob) |
| `LocalDailyPracticeStatsStore` (`daily_practice_stats.json`) | daily practice entries (streak/goal stats on Home) | **IndexedDB** or `localStorage` |
| `GrammarNotesSettingsStore` | grammar settings/prefs | `localStorage` |

**Decision for the planning chat:** to stay 1:1 with iOS, keep these local
(IndexedDB via a tiny wrapper, e.g. `idb-keyval`). Optionally propose promoting
daily-stats to Firestore later so Home stats sync across devices — flag as an
enhancement, not default.

### Storage (images)
Firebase Storage bucket `wordaround-97f86.firebasestorage.app`. Flashcard card
images + grammar-note images. iOS `LocalImageStorageService` caches locally;
grammar `uploadNoteImage` is a stub (needs Storage). Web: upload via
`firebase/storage` `uploadBytes` → `getDownloadURL`.

## AI backend catalogue (Cloudflare Worker — already deployed, CORS `*`)

Base URL: `VITE_AI_WORKER_URL` =
`https://wordaround-gemini-proxy.vikusyusichka-ai.workers.dev`. Multi-provider
router (Gemini/Groq/Cerebras/Cohere/DeepSeek) with fallback + cooldown. The iOS
services all build a **prompt string** and POST it; the worker returns `{text}`.

**Web AI client (build once, Phase 4):** `src/lib/aiClient.ts` —
`generateText(prompt, {task?, json?, languageCode?})` → `POST /` with
`{prompt, responseMimeType?, task, languageCode}` → `{text}`; plus typed helpers
for the specialized endpoints below.

| Endpoint | Purpose | Used by phase |
|---|---|---|
| `POST /` `{prompt, task, responseMimeType?}` | generic prompt → `{text}` (grammar quiz, essays, feedback, conversation, debate replies) | 4, 5, 7 |
| `POST /api/describe-picture/random-image` | Unsplash random photo → `{id,imageURL,authorName,authorURL}` | 7 |
| `POST /api/shadowing/phrases` | shadowing phrases JSON | 7 |
| `POST /api/pronunciation/content` | pronunciation items JSON | 7 |
| `POST /api/speaking/topic` | one conversation topic JSON | 7 |
| `POST /api/speech/azure-token` | short-lived Azure Speech token → `{token,region}` | 6, 7 |
| `POST /api/listening/transcribe` (multipart) | Whisper → `{transcriptText, subtitles[], vttText, durationSeconds, detectedLanguage}` | 6 |

**Task types** (sent as `task` to `POST /`, selects provider chain): fast —
`speaking_topic_generation, debate_topic_generation, debate_ai_response,
speaking_conversation, shadowing_phrase_generation,
pronunciation_content_generation, quick_hints, synonym_generation,
translation_short`; analysis — `essay_generation, essay_scoring, essay_hints,
essay_assistance, speaking_feedback, free_speaking_feedback,
describe_picture_feedback, debate_feedback, grammar_quiz_generation`.

**Streaming:** worker currently returns one-shot `{text}`. For the "AI typing"
feel in Speaking chat / Debate / Story mode, add `POST /api/stream` (SSE
proxying Gemini/Groq `stream=true`) to the worker in Phase 7; web reads via
`fetch` + `ReadableStream`. One-shot is fine for all other phases.

## Voice & media substitutions (browser APIs)
| iOS | Web |
|---|---|
| Azure Pronunciation Assessment (`PronunciationAssessmentService`) | `microsoft-cognitiveservices-speech-sdk` (JS), auth via `/api/speech/azure-token` |
| Speech-to-text (`SpeechRecognitionService`) | Azure Speech SDK (above) or `SpeechRecognition` (webkit) as fallback |
| Text-to-speech (`SpeechSynthesisService`) | Web Speech `speechSynthesis` (free) or Azure for quality |
| Audio/video transcription | `/api/listening/transcribe` (Whisper) — ready |
| OCR (`ReadingOCRService`, Vision) | **Tesseract.js** |
| PDF import (`ReadingPDFImportService`, PDFKit) | **pdf.js** |
| `<video>` + subtitle overlay | HTML5 `<video>` + WebVTT `<track>` from worker cues |

## Per-phase planning notes

### Phase 2 — Home shell  (M)  `Features/Home` (13 files)
Screens/components: `HomeView` (ZStack: blob bg + header + sidebar + content +
bottom nav), `HomeHeaderView`, `BottomNavigationBar` (5 tabs, big center create
button, radial create-menu of 5 FABs on an arc — spring stagger 0.04→0.28),
`CategorySidebarView` (4 skill categories), `StatCardView` ×3,
`ProgressCardView` (goal + action variants), `SetItemView`, `SetsListView`.
Nav state (selectedTab/selectedCategory/isCreateMenuPresented) → a `homeStore`
(Zustand) mirroring `HomeViewModel`. Stat cards + today-goal are static
placeholders in iOS (real data later). Replaces the `/phase0` landing with
`/home`; update the router auth-gate `authenticated → /home`. Reuse Phase-1
`BlobBackground`, `Icon`, `Screen`, `Card`. Depends on Phase 3 for real sets in
"Your sets"/"Continue learning" (stub until then). Layout tokens: the whole
`Home*` + `bottomNav*` + `categorySidebar*` + `statCard*` + `progress*` groups
in `Layout.swift`.

### Phase 3 — Flashcards + Folders CRUD  (L)  `Features/{Flashcards,Folders}` (49+7)
First real Firestore code. Services (create in `src/lib/`):
`flashcardSetService` (create/fetch/delete/fetchByFolder — see iOS
`FlashcardSetService`), `folderService` (create/fetch/update/delete). Screens:
`FoldersListView`, `CreateFolderView`, `FolderDetailView`; `SetsListScreen` +
row/header + search/filter; **`CreateSetView`** (large wizard: header, info,
dynamic cards editor with image picker → Firebase Storage, customization =
color picker + folder picker + SF-symbol picker `SFSymbolCatalog`, live preview);
`FlashcardSetDetailView` (big card with 3D flip, audio/autoplay controls,
filter tabs all/learned/new, card rows, expanded/edit/add). Domain helpers to
port near-verbatim: `CreateSetValidator`, `CreateSetBuilder`,
`CreateSetIconSuggester`, `AIResponseTextCleaner`. TTS for card audio = Web
Speech. Huge `createSet*` + `flashcardDetail*` token groups in `Layout.swift`.
This phase completes the MVP.

### Phase 4 — Writing  (M)  `Features/Writing` (124)  — best first AI module
Submodules: **Main** (`WritingView` menu grid + progress summary); **Exercise
/ WriteWords** (spell-the-word game — state machine setup/playing/win/lose,
answer cells, countdown, result/lose screens); **SetSelection** (modal picks a
set); **Essays** (AI topic + editor + AI scoring; worker tasks
`essay_generation/essay_scoring/essay_hints/essay_assistance`; helper toolbar
translate/synonym); **GrammarNotes** (~30 files: CRUD notes with rich
`contentBlocks`, FAB radial menu, quick sheets, AI quiz via
`grammar_quiz_generation`). Persistence: grammar notes → Firestore
`grammarNoteTopics/{topicId}/notes`; grammar settings → local. Build the shared
`aiClient.ts` here. Token groups: `writeWords*`, `essay*`, `grammar*`.

### Phase 5 — Reading  (L)  `Features/Reading` (130)  — largest module
Shared: `ReadingView` grid, `ReadingModeLibraryView`, `ReadingSetupView`,
mode/library cards, `ReadingProgressSummaryCardView`. Submodules: **MyTexts**
(paste / OCR=Tesseract.js / PDF=pdf.js; AI question generation; tappable-text
session where each word → translate; scoring); **SpeedReading**
(countdown→timer→read→WPM result); **StoryMode** (AI stories, streaming);
**ReadingFromSets** (reading assembled from user cards). Persistence: Firestore
`readingItems` (filter by `modeID`, progress/status/lastOpened). Services to
mirror: `MyTextsAIGenerationService`, `ReadingOCRService`,
`ReadingPDFImportService`, `ReadingScoringService`, `ReadingQuestionService`,
`ReadingSessionService`, `ReadingStorageService`.

### Phase 6 — Listening  (M)  `Features/Listening` (63)
`ListeningView` + mode/progress cards. Submodules: **ListenFromText** (TTS =
Web Speech / Azure, word-sync highlight); **ImportAudio** (upload →
`/api/listening/transcribe` → session); **ImportVideo** (same + `<video>` +
subtitle overlay from worker VTT/cues); **SavedPractice** (list saved sessions).
Persistence: **local** (`LocalListeningSessionStore` → IndexedDB; audio as
Blob). Services: `ListeningScoringService`, `ListeningSpeechService`,
`ListeningTranslationService`, `CloudflareListeningTranscriptionService`.

### Phase 7 — Speaking  (L)  `Features/Speaking` (113)  — hardest (realtime voice + streaming)
Modes: **AIConversation** (scenario picker → chat with streaming AI replies,
mic via Azure STT, TTS of replies, hints, correction cards — prompt built
client-side, see `SpeakingConversationService.buildPrompt`, task
`speaking_conversation`); **Debate** (pick side, rounds, `debate_*` tasks);
**DescribePicture** (`/api/describe-picture/random-image` → mic →
`describe_picture_feedback`); **FreeSpeaking** (topic → mic → transcript →
`free_speaking_feedback`); shared scoring/metric/correction cards. Add worker
`POST /api/stream` (SSE) here. Voice: Azure Speech SDK (STT + pronunciation) via
`/api/speech/azure-token`; TTS Web Speech. Token groups: `conv*`, `speakingMode*`.

### Phase 8 — Polish  (M)
Animated blobs/sparkles (Motion), container-query pad layout ≥700px, PWA
(manifest + service worker, offline flashcard study via IndexedDB), virtualized
long lists (`@tanstack/react-virtual`), perf, optional analytics. Consider
Firestore security-rules review before public launch.

## What never ports
`WordAround.xcodeproj`, `Info.plist`, `GoogleService-Info.plist` (→ `.env`),
`functions/index.js` (superseded by the Worker), `AppDelegate.swift`,
SF Symbols catalog (→ Phosphor + inline SVG).
