# Exam prep — what has to be switched on outside this repo

The Exams section (IELTS, DELE, …) is built and works in the web app. A few
pieces live outside this repository and need an owner to switch them on. Until
they are done, the app degrades honestly — nothing breaks, the screens say what
is unavailable.

| # | What | Needed for | Without it |
|---|------|------------|-----------|
| 1 | Publish the new Firestore rules | History, goals, Premium status | "History isn't available" on the exam page; results are not saved |
| 2 | Worker: larger output for exam tasks | Reading & listening generation, AI marking | Writing/speaking tasks generate; long texts and marking fail with "all providers unavailable" |
| 3 | Worker: sign-in check + daily limits | Protecting AI costs once Premium is sold | Anyone with the Worker URL can call it (same as today) |
| 4 | Stripe + billing endpoints | Selling Premium | `/premium` says payments are not available yet |
| 5 | Turn the paywall on | Premium actually required | Everything stays free (current default) |

Do them in this order. 1 and 2 make the feature fully usable; 3–5 are only for
when you start charging.

---

## 1. Publish the Firestore rules

`firestore.rules` now also allows `users/{uid}/examAttempts`,
`users/{uid}/examGoals` and a read-only `entitlements/{uid}`.

1. Firebase console → project **wordaround-97f86** → Firestore Database → **Rules**.
2. Replace the editor content with the whole of `firestore.rules` from this repo.
3. **Publish**. Nothing else changes — every existing rule is identical.

## 2. Worker: let exam tasks produce long answers

Why: the proxy caps every answer at 2048 tokens, and Gemini 2.5 spends most of
that on hidden "thinking", so a 900-word reading passage arrives cut off.
Measured on 2026-11-18: an IELTS Writing task generated in 6 s, every reading /
listening / marking request failed.

In the Worker project (`cloudflare/wordaround-gemini-proxy` in the iOS repo):

1. Copy `docs/worker-exams/*.js` into the Worker's `src/` folder.
2. `src/router/providers.js`, in `callGemini`, after `generationConfig` is built:

   ```js
   if (typeof request.thinkingBudget === "number") {
     generationConfig.thinkingConfig = { thinkingBudget: request.thinkingBudget };
   }
   ```

3. `src/router/router.js`, in `TASK_KIND`, add:

   ```js
   exam_task_generation: "analysis",
   exam_writing_scoring: "analysis",
   exam_speaking_scoring: "analysis",
   ```

4. `src/index.js`, in `handlePromptProxy`, replace the fixed `maxTokens: 2048`:

   ```js
   import { EXAM_TASKS, EXAM_MAX_TOKENS, EXAM_THINKING_BUDGET, examGate } from "./examGate.js";
   // …
   const isExam = EXAM_TASKS.has(task);
   if (isExam) {
     const blocked = await examGate(request, env, (b, s) => new Response(JSON.stringify(b), { status: s, headers: JSON_HEADERS }));
     if (blocked) return blocked;
   }
   const result = await routeAIRequest({
     task, prompt, responseFormat, temperature: 0.4,
     maxTokens: isExam ? EXAM_MAX_TOKENS : 2048,
     ...(isExam ? { thinkingBudget: EXAM_THINKING_BUDGET } : {}),
     meta: { /* unchanged */ },
   }, env);
   ```

   `examGate` only reads the request headers, so it can run after the body
   has been parsed. With `REQUIRE_AUTH_FOR_EXAMS` unset it lets everything
   through, so this step changes nothing for users except the larger output.

5. `wrangler deploy`.

The web app needs no change for this step.

## 3. Worker: sign-in check and daily limits (before charging money)

1. In `src/index.js` add `Authorization` to CORS:
   `"Access-Control-Allow-Headers": "Content-Type, Authorization"`.
2. Vars: `FIREBASE_PROJECT_ID = "wordaround-97f86"`, `REQUIRE_AUTH_FOR_EXAMS = "on"`.
3. Optional limits: create a KV namespace, bind it as `EXAM_QUOTA` in
   `wrangler.toml`; optionally set `EXAM_DAILY_LIMIT` (default 40) and
   `EXAM_DAILY_LIMIT_PREMIUM` (default 400).
4. Secret `FIREBASE_SERVICE_ACCOUNT` — Firebase console → Project settings →
   Service accounts → Generate new private key; paste the whole JSON with
   `wrangler secret put FIREBASE_SERVICE_ACCOUNT`. Keep that file private.
5. `wrangler deploy`, **then** set `VITE_AI_SEND_ID_TOKEN=on` in Cloudflare
   Pages (Settings → Environment variables) and redeploy the site. The order
   matters: the site must not send the header before the Worker allows it.

## 4. Stripe

1. Create a Stripe account; stay in **Test mode** until everything works.
2. Products → add "WordAround Premium" with two recurring prices (monthly,
   yearly). Copy both `price_…` ids.
3. Developers → Webhooks → add endpoint
   `https://wordaround-gemini-proxy.vikusyusichka-ai.workers.dev/api/billing/webhook`
   with events `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`. Copy the
   signing secret `whsec_…`.
4. Settings → Billing → Customer portal → activate it (cancel, update card).
5. Worker: in `src/index.js` route the three paths before the prompt proxy:

   ```js
   import { handleCheckout, handlePortal, handleWebhook } from "./billing.js";
   const json = (b, s) => new Response(JSON.stringify(b), { status: s, headers: JSON_HEADERS });
   if (pathname === "/api/billing/checkout") return handleCheckout(request, env, json);
   if (pathname === "/api/billing/portal") return handlePortal(request, env, json);
   if (pathname === "/api/billing/webhook") return handleWebhook(request, env, json);
   ```

   Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Vars:
   `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`,
   `ALLOWED_RETURN_ORIGINS = "https://wordaround-site.pages.dev,http://localhost:5173"`.
   Steps 3.1, 3.2 and 3.4 are required for billing too. `wrangler deploy`.
6. Test: on the site, `/premium` → Yearly → card `4242 4242 4242 4242`, any
   future date, any CVC. After returning, Firestore should show
   `entitlements/<your uid>` with `premium: true`.

Legal pages (terms, refunds, privacy) are needed before taking real payments.

## 5. Turn the paywall on

Cloudflare Pages → Settings → Environment variables: `VITE_EXAMS_PAYWALL=on`,
redeploy. From then on, without Premium each task can be tried once and the
mock exam is locked.

To give yourself (or a tester) Premium by hand: Firestore console → start
collection `entitlements` → document id = the user's uid → field
`premium` (boolean) = `true`.

## Not done yet

- **Server text-to-speech.** Listening uses the browser's voices, which vary by
  device. A Worker TTS endpoint with caching would make recordings consistent.
- **More exams.** TOEFL, Cambridge, DELF/DALF, Goethe, and the other DELE
  levels: each is one spec file in `src/lib/exams/specs/` plus tests, checked
  against the official handbook.
- **The iOS app** does not read `entitlements/{uid}` yet.
