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

/** Everything about a set except its cards — the part the edit screen owns. */
export interface SetInfoValues {
  title: string;
  description: string;
  privacy: 'Private' | 'Public';
  folderID: string | null;
  folderName: string | null;
  colorId: SetColorId;
  iconName: string;
}

export interface CreateSetDraft extends SetInfoValues {
  cards: DraftCard[];
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

/* Title and description only, so the edit screen — which never touches the
   cards — can reuse the same rules and the same error keys. */
export const validateSetInfo = (values: SetInfoValues): string | null => {
  const title = values.title.trim();
  const description = values.description.trim();

  if (title.length === 0) return 'createSet.error.emptyTitle';
  if (title.length > TITLE_MAX) return 'createSet.error.titleTooLong';
  if (description.length > DESC_MAX) return 'createSet.error.descTooLong';
  return null;
};

export const validateCreateSet = (draft: CreateSetDraft): ValidationResult => {
  const infoError = validateSetInfo(draft);
  if (infoError) return { errorKey: infoError, validCards: [] };

  const validCards = draft.cards.filter(
    (c) => c.word.trim().length > 0 && c.translation.trim().length > 0,
  );
  if (validCards.length === 0)
    return { errorKey: 'createSet.error.noValidCards', validCards: [] };

  if (!validCards.every((c) => c.example.trim().length <= EXAMPLE_MAX))
    return { errorKey: 'createSet.error.exampleTooLong', validCards: [] };

  return { errorKey: null, validCards };
};
