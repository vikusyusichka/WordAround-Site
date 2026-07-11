/* Create-set draft types + validation — ports CreateSet.swift draft +
   CreateSetValidator.swift. Returns an i18next error key (or null) plus the
   filtered valid cards used to build the set. */
import type { SetColorId } from '@/lib/setColors';

export interface DraftCard {
  id: string;
  word: string;
  translation: string;
  example: string;
  /** Local file chosen but not yet uploaded. */
  imageFile: File | null;
  /** Already-uploaded URL (after save). */
  imageURL: string | null;
}

export interface CreateSetDraft {
  title: string;
  description: string;
  privacy: 'Private' | 'Public';
  cards: DraftCard[];
  folderID: string | null;
  folderName: string | null;
  colorId: SetColorId;
  iconName: string;
}

export const TITLE_MAX = 150;
export const DESC_MAX = 200;
export const EXAMPLE_MAX = 150;

export const emptyCard = (): DraftCard => ({
  id: crypto.randomUUID(),
  word: '',
  translation: '',
  example: '',
  imageFile: null,
  imageURL: null,
});

export const emptyDraft = (): CreateSetDraft => ({
  title: '',
  description: '',
  privacy: 'Private',
  cards: [emptyCard()],
  folderID: null,
  folderName: null,
  colorId: 'red',
  iconName: 'rectangle.stack.fill',
});

export interface ValidationResult {
  errorKey: string | null;
  validCards: DraftCard[];
}

export const validateCreateSet = (draft: CreateSetDraft): ValidationResult => {
  const title = draft.title.trim();
  const description = draft.description.trim();

  if (title.length === 0) return { errorKey: 'createSet.error.emptyTitle', validCards: [] };
  if (title.length > TITLE_MAX) return { errorKey: 'createSet.error.titleTooLong', validCards: [] };
  if (description.length > DESC_MAX)
    return { errorKey: 'createSet.error.descTooLong', validCards: [] };

  const validCards = draft.cards.filter(
    (c) => c.word.trim().length > 0 && c.translation.trim().length > 0,
  );
  if (validCards.length === 0)
    return { errorKey: 'createSet.error.noValidCards', validCards: [] };

  if (!validCards.every((c) => c.example.trim().length <= EXAMPLE_MAX))
    return { errorKey: 'createSet.error.exampleTooLong', validCards: [] };

  return { errorKey: null, validCards };
};
