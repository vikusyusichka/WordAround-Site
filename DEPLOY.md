# WordAround Web — деплой на Cloudflare Pages

Що це: живий сайт (`wordaround-site.pages.dev`) який автоматично
оновлюється щоразу, як ти запушиш зміни у гілку `main` на GitHub.

Один раз налаштовуємо (~30 хв), далі кожен деплой — це один `git push`.

## 1. Створюємо GitHub-репо

1. Відкрий https://github.com/new (маєш бути залогінена як `vikusyusichka`).
2. **Repository name:** `WordAround-Site`
3. **Description:** можеш лишити порожньо (або "Web port of iOS
   WordAround language-learning app").
4. **Visibility:** **Private** (це особистий проєкт; секретів у коді
   немає, але privacy за замовчуванням безпечніша).
5. **Initialize this repository:** НЕ ставити галочки на README,
   .gitignore, чи license — вони вже є локально.
6. Натисни **Create repository**. Побачиш порожню сторінку з інструкціями.

## 2. Пушимо код на GitHub

Я запущу з термінала `git push -u origin main` — це відправить усі 8
комітів на новостворене репо. Тобі нічого робити.

Якщо GitHub попросить логін через браузер (через Git Credential Manager
у Windows) — просто підтверди.

## 3. Створюємо Cloudflare Pages-проєкт

1. Відкрий https://dash.cloudflare.com → **Workers & Pages**
   (у лівому меню).
2. Натисни **Create** → у вкладці **Pages** обери **Connect to Git**.
3. Натисни **Connect GitHub**, авторизуй Cloudflare на своєму
   GitHub-акаунті (у popup виберіть "Only select repositories" →
   `WordAround-Site`).
4. Обери репо `vikusyusichka/WordAround-Site` → **Begin setup**.
5. Заповни форму:
   - **Project name:** `wordaround-site` (стане субдоменом
     `wordaround-site.pages.dev`)
   - **Production branch:** `main`
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory / path:** лишити порожнім
6. Розкрий блок **Environment variables (advanced)** — додаємо всі
   значення з `.env.local` (див. крок 4).

## 4. Environment variables

Відкрий локальний файл `.env.local` у теці проєкту — там є 8 рядків
типу `VITE_XXX=значення`. Скопіюй значення у форму Cloudflare:

Обов'язкові (7):
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_AI_WORKER_URL
```

Опціональна (може бути порожньою у тебе):
```
VITE_FIREBASE_MEASUREMENT_ID
```

Плюс одна змінна для Node:
```
NODE_VERSION = 20
```

Ці значення — **не секрети**. Firebase Web config за задумом відкритий
браузеру; справжню безпеку роблять Firestore/Storage rules на сервері.
Але в Cloudflare вони так само не побачуть інші користувачі — тільки
проєкт має до них доступ.

## 5. Save and Deploy

Натисни **Save and Deploy**. Cloudflare почне збірку:
1. `npm install` — приблизно 30 сек
2. `npm run build` — 15-20 сек
3. Публікація файлів — миттєво

Загалом ~1 хвилина. Побачиш зелений статус **Success** і посилання
`https://wordaround-site.pages.dev`.

Якщо збірка не вдалась — дивись розділ **Troubleshooting** нижче.

## 6. Додаємо домен у Firebase Authorized domains

Без цього Google Sign In (кнопка "Continue with Google") на новому
сайті вилетить помилкою `auth/unauthorized-domain`. Email/password
працюватиме одразу.

1. Відкрий https://console.firebase.google.com → проєкт **wordaround-97f86**
2. Ліве меню → **Authentication** → **Settings** → **Authorized domains**
3. Натисни **Add domain**
4. Введи `wordaround-site.pages.dev` → **Add**
5. Заодно переконайся, що `localhost` теж у списку (для локальної
   розробки).

Ефект набирає силу негайно — не треба ребілдити.

## 7. Перевіряємо наживо

Відкрий `https://wordaround-site.pages.dev` у **свіжій вкладці**
браузера:

- [ ] Onboarding-екран рендериться без білого мерехтіння
- [ ] Sign in email/password працює (створи тестовий акаунт або
      використай існуючий)
- [ ] Home dashboard — сайдбар з 4 практичними режимами видно
- [ ] `/practice/writing` — landing відкривається
- [ ] `/practice/writing/essays` — Essays landing; натисни **Generate
      topic** → AI повертає реальну тему (доказ, що AI-воркер доступний
      з нового домену)
- [ ] Обнови сторінку (F5) на `/practice/writing/essays` — вона НЕ має
      віддати 404 (доказ, що `_redirects` спрацював)
- [ ] Console (F12 → Console) — 0 помилок

Якщо все ✅ — деплой готовий! 🎉

---

## Як тепер робити майбутні деплої

Один командою:
```
git push
```

Cloudflare побачить push у `main`, ребілдне сайт, і за ~1 хвилину нова
версія жива. Історія білдів + rollback у Cloudflare Pages → твій проєкт
→ **Deployments**.

Preview deploys за branch/PR — Cloudflare робить автоматично для кожної
іншої гілки, приймати нічого не треба.

---

## Troubleshooting

### Cloudflare build failed
1. Відкрий Cloudflare Pages → твій проєкт → **View build** — лог
   збірки.
2. Найтиповіші помилки:
   - **"Missing required env var VITE_..."** — забула додати одну зі
     змінних у Cloudflare env vars. Додай і натисни **Retry deployment**.
   - **"Node version …"** — забула додати `NODE_VERSION=20`. Додай.
   - **TypeScript/lint error** — щось зламане локально теж. Запусти
     `npm run typecheck && npm run lint` локально й полагодь до пушу.

### Live site — біла сторінка
1. Відкрий Console (F12 → Console). Найтиповіше:
   - **Firebase: Missing config** — не додала env var. Або значення з
     хвостовими пробілами. Перечитай крок 4.
   - **404 на .js файлі** — Vite chunk не завантажився; типово через
     rollback чи кешування. Ctrl+Shift+R (hard refresh).

### Google Sign In: "auth/unauthorized-domain"
Крок 6 не зроблений або зроблений на іншому Firebase-проєкті. Перевір
що `wordaround-site.pages.dev` є в Authorized domains проєкту
`wordaround-97f86`.

### Refresh на будь-якому /practice/... → 404
`public/_redirects` не задеплоївся. Перевір, що файл є у гілці `main`
на GitHub (він має бути там після пушу). Якщо є — ребілдни через
Cloudflare Pages → **Retry deployment**.

### Deploy начебто ок, а сайт відкриває стару версію
Cloudflare CDN кешує агресивно. Ctrl+Shift+R (hard refresh) у браузері,
або відкрий у incognito-вкладці — і побачиш свіжу версію.

---

## Незакриті питання (post-deploy, не блокери)

- **Storage CORS** для завантаження фото карток. Флешкартка без фото
  працює одразу; з фото — має 30-секундний timeout, а потім падає.
  Виправляється командою `gsutil cors set cors.json gs://wordaround-97f86.firebasestorage.app`
  через Google Cloud SDK. Зроблю окремим кроком, коли ти будеш готова
  встановити `gcloud CLI`.
- **Кастомний домен** (замість `wordaround-site.pages.dev` — свій
  типу `wordaround.app`). Cloudflare Pages → проєкт → **Custom
  domains** → додати CNAME. Робимо пізніше, як буде готовий домен.
