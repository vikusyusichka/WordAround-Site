/* Pure study-session reducer — web port of FlashcardSetDetailViewModel.swift.
   Study progress (studied/mastered/learning) is session-only; card edits mutate
   `cards` (persisted by the caller). Kept pure so it's fully unit-testable. */
import type { Flashcard } from '@/lib/models';

export type CardFilter = 'all' | 'studied' | 'remaining' | 'mastered';

export const CARD_FILTERS: CardFilter[] = ['all', 'studied', 'remaining', 'mastered'];

export interface StudyState {
  cards: Flashcard[];
  currentCardIndex: number;
  isShowingTranslation: boolean;
  trackProgress: boolean;
  selectedFilter: CardFilter;
  isShowingRoundFinish: boolean;
  studiedCardIDs: Set<string>;
  masteredCardIDs: Set<string>;
  learningCardIDs: Set<string>;
  activeRoundCardIDs: string[];
}

export type StudyAction =
  | { type: 'FLIP' }
  | { type: 'KNOWN' }
  | { type: 'UNKNOWN' }
  | { type: 'GO_NEXT' }
  | { type: 'GO_PREV' }
  | { type: 'SELECT_FILTER'; filter: CardFilter }
  | { type: 'TOGGLE_MASTERED'; cardId: string }
  | { type: 'SHUFFLE' }
  | { type: 'REPEAT_UNKNOWN' }
  | { type: 'RESTART' }
  | { type: 'SET_TRACK_PROGRESS'; value: boolean }
  | { type: 'ADD_CARD'; card: Flashcard }
  | { type: 'SAVE_EDIT'; card: Flashcard }
  | { type: 'DELETE_CARD'; cardId: string };

export const initialStudyState = (cards: Flashcard[]): StudyState => ({
  cards,
  currentCardIndex: 0,
  isShowingTranslation: false,
  trackProgress: true,
  selectedFilter: 'all',
  isShowingRoundFinish: false,
  studiedCardIDs: new Set(),
  masteredCardIDs: new Set(),
  learningCardIDs: new Set(),
  activeRoundCardIDs: cards.map((c) => c.id),
});

const withAdd = (set: Set<string>, id: string) => new Set(set).add(id);
const withDelete = (set: Set<string>, id: string) => {
  const next = new Set(set);
  next.delete(id);
  return next;
};

// MARK: - Selectors

export const roundCards = (s: StudyState): Flashcard[] =>
  s.activeRoundCardIDs
    .map((id) => s.cards.find((c) => c.id === id))
    .filter((c): c is Flashcard => Boolean(c));

export const activeCard = (s: StudyState): Flashcard | null => {
  const rc = roundCards(s);
  if (rc.length === 0) return null;
  return rc[Math.min(s.currentCardIndex, rc.length - 1)];
};

export const counts = (s: StudyState) => ({
  all: s.cards.length,
  studied: s.studiedCardIDs.size,
  remaining: Math.max(s.cards.length - s.studiedCardIDs.size, 0),
  mastered: s.masteredCardIDs.size,
});

export const countForFilter = (s: StudyState, f: CardFilter): number => counts(s)[f];

export const filteredCards = (s: StudyState): Flashcard[] => {
  switch (s.selectedFilter) {
    case 'studied':
      return s.cards.filter((c) => s.studiedCardIDs.has(c.id));
    case 'remaining':
      return s.cards.filter((c) => !s.studiedCardIDs.has(c.id));
    case 'mastered':
      return s.cards.filter((c) => s.masteredCardIDs.has(c.id));
    default:
      return s.cards;
  }
};

export const roundStats = (s: StudyState) => {
  const rc = roundCards(s);
  const total = rc.length;
  const known = rc.filter((c) => s.studiedCardIDs.has(c.id)).length;
  const learning = rc.filter((c) => s.learningCardIDs.has(c.id)).length;
  const answered = Math.min(known + learning, total);
  return { total, known, learning, answered, progress: total > 0 ? answered / total : 0 };
};

// MARK: - Advance helper

const advanced = (s: StudyState): Partial<StudyState> => {
  const rc = roundCards(s);
  if (rc.length === 0) return { currentCardIndex: 0, isShowingRoundFinish: s.trackProgress };
  if (s.currentCardIndex < rc.length - 1) return { currentCardIndex: s.currentCardIndex + 1 };
  return s.trackProgress ? { isShowingRoundFinish: true } : {};
};

const clampIndex = (s: StudyState, cards: Flashcard[], activeRound: string[]): number => {
  const roundLen = activeRound.filter((id) => cards.some((c) => c.id === id)).length;
  return Math.min(s.currentCardIndex, Math.max(roundLen - 1, 0));
};

// MARK: - Reducer

