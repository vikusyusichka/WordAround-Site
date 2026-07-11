# WordAround → Web: план міграції

Портуємо iOS-застосунок `vikusyusichka/WordAround` (SwiftUI, гілка `develop`, 553 файли,
516 `.swift`) на веб-SPA.

> **⚠️ Курс (оновлено 2026-07-11): web-first, НЕ 1:1 з iOS.** З iOS беремо
> **дизайн** (палітра, блоби, круглі картки, тіні, градієнтні іконки, Manrope,
> Motion) і **функціонал**. Навігацію, компонування та взаємодію робимо **за
> веб-стандартами** (справжні URL-адреси, бокове меню зліва на десктопі, drawer
> на мобільному, обмежена ширина, hover/клавіатура/фокус) — це може відрізнятися
> від iOS. Веб-каркас: `src/routes/_authed.tsx` + `src/components/shell/*`. Див.
> `docs/PORTING-REFERENCE.md` → «Guiding principle».

**Джерела аудиту:**
- `WordAround/Core/Theme/{AppColors,Color+Hex,Layout}.swift` — дизайн-система
- `WordAround/App/{WordAroundApp,SessionStore,AppDelegate}.swift` — вхідна точка + auth
- `WordAround/Features/*` — 10 модулів
- `WordAround/Core/Services/Firebase/*` — Firestore схема
- `cloudflare/wordaround-gemini-proxy/src/*` — AI-бекенд (лишається без змін)
- `functions/index.js` — Firebase Cloud Function (застаріла; замінена Worker'ом)

---

## Загальна картина

**Що це:** iOS-застосунок для вивчення мов. Ядро — колекції флешкарток
(«sets») згруповані в «folders». Навколо ядра — 4 skill-треки з AI-сесіями:
Reading, Writing, Speaking, Listening.

**Що вже готове як бекенд і мігрує без роботи:**

1. **Firebase** — Auth (email/password + Google), Firestore, Storage (для
   зображень флешкарток). Web SDK v10 має ідентичний API до iOS. Схема
   Firestore перетворюється 1:1.

2. **Cloudflare Worker `wordaround-gemini-proxy`** — це НЕ просто проксі. Це
   мульти-провайдерний AI-роутер:
   - Gemini / Groq / Cerebras / Cohere / DeepSeek — fallback-ланцюг + cooldown
   - `POST /` — універсальний prompt-endpoint (grammar quiz, essays, feedback,
     conversation)
   - `POST /api/describe-picture/random-image` — Unsplash
   - `POST /api/shadowing/phrases` — фрази для shadowing
   - `POST /api/pronunciation/content` — matter for pronunciation training
   - `POST /api/speaking/topic` — генерація conversation-topic
   - `POST /api/speech/azure-token` — короткоживучий Azure Speech token
   - `POST /api/listening/transcribe` — Cloudflare Workers AI Whisper
   - **CORS вже `Access-Control-Allow-Origin: *`** — web може стукати одразу.

**Що потребує роботи на бекенді:** нічого критичного. Опціонально — додати
SSE-endpoint для стрімінгу AI-відповідей у chat/Debate (див. Phase 7).

---

## Дизайн-токени

### Кольори (`AppColors.swift` → CSS vars)

Всі кольори конвертуються дослівно з SwiftUI `Color(red:green:blue:)` (0–1 float)
у HEX / OKLCH. Групи:

**Основа**
| Токен | HEX | Використання |
|---|---|---|
| `appBackground` | `#F6F6FB` | фон усіх екранів |
| `primaryBlue` | `#2B5CFA` | primary CTA, іконки |
| `primaryBlueDark` | `#214BD1` | заголовки, тексти |
| `textSecondary` | `#828CAB` | subtitle |
| `mutedText` | `#8F99B7` | disabled/placeholder |
| `cardWhite` | `rgba(255,255,255,0.95)` | фон карток |

**Blob-акценти (декоративні плями)**
| Токен | HEX |
|---|---|
| `blobBlue` | `#D6E0FA` |
| `blobYellow` | `#F2DBA1` |
| `blobGreen` | `#D1E3D9` |
| `blobPink` | `#EBD1DE` |

**Категорії (кожна має accent + title + soft background)**
- Food / Speaking: `foodAccent #FF7375`, `foodTitle #A11C35`, `foodBackground #FFF0F2`
- Orange / Reading: `orangeAccent #F7A310`, `orangeTitle #AB6305`
- Green / Free Speaking: `greenAccent #29BA66`, `greenTitle #128C47`, `greenSoftBackground #F0FAF2`

**Create Set (окрема палета)**
- `createSetBackground #FFFAFC`, `createSetRed #FF5759`, `createSetDarkRed #8C051E`,
  `createSetSoftRed #FFE8EA`, набір pastel accent-кольорів (Blue/Yellow/Green/Purple/Cyan)

**Flashcard Detail**
- `flashcardDetailTitle #1433B7`, `flashcardDetailText #6B75A0`,
  `flashcardDetailCardBackground #F2F5FF`, `flashcardDetailSoftBlue #DBE3FF`

**Тіні:** `createSetShadow rgba(0,0,0,0.06)`, `flashcardDetailShadow rgba(0,0,0,0.055)`

### Типографія

SwiftUI використовує `.font(.system(.rounded))` скрізь. На вебі:
- **Основний шрифт:** `Manrope` (self-hosted woff2) — найближче до SF Pro
  Rounded, без ліцензійних обмежень для веба.
- **Fallback:** `-apple-system, "SF Pro Rounded", system-ui, sans-serif` — на
  Apple-пристроях відображається справжній SF Pro.
- **Ваги:** 400 / 500 / 600 / 700 / 800 (semibold і bold використовуються
  найчастіше).

Розміри з `LayoutConstants.Typography` (breakpoint 700px):
| Token | Compact (<700px) | Regular (≥700px) |
|---|---|---|
| `screenTitle` | 32 | 40 |
| `writingTitle` | 34 | 42 |
| `largeTitle` | 28 | 34 |
| `title` | 18 | 22 |
| `cardTitle` | 16 | 19 |
| `body` | 14 | 16 |
| `bodySmall` | 13 | 15 |
| `caption` | 12 | 14 |
| `captionSmall` | 11 | 13 |

### Layout (spacing / радіуси)

**Загальні:**
- `screenHorizontalPadding` 22 / 34 (compact / regular)
- `cardCornerRadius` 22
- `smallCardCornerRadius` 18
- `cardInnerPadding` 16
- `sectionSpacing` 18 / 24
- `contentMaxWidth` 620 (компакт: full, wide: центрувати)

**Home:**
- `sidebarWidth` 74 / 86 / 108 (compact-phone / phone / pad)
- `homeSectionTitleSize` 22 / 34
- `bottomNavHeight` 84
- `bottomNavCornerRadius` 26
- Radial create-menu offsets: `Folder(-150,-74)`, `Set(-86,-144)`, `Text(0,-174)`,
  `Audio(86,-144)`, `Essay(150,-74)` — 5 FAB'ів на кривій дуги.

**Компоненти-специфічні:** `Layout.swift` (1300+ рядків) містить 30+ MARK-секцій
із розмірами під конкретні компоненти (Create Set — 200+ констант, Flashcard
Detail — 50+, Essay editor — 100+, Grammar Notes — 40+, AI Conversation — 40+).
Портуємо блоками, коли переносимо відповідний компонент, а не все одразу.

### Анімації

- Spring (найважливіше): `.spring(response: 0.34–0.55, dampingFraction: 0.82–0.86)`
- Interpolating spring для radial FAB menu: `mass: 1.0, stiffness: 90, damping: 18`
- Стандартний easing: `.easeInOut(duration: 0.22)`

Веб-еквівалент: **Framer Motion** — має `spring` з тим самим API
(`stiffness/damping/mass`), відтворює SwiftUI-відчуття 1:1.

### Іконки

SwiftUI використовує SF Symbols (закриті Apple, ліцензія забороняє
використання поза Apple-платформами). **Заміна: Lucide** — тонкі, з
округленими кутами, візуально дуже близькі до SF Symbols; open source.
Складаємо map `sfSymbol → lucideName`. Для деяких символів (напр. `waveform`,
`sparkles`) намалюємо власні SVG.

### Декоративні форми

`BlobShape` (Onboarding, Home background, Flashcard Detail header, Stat cards)
— органічна пляма з 4 контрольними точками. Портуємо як SVG-path
із такою самою математикою (path генерується один раз, потім масштабується).

Sparkle-декорації (`sparkle` на StatCard, Flashcard Detail) — прості SVG-зірки
4/5/6-променеві.

---

## Стек — обґрунтування

### Обраний стек

| Шар | Технологія | Чому |
|---|---|---|
| Build | **Vite 5** | Найшвидший dev-server, найпростіший конфіг; SPA — не потрібен SSR |
| Framework | **React 19 + TypeScript** | Найбільша екосистема для iOS-native-feel; типи для 500+ файлів обов'язкові |
| Routing | **TanStack Router** | Typed routes, code-splitting per-route, підходить для 30+ екранів |
| Styling | **Tailwind CSS v4** | Design tokens як CSS vars (@theme), container queries нативно (для isPad-логіки) |
| Animations | **Framer Motion 11** | Spring API 1:1 із SwiftUI; жести (pan/drag/swipe) з коробки |
| State | **Zustand** | Ментальна модель ObservableObject; без Provider hell |
| Data fetch | **TanStack Query** | Кешування Firestore-запитів, optimistic updates, revalidation |
| Firebase | **firebase v10 (modular)** | Tree-shakeable, Auth+Firestore+Storage; той самий API що iOS |
| Forms | **react-hook-form + zod** | Складна форма CreateSet потребує типізованої валідації |
| Icons | **lucide-react** | Найближче візуально до SF Symbols; open source |
| Шрифт | **Manrope** (self-hosted) | Найближче до SF Pro Rounded без ліцензійних питань |
| Deploy | **Cloudflare Pages** | Той самий провайдер що і AI Worker — єдина панель |

### Що спеціально відкинуто

- **Next.js** — SSR не дає нічого для auth-gated SPA (Firebase Auth клієнтський).
  Hydration ускладнює анімації. Vite швидший на dev-loop.
- **shadcn/ui, Radix, Chakra, MUI** — потрібен піксель-точний iOS-вигляд; UI-kit
  дасть свій стиль, від якого дорого відходити. Пишемо власні примітиви.
- **React Native Web** — надто багато iOS-only API, які не працюють на вебі.
- **Redux/RTK** — Zustand розв'язує ті самі задачі з меншим boilerplate.
- **Sass / CSS Modules** — Tailwind v4 з `@theme` покриває дизайн-токени + локальну стилізацію.

### AI-стрімінг

Поточний Worker відповідає одним JSON-об'єктом `{text}` — не стрімить. Для
відчуття «AI-друкує» додамо новий endpoint `POST /api/stream` у той самий
Worker: Server-Sent Events, який проксить SSE з Gemini/Groq (обидва
підтримують `stream=true`). Web-клієнт читає через `fetch` + `ReadableStream`.
Реалізуємо у Phase 7 (Speaking), решта модулів обходиться one-shot.

### Голос (STT / TTS)

- **STT:** Azure Speech через існуючий `/api/speech/azure-token` (той самий
  Worker дає короткоживучий токен; ключі не покидають CF). Той самий
  провайдер що на iOS — 0 фрагментації якості.
- **TTS:** Web Speech API `SpeechSynthesis` (безкоштовний, у всіх сучасних
  браузерах). Для якісного multi-language TTS — опціонально Azure Speech
  (тим самим токеном).
- **Транскрипція файлів:** `POST /api/listening/transcribe` — уже готовий.

### Тестування у веб-браузері

Cloudflare Pages + Firebase Emulator Suite для локального dev. Один
`.env.local` із Firebase config + Worker URL.

---

## Блоки міграції (від простого до складного)

Кожен блок — самодостатній: закінчивши, отримуємо працюючий екран/потік.
Оцінка складності: **S** (< день), **M** (кілька днів), **L** (тиждень+).

### Phase 0. Foundation `S`
- Скафолд Vite + React + TS + Tailwind v4 + Router + Firebase init
- CSS vars з `AppColors` → Tailwind `@theme`
- Typography scale з `LayoutConstants.Typography`
- Layout constants (spacing, corner radius) → Tailwind theme extension
- Базові примітиви: `<Screen>`, `<Card>`, `<SectionTitle>`, `<AdaptiveContainer>`
  (порт із SwiftUI `ScreenMetrics`), `<BlobBackground>`
- SessionStore-еквівалент на Zustand (auth state machine)
- Firebase Web SDK ініціалізація, `.env` для config
- Router shell: гілки `/onboarding`, `/auth`, `/verify-email`, `/*` (auth-gate)
- Мапа `sfSymbol → lucide` + власні SVG для `waveform / sparkles / pencil.and.scribble`

### Phase 1. Onboarding + Auth `S`
Скрини: `OnboardingView`, `AuthView`, `VerifyEmailView`, забутий пароль.

- `OnboardingView` + `BlobShape` (SVG-path), one-time via localStorage
- `AuthView`: email/password форма (react-hook-form + zod),
  `signInWithPopup(GoogleAuthProvider)` замість iOS GoogleSignIn
- `VerifyEmailView`: `sendEmailVerification`, `reload()` polling
- Password reset: `sendPasswordResetEmail`
- `AuthViewModel`, `VerifyEmailViewModel` — Zustand stores

### Phase 2. Home shell `M`
Це найважчий верхньорівневий layout; всі інші фічі йдуть під нього.

Скрини/компоненти:
- `HomeHeaderView` (avatar circle, title/subtitle, notification dot)
- `BottomNavigationBar` — 5 tabs, центральна create-кнопка більша,
  selected-circle з тінню
- Radial create-menu overlay — 5 FAB'ів анімуються по дузі
  (spring з delays 0.04→0.28); фон `.ultraThinMaterial` → `backdrop-filter: blur`
- `CategorySidebarView` — 4 категорії з indicator-highlight, тінями
- `HomeView` контейнер зі ZStack (blob background + content + bottom nav)
- Dashboard: `StatCardView` × 3, `ProgressCardView` (goal та action варіанти),
  "Continue learning", `SetsListView`
- `HomeViewModel` — nav state, header title/subtitle, deleteFolder, moveFolders

### Phase 3. Flashcards + Folders CRUD `L`
Найбільша частина без AI — CRUD із Firestore.

Firestore схема (портується 1:1):
```
users/{uid}/folders/{folderId}
  → {id, ownerUID, title, colorHex, icon, createdAt, order}
users/{uid}/flashcardSets/{setId}
  → {id, ownerUID, ownerEmail, title, description, privacy,
     folderID?, folderName?, colorHex, icon, cards: [{id, word, translation, example, imageURL?}],
     createdAt, updatedAt}
```

Скрини:
- `FoldersListView` (grid карток), `FolderCardView`
- `CreateFolderView`, `FolderDetailView`
- `SetsListScreen` + `SetsListView` + `SetsListRowView` + `SetsListHeaderView`
  (search, filter by folder)
- `CreateSetView` (величезний wizard):
  - `CreateSetHeaderView` (back, іконка, privacy toggle)
  - `CreateSetInfoSectionView` (title + description + counter)
  - `CreateSetCardsSectionView` (динамічний список карток) з підкомпонентами
    `CreateSetCardEditorView`, `CreateSetCardTextField`, `CreateSetCardExampleField`,
    `CreateSetImagePickerView` (Firebase Storage)
  - `CreateSetCustomizationSectionView`: `CreateSetColorPickerView` (5 preset),
    `CreateSetFolderPickerView`, `SFSymbolPickerView` + `SFSymbolCatalog` (grid),
    `CreateSetPreviewCardView` (live preview)
- `FlashcardSetDetailView`:
  - `FlashcardSetDetailTopBarView` (back / edit / share)
  - `FlashcardSetDetailHeaderView` (title, description, avatar, blob decor)
  - `FlashcardSetDetailMainCardView` (велика картка з flip-анімацією 3D)
  - `FlashcardSetDetailControlsView` (audio toggle, autoplay)
  - `FlashcardSetDetailFilterTabsView` (all/learned/new tabs з badges)
  - `FlashcardSetDetailCardRowView` (список карток)
  - `FlashcardExpandedView` (fullscreen картка)
  - `FlashcardSetAddCardView`, `FlashcardEditView`
  - `FlashcardRoundFinishView`

Firestore-послуги:
- `FlashcardSetService`: create/fetch/delete/fetchByFolder
- `FolderService`: create/fetch/update/delete
- `LocalImageStorageService` — заміна на Firebase Storage
- `AIResponseTextCleaner` — utility, портується як plain JS

### Phase 4. Writing `M`
Найменше AI-важкий з чотирьох skill-модулів — гарний тренувальний матеріал
перед Reading/Speaking.

Підмодулі:
- **Main** (13 файлів): `WritingView` (menu-cards grid, progress summary)
- **Exercise (WriteWords)** (7 файлів): гра «набери слово по літерах»
  - `WriteWordsView` контейнер з state-machine (setup/playing/win/lose)
  - `WriteWordsExerciseCardView` (картка з підказкою)
  - `WriteWordsAnswerCellsView` (клітинки для введення)
  - `WriteWordsAnswerInputView` (софт-клавіатура)
  - `WriteWordsCountdownTimerView`
  - `WriteWordsResultScreenView`, `WriteWordsLoseScreenView`
- **SetSelection** (3 файли): `WritingSetSelectionView` як modal
- **Essays** (~10 файлів): AI-згенерований topic + editor + AI-scoring
  - Використовує Worker `POST /` з `task: essay_generation / essay_scoring / essay_hints`
  - Editor з word count, hints, translate/synonym helper toolbar
- **GrammarNotes** (~30 файлів): CRUD нотаток граматики + AI-generated topics
  - FAB з radial menu (подібне до Home create-menu)
  - Quick sheets для nota / mistake
  - Storage: Firestore під `users/{uid}/grammarNotes`

### Phase 5. Reading `L`
Найбільший з чотирьох skill-модулів — 130 файлів.

Загальне:
- `ReadingView` (menu grid), `ReadingModeLibraryView`, `ReadingSetupView`
- `ReadingModeCardView`, `ReadingFeaturedModeCardView`
- `ReadingLibraryItemCardView`, `ReadingProgressSummaryCardView`

Підмодулі:
- **MyTexts** (34 файли) — паста тексту / OCR (веб: `Tesseract.js`) / PDF-імпорт
  (`pdf.js`), AI-генерація питань (Worker `POST /`),
  сесія з tappable-text (кожне слово клікабельне для перекладу), scoring
- **SpeedReading** — countdown → timer → чит → результат (WPM)
- **StoryMode** — AI-згенеровані оповідання (Worker `POST /` streaming)
- **ReadingFromSets** — читання складене з карток користувача

Ключові сервіси: `MyTextsAIGenerationService`, `ReadingOCRService`,
`ReadingPDFImportService`, `ReadingScoringService`, `ReadingSessionService`,
`ReadingQuestionService`.

### Phase 6. Listening `M`
63 файли, 4 sub-модулі.

- `ListeningView` + `ListeningModeCardView` + `ListeningProgressCardView`
- **ListenFromText** — Web Speech API `SpeechSynthesis` (або Azure) для TTS,
  sync-highlight по словах
- **ImportAudio** — upload → `POST /api/listening/transcribe` (Whisper) → session
- **ImportVideo** — те саме + HTML5 `<video>` + subtitle overlay з
  cue-sync (worker повертає VTT+cues)
- **SavedPractice** — список збережених сесій (Firestore)
- Result / Score views (shared)

### Phase 7. Speaking `L`
Найскладніший — real-time голос + AI-стрімінг. 113 файлів.

- **Speaking home** — mode grid (4 варіанти)
- **AIConversation** — сетап (scenario picker), chat зі стрімінгом AI-відповідей,
  мікрофон-бар (Azure STT), TTS з AI-відповіді, hints, correction cards
- **Debate** — вибір сторони (Pro/Con), раундова структура, mic, feedback
- **DescribePicture** — `POST /api/describe-picture/random-image` (Unsplash) →
  mic → AI feedback
- **FreeSpeaking** — free-form topic → mic → transcript → feedback
- **Scoring shared:** `ConversationScoreCardView`, `ConversationMetricCardView`,
  `ConversationCorrectionCardView`

Веб-специфіка:
- Додаємо `POST /api/stream` на Worker для SSE
- Клієнт: `fetch` + `ReadableStream` reader
- Азmalgamated pronunciation assessment: JS SDK Azure Speech (`microsoft-cognitiveservices-speech-sdk`),
  auth через існуючий Worker token

### Phase 8. Polish `M`
- Блоби / іскорки як SVG з анімацією через Framer Motion
- Аdaptive layout: container queries для «pad-like» >700px
- PWA: manifest, service worker, offline flashcards study (IndexedDB кеш)
- iOS deep-link підтримка (для майбутнього спільного інсталу)
- Performance: virtualized lists (TanStack Virtual) для великих sets/folders
- Telemetry (опційно)

---

## Що НЕ мігрується

- `WordAround.xcodeproj` — Xcode-специфічне.
- `Info.plist`, `GoogleService-Info.plist` — заміняються на `.env` + Firebase Web
  config JSON.
- `functions/index.js` — використовувалась стара версія Gemini call; повністю
  покривається новим Worker'ом. Firebase Functions на вебі не потрібні.
- `AppDelegate.swift` — iOS-специфічний.
- SF Symbols catalog — замінюємо на Lucide + власні SVG.

## Що потрібно з боку користувача перед стартом

1. Firebase Web app config (Console → Project settings → General → Web apps)
2. URL уже задеплоєного `wordaround-gemini-proxy` Worker'а
3. Google OAuth redirect domain (додати домен у Firebase Auth → Authorized domains)
4. (пізніше) Cloudflare Pages access для деплою

---

## Приблизна оцінка часу

| Phase | Складність |
|---|---|
| 0. Foundation | S |
| 1. Auth + Onboarding | S |
| 2. Home shell | M |
| 3. Flashcards + Folders | L |
| 4. Writing | M |
| 5. Reading | L |
| 6. Listening | M |
| 7. Speaking | L |
| 8. Polish | M |

Разом: ~3 місяці full-time до feature-parity з iOS `develop`, якщо працювати
блоками послідовно. Phase 0+1+2+3 — MVP, який уже виглядає як WordAround і
дозволяє створювати/переглядати флешкартки.
