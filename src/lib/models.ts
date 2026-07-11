/* Firestore domain models (shared with the iOS app). Timestamps are stored as
   Firestore Timestamps; in-app we carry `createdAt`/`updatedAt` as epoch millis
   (converted at the service boundary — see firestore.ts / *Service.ts). */

export interface Folder {
  id: string;
  ownerUID: string;
  title: string;
  description: string;
  colorHex: string;
  createdAt: number;
  updatedAt: number;
}

/* --- Flashcard sets (used from slice 3B; defined here so the model lives in
   one place). SetIconType mirrors the iOS enum encoded as { type, value }. --- */

export type SetIconType =
  | { type: 'systemName'; value: string }
  | { type: 'emoji'; value: string }
  | { type: 'customImageURL'; value: string };

export interface Flashcard {
  id: string;
  word: string;
  translation: string;
  example: string;
  imageURL?: string;
}

export interface FlashcardSet {
  id: string;
  ownerUID: string;
  ownerEmail: string;
  title: string;
  description: string;
  privacy: string;
  folderID?: string | null;
  folderName?: string | null;
  colorHex: string;
  icon: SetIconType;
  cards: Flashcard[];
  createdAt: number;
  updatedAt: number;
}
