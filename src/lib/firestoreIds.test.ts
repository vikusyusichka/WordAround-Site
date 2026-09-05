/* Where an entity's id comes from.

   Every parser used to take the id from a stored `id` field inside the
   document. A Mistakes topic whose document had lost that field therefore
   parsed as `id: ''`, and the next step — `users/{uid}/grammarNoteTopics//notes`
   — was an invalid collection path, so saving a quick mistake failed with
   Firestore's `invalid-argument` and no explanation.

   The document id cannot be missing, so it wins. The field stays as a
   fallback for anything that carries it. */
import { describe, expect, it } from 'vitest';

import { topicFromFirestore } from './grammarTopicService';
import { noteFromFirestore } from './grammarNoteService';
import { quizFromFirestore } from './grammarQuizService';
import { reviewItemFromFirestore } from './grammarReviewService';
import { readingItemFromFirestore } from './readingStorageService';

const PARSERS = {
  topic: topicFromFirestore,
  note: noteFromFirestore,
  quiz: quizFromFirestore,
  reviewItem: reviewItemFromFirestore,
  readingItem: readingItemFromFirestore,
} as const;

describe('entity ids come from the document', () => {
  for (const [name, parse] of Object.entries(PARSERS)) {
    describe(name, () => {
      it('uses the document id when the field is missing', () => {
        expect(parse({}, 'doc-id').id).toBe('doc-id');
      });

      it('uses the document id when the field is an empty string', () => {
        expect(parse({ id: '' }, 'doc-id').id).toBe('doc-id');
      });

      /* The document id is authoritative: it is the one the write used, so a
         stale field must never win a disagreement. */
      it('prefers the document id over a conflicting field', () => {
        expect(parse({ id: 'stale' }, 'doc-id').id).toBe('doc-id');
      });

      it('falls back to the field when no document id is passed', () => {
        expect(parse({ id: 'from-field' }).id).toBe('from-field');
      });

      it('never yields an empty id when the document id is known', () => {
        expect(parse({}, 'doc-id').id).not.toBe('');
      });
    });
  }
});
