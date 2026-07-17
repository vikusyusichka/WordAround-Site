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

/* --- Grammar notes (Phase 4D) — subset of the iOS GrammarNotes models.
   Persisted under users/{uid}/grammarNoteTopics/{topicId}/notes/{noteId}. --- */

export type GrammarNoteType =
  | 'standard'
  | 'mistake'
  | 'rule'
  | 'comparison'
  | 'cheatSheet'
  | 'exercise';

export type GrammarBlockType =
  | 'heading'
  | 'paragraph'
  | 'bulletList'
  | 'rule'
  | 'example'
  | 'warning'
  | 'quote'
  | 'divider';

export interface GrammarNoteBlock {
  id: string;
  type: GrammarBlockType;
  text: string;
  /** example → translation/detail; rule → sub-detail. */
  secondaryText?: string;
  /** bulletList entries. */
  items: string[];
  order: number;
}

export interface GrammarNoteTopic {
  id: string;
  ownerUID: string;
  title: string;
  description: string;
  icon: string;
  colorHex: string;
  notesCount: number;
  isPinned: boolean;
  isMistakesTopic: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface GrammarNote {
  id: string;
  ownerUID: string;
  topicId: string;
  title: string;
  noteType: GrammarNoteType;
  /** Derived from blocks on save — shown in the note-list row. */
  previewText: string;
  contentBlocks: GrammarNoteBlock[];
  /** True while the note has ≥1 saved quiz (kept in sync by grammarQuizService). */
  hasQuiz?: boolean;
  /** Dedup key for notes saved from grammar issues (4D5) — normalized
      pipe-join of the mistake parts; absent on regular notes. */
  savedIssueKey?: string;
  createdAt: number;
  updatedAt: number;
}

/* --- Grammar quizzes (Phase 4D2) — port of the iOS GrammarNoteQuiz models.
   Persisted under users/{uid}/grammarNoteTopics/{topicId}/notes/{noteId}/quizzes. --- */

export type GrammarQuizQuestionType =
  | 'multipleChoice'
  | 'trueFalse'
  | 'fillGap'
  | 'shortAnswer';

export interface GrammarQuizQuestion {
  id: string;
  type: GrammarQuizQuestionType;
  questionText: string;
  /** multipleChoice/trueFalse options; empty for fillGap/shortAnswer. */
  options: string[];
  correctAnswer: string;
  explanation?: string;
  order: number;
}

export interface GrammarNoteQuiz {
  id: string;
  ownerUID: string;
  topicId: string;
  noteId: string;
  title: string;
  sourceNoteTitle: string;
  questions: GrammarQuizQuestion[];
  createdAt: number;
  updatedAt: number;
}

/* --- Grammar spaced review (Phase 4D3) — port of the iOS GrammarReviewItem.
   Persisted under users/{uid}/grammarReviewItems/{id} with deterministic ids
   (see reviewItemId* in grammarReview.ts). --- */

export type GrammarReviewSourceType = 'note' | 'mistake' | 'quiz';

/** Stored for iOS parity; the queue builder never reads it. */
export type GrammarReviewPriority = 'low' | 'normal' | 'high';

export type GrammarReviewResult = 'forgot' | 'hard' | 'good' | 'easy';

export interface GrammarReviewItem {
  id: string;
  ownerUID: string;
  sourceType: GrammarReviewSourceType;
  topicId: string;
  noteId?: string;
  quizId?: string;
  title: string;
  previewText: string;
  priority: GrammarReviewPriority;
  dueAt: number;
  lastReviewedAt?: number;
  nextReviewAt?: number;
  reviewCount: number;
  correctStreak: number;
  incorrectStreak: number;
  mistakeCount: number;
  createdAt: number;
  updatedAt: number;
}
