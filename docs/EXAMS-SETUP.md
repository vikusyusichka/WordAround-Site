# Exams section — how it works and what to look after

The Exams section (IELTS, DELE, …) uses **no AI**. For each exam it shows:

1. **Official practice tests** — the free tests the exam owner publishes on
   its own site (ielts.org, the Instituto Cervantes), with skill, year and
   source. They open on the official site; WordAround only links to them.
2. **Enter your result** — after doing one, the learner types what they got
   (correct answers for reading/listening, the score for writing/speaking) and
   the exam's own rules turn it into the band or the pass/fail result.
3. **Goal and progress** — target score, exam date, and the history of
   entered results.
4. **The exam format** — sections, timings, tasks (`src/lib/exams/specs/`).

## Where the list of official tests comes from

`scripts/update-official-tests.mjs` reads the owners' pages, keeps only links
on their own domains that still open (a PDF must really be a PDF), and writes
`src/lib/exams/officialTests.json`, which the site shows.

- **Automatically:** the GitHub Action `.github/workflows/official-tests.yml`
  runs it every Monday and commits the file when something changed; that
  commit redeploys the site.
- **By hand:** `npm run exams:update`, or on GitHub → Actions →
  "Official practice tests" → **Run workflow**.

If a site cannot be read (down, or its layout changed), the tests found for
it last time are kept and the run reports it, so the list never empties by
accident. If a layout change makes a source find nothing for weeks, the
parser in the script needs updating (`parseIeltsPage` / `parseCervantesPage`,
covered by `scripts/update-official-tests.test.mjs`).

### State on 2026-11-19

- **IELTS:** 34 items from ielts.org — full practice tests in the official
  test player (Listening, Academic Reading, Writing) and one sample task per
  question type, with answer keys and transcripts. Only the Speaking tasks
  carry a year (2023); IELTS does not date the others.
- **DELE:** 0. The Instituto Cervantes is rebuilding its exams website: the
  old model-exam pages redirect to cervantes.org and the old PDF links no
  longer open. The page tells learners so and links to cervantes.org; the
  weekly run will pick the models up when they are republished.

## Adding an exam

1. A spec in `src/lib/exams/specs/` (format, timings, scoring) + register it
   in `registry.ts`; `registry.test.ts` checks it.
2. Its official sample page in `SOURCES` in the update script, with a parser
   if the layout differs, and a test with a cut-down copy of the page.
3. `npm run exams:update`.

## Firestore

`users/{uid}/examAttempts` (entered results) and `users/{uid}/examGoals`
must be allowed in the published rules — see `firestore.rules`. The
`entitlements/{uid}` rule is a leftover of the dropped Premium plan; it only
allows the owner to read and nobody to write, so it is harmless.