export const studyReducer = (s: StudyState, action: StudyAction): StudyState => {
  switch (action.type) {
    case 'FLIP':
      return { ...s, isShowingTranslation: !s.isShowingTranslation };

    case 'KNOWN': {
      const card = activeCard(s);
      if (!card) return s;
      const studied = s.trackProgress ? withAdd(s.studiedCardIDs, card.id) : s.studiedCardIDs;
      const learning = s.trackProgress ? withDelete(s.learningCardIDs, card.id) : s.learningCardIDs;
      return {
        ...s,
        studiedCardIDs: studied,
        learningCardIDs: learning,
        isShowingTranslation: false,
        ...advanced(s),
      };
    }

    case 'UNKNOWN': {
      const card = activeCard(s);
      if (!card) return s;
      const learning = s.trackProgress ? withAdd(s.learningCardIDs, card.id) : s.learningCardIDs;
      const studied = s.trackProgress ? withDelete(s.studiedCardIDs, card.id) : s.studiedCardIDs;
      const mastered = s.trackProgress ? withDelete(s.masteredCardIDs, card.id) : s.masteredCardIDs;
      return {
        ...s,
        learningCardIDs: learning,
        studiedCardIDs: studied,
        masteredCardIDs: mastered,
        isShowingTranslation: false,
        ...advanced(s),
      };
    }

    case 'GO_NEXT': {
      const rc = roundCards(s);
      if (s.currentCardIndex >= rc.length - 1) return s;
      const card = activeCard(s);
      const studied = s.trackProgress && card ? withAdd(s.studiedCardIDs, card.id) : s.studiedCardIDs;
      const learning = s.trackProgress && card ? withDelete(s.learningCardIDs, card.id) : s.learningCardIDs;
      return {
        ...s,
        studiedCardIDs: studied,
        learningCardIDs: learning,
        currentCardIndex: s.currentCardIndex + 1,
        isShowingTranslation: false,
      };
    }

    case 'GO_PREV':
      if (s.currentCardIndex <= 0) return s;
      return { ...s, currentCardIndex: s.currentCardIndex - 1, isShowingTranslation: false };

    case 'SELECT_FILTER':
      return { ...s, selectedFilter: action.filter, currentCardIndex: 0, isShowingTranslation: false };

    case 'TOGGLE_MASTERED': {
      const { cardId } = action;
      if (s.masteredCardIDs.has(cardId)) {
        return { ...s, masteredCardIDs: withDelete(s.masteredCardIDs, cardId) };
      }
      return {
        ...s,
        masteredCardIDs: withAdd(s.masteredCardIDs, cardId),
        studiedCardIDs: withAdd(s.studiedCardIDs, cardId),
        learningCardIDs: withDelete(s.learningCardIDs, cardId),
      };
    }

    case 'SHUFFLE': {
      const shuffled = [...s.cards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return {
        ...s,
        cards: shuffled,
        activeRoundCardIDs: shuffled.map((c) => c.id),
        studiedCardIDs: new Set(),
        masteredCardIDs: new Set(),
        learningCardIDs: new Set(),
        currentCardIndex: 0,
        isShowingTranslation: false,
        isShowingRoundFinish: false,
      };
    }

    case 'REPEAT_UNKNOWN': {
      const unknownIDs = roundCards(s)
        .filter((c) => s.learningCardIDs.has(c.id))
        .map((c) => c.id);
      const round = unknownIDs.length > 0 ? unknownIDs : s.cards.map((c) => c.id);
      const roundSet = new Set(round);
      const strip = (set: Set<string>) => new Set([...set].filter((id) => !roundSet.has(id)));
      return {
        ...s,
        activeRoundCardIDs: round,
        learningCardIDs: strip(s.learningCardIDs),
        studiedCardIDs: strip(s.studiedCardIDs),
        masteredCardIDs: strip(s.masteredCardIDs),
        currentCardIndex: 0,
        isShowingTranslation: false,
        isShowingRoundFinish: false,
      };
    }

    case 'RESTART':
      return {
        ...s,
        studiedCardIDs: new Set(),
        masteredCardIDs: new Set(),
        learningCardIDs: new Set(),
        activeRoundCardIDs: s.cards.map((c) => c.id),
        currentCardIndex: 0,
        isShowingTranslation: false,
        isShowingRoundFinish: false,
      };

    case 'SET_TRACK_PROGRESS':
      return { ...s, trackProgress: action.value };

    case 'ADD_CARD': {
      const cards = [...s.cards, action.card];
      return {
        ...s,
        cards,
        activeRoundCardIDs: [...s.activeRoundCardIDs, action.card.id],
        currentCardIndex: s.cards.length === 0 ? 0 : s.currentCardIndex,
      };
    }

    case 'SAVE_EDIT':
      return {
        ...s,
        cards: s.cards.map((c) => (c.id === action.card.id ? action.card : c)),
      };

    case 'DELETE_CARD': {
      const { cardId } = action;
      const cards = s.cards.filter((c) => c.id !== cardId);
      const activeRound = s.activeRoundCardIDs.filter((id) => id !== cardId);
      return {
        ...s,
        cards,
        activeRoundCardIDs: activeRound,
        studiedCardIDs: withDelete(s.studiedCardIDs, cardId),
        masteredCardIDs: withDelete(s.masteredCardIDs, cardId),
        learningCardIDs: withDelete(s.learningCardIDs, cardId),
        currentCardIndex: clampIndex(s, cards, activeRound),
      };
    }

    default:
      return s;
  }
};
