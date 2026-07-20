/* Save a translated word into a flashcard set — web port of
   ListeningSetSavingService. The only Firestore-backed path in Listening. */
import { createSet, fetchSets, updateSetCards } from '@/lib/setService';
import type { Flashcard, FlashcardSet } from '@/lib/models';

export interface ListeningWordTranslation {
  originalText: string;
  translatedText: string;
  contextSentence?: string;
}

/** iOS Flashcard.fromListening. */
export const cardFromListening = (
  translation: ListeningWordTranslation,
  videoTitle: string,
): Flashcard => ({
  id: crypto.randomUUID(),
  word: translation.originalText,
  translation: translation.translatedText,
  example: translation.contextSentence ?? `From: ${videoTitle}`,
});

export const addCardToSet = async (
  uid: string,
  sets: FlashcardSet[],
  setId: string,
  card: Flashcard,
): Promise<void> => {
  const target = sets.find((s) => s.id === setId);
  if (!target) throw new Error('Set not found');
  await updateSetCards(uid, setId, [...target.cards, card]);
};

/** iOS createSet(title, description, color, firstCard) — icon film.stack. */
export const createSetWithCard = async (params: {
  uid: string;
  email: string;
  title: string;
  description: string;
  colorHex: string;
  firstCard: Flashcard;
}): Promise<FlashcardSet> => {
  const now = Date.now();
  const set: FlashcardSet = {
    id: crypto.randomUUID(),
    ownerUID: params.uid,
    ownerEmail: params.email,
    title: params.title.trim(),
    description: params.description.trim(),
    privacy: 'private',
    folderID: null,
    folderName: null,
    colorHex: params.colorHex,
    icon: { type: 'systemName', value: 'film.stack' },
    cards: [params.firstCard],
    createdAt: now,
    updatedAt: now,
  };
  await createSet(set);
  return set;
};

export { fetchSets };
