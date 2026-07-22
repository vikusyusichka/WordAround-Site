# Firebase security rules

## Current status: ✅ nothing to do

The Firestore rules live on the project were reviewed on **2026-07-22** against
every path used by the web app and the live iOS app. **They are correct and
complete. No change is needed and none was made.**

`firestore.rules` in this repo is a verbatim copy of what is live, so the rules
now have a history and can be restored. That — not a security hole — was the
actual gap: they previously existed only inside the Firebase Console.

## Why they are fine

Every user's data lives under `users/<their uid>/…`, and each rule allows access
only when the signed-in user's id matches that path. Anything not explicitly
matched is denied by Firestore automatically. So:

- you can read and write only your own data;
- nobody else can read it, signed in or not;
- an unauthenticated request gets nothing.

Coverage check (all present):

| Path used by the apps | Covered by |
| --- | --- |
| `users/{uid}/folders/{id}` | its own rule |
| `users/{uid}/flashcardSets/{id}` | its own rule |
| `users/{uid}/readingItems/{id}` | its own rule |
| `users/{uid}/grammarReviewItems/{id}` | its own rule |
| `users/{uid}/grammarNoteTopics/{topicId}` | its own rule |
| `…/grammarNoteTopics/{topicId}/notes/{noteId}` | the `{document=**}` rule on topics |
| `…/notes/{noteId}/quizzes/{quizId}` | same `{document=**}` rule |

The Cloud Function in the iOS repo is a stateless Gemini proxy and never touches
Firestore.

`grammarNotes/**` and `grammarNoteQuizzes/**` appear in the rules but are not
written by current code — they look like an earlier, flat layout. They are
owner-scoped and harmless, and are left alone: removing rules for data that may
still exist would make that data unreachable.

## A simplification that was considered and rejected

Collapsing everything into one `match /users/{uid}/{document=**}` reads tidier
and would auto-cover future collections. It was **rejected**: it would also deny
the `users/{uid}` profile document, which the live rules allow. No code was found
that writes it — but "not found" is not "does not exist", and this project backs
a shipped iOS app with real users. Zero security gain, real regression risk.

## One thing to know when adding features

Because collections are enumerated one by one, **any new collection under
`users/{uid}/` is denied until a rule is added for it.** That fails closed (safe)
but shows up as a confusing "Missing or insufficient permissions" error. If you
add a Firestore collection, add a matching rule here and publish it.

## An honest caveat about card images

The app stores the `getDownloadURL()` result in `card.imageURL`. Those URLs carry
a Firebase download token that grants access to that one object **regardless of
any rule** — that is how Firebase is designed, and it is why images display in
`<img>` tags at all. Storage rules still stop anyone from browsing or guessing
other users' objects. Treat any image whose URL leaks as effectively public.

## Verification status

The rules were reviewed by reading, and cross-checked against every path in both
codebases. They were **not executed** here: the Firebase emulator requires
Java 11+ and this machine has Java 8, so it refuses to start.

The strongest available check is the Console's own **Rules Playground**
(Firestore Database → Rules tab), which runs a request against the live rules:

- `get` on `/users/<your uid>/folders/abc`, authenticated as your uid → **Allowed**
- the same path, authenticated as a different uid → **Denied**
- the same path, unauthenticated → **Denied**

Your uid is in **Authentication → Users → User UID**.

## If you ever do need to change them

1. Firebase Console → **wordaround-97f86** → **Firestore Database** → **Rules**.
2. **Copy the current text into a file first** — that is the undo.
3. Edit, watch for syntax errors (the editor flags them live), test in the
   Playground, then **Publish**. It takes effect immediately.
4. Open the web app *and* the iOS app and confirm data still loads.
5. To roll back: paste the saved copy and Publish again.

From the command line instead (needs the Firebase CLI and project access):

```bash
npx firebase-tools deploy --only firestore:rules --project wordaround-97f86
```

## Storage rules — still unreviewed

Only the web app uses Cloud Storage, for card images at
`users/{uid}/setImages/{setId}/{cardId}.jpg`. The live Storage rules have **not**
been captured or reviewed yet. `storage.rules` in this repo is a *proposal*, not
a copy of what is live — do not publish it without first comparing it to the
Console (**Storage → Rules**) the same way.
