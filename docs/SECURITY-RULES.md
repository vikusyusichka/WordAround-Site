# Firebase security rules — what they are and how to apply them

## Why this matters

Security rules are the **only** thing stopping one user from reading another
user's flashcards, notes and texts. They are not a nice-to-have: without correct
rules, anyone who knows the project's public API key (which is visible in any
browser's dev tools — that is normal and by design) could read the whole
database.

Until now these rules existed **only inside the Firebase Console** and were not
in this repository, so nobody could review them, and a wrong click could not be
undone. `firestore.rules` and `storage.rules` now live here.

## Status — please read before trusting these

The rules in this repo were written after auditing **every** Firestore and
Storage path used by both the web app and the live iOS app.

**They have NOT been executed.** Running them requires the Firebase emulator,
which needs Java 11 or newer; this machine has Java 8, so the emulator refuses
to start. Do not assume they are proven — validate them as described below
before publishing.

## What the rules say, in plain words

- Every piece of data lives under `users/<your id>/…`.
- You can read and write **only** things under your own id. Nobody else can,
  signed in or not.
- Nothing outside that is reachable at all.
- Card images: only you can upload or browse them, uploads must be images under
  5 MB.

### One honest caveat about images

When the app shows a card image, it uses a Firebase "download URL" that contains
a secret token. **Anyone who has that exact URL can open the image without
signing in** — that is how Firebase works, and it is why images display at all.
The rules still prevent people from browsing or guessing other users' images.
Treat any image whose URL is shared as effectively public.

### Public sets are not actually public

Sets have a `privacy: 'public'` field, but no code in either app ever reads
another user's data, so the field currently does nothing. Sharing needs a real
feature and its own rules. **Do not loosen these rules to "make it work"** —
that would expose everyone's data.

## How to apply them (Firebase Console — recommended)

The Console checks the syntax as you type and lets you test rules before
publishing, which makes it the safest route.

1. Open the [Firebase Console](https://console.firebase.google.com/) and pick
   the **wordaround-97f86** project.
2. **Firestore Database → Rules** tab.
3. **Copy what is currently there into a text file first** — that is your undo.
4. Paste the contents of `firestore.rules`. The editor flags syntax errors
   immediately; if it complains, do not publish.
5. Use **Rules Playground** (in that same tab) to sanity-check, for example:
   - a signed-in user reading `users/<their own id>/folders/abc` → **allowed**
   - the same user reading `users/<someone else's id>/folders/abc` → **denied**
   - a signed-out request to anything → **denied**
6. Click **Publish**.
7. Repeat steps 2–6 for **Storage → Rules** with `storage.rules`.

Then open the app and confirm your own sets, folders and notes still load. If
anything breaks, paste the backup from step 3 back and publish — the change is
instant and fully reversible.

## Applying them from the command line (optional)

Requires the Firebase CLI and permission on the project:

```bash
npx firebase-tools login
```

```bash
npx firebase-tools deploy --only firestore:rules,storage:rules --project wordaround-97f86
```

## Running the rules against the emulator (needs Java 11+)

```bash
npx firebase-tools emulators:start --only firestore,storage --project demo-wa
```

## If you ever want to tighten them further

Two options were deliberately **not** taken, because both could lock out real
users of the shipped iOS app:

- **Requiring a verified email** — add `&& request.auth.token.email_verified`
  to `isOwner()`. This would block anyone who signed up but never confirmed
  their address, including existing accounts.
- **Validating document fields** (types, required keys) — the iOS and web
  writers differ in small ways, so a strict schema risks silently breaking the
  iOS app. Ownership is already enforced by the path, which is the part that
  matters for privacy.
