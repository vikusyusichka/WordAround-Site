/* Notes preferences — web port of GrammarNotesSettingsStore.swift. Same keys
   and same defaults as iOS (`grammarNotes.*`), persisted per device in
   localStorage the way iOS persists them in UserDefaults, so the settings
   screen, the quick sheets and the mistake recipe all read one source. */
import { create } from 'zustand';

import type { GrammarNoteType } from '@/lib/models';

export interface GrammarSettings {
  /** Jump into the full editor right after a quick note is saved. */
  opensEditorAfterQuickSave: boolean;
  /** Offer quiz blocks / quiz creation inside notes. */
  allowQuickQuizzes: boolean;
  /** Quick mistake: keep the wrong sentence as a quote block. */
  includeOriginalSentence: boolean;
  /** Quick mistake: keep the fixed sentence as an example block. */
  includeCorrectedSentence: boolean;
  /** Quick mistake: keep the explanation as a paragraph block. */
  createMistakeNotesWithExplanation: boolean;
  /** Save quick mistakes into the current topic instead of Common Mistakes. */
  groupMistakesByTopic: boolean;
  /** Essay flow: confirm before a grammar issue becomes a note. */
  askBeforeSavingMistakes: boolean;
  /** Essay flow: save every grammar issue without asking. */
  saveGrammarMistakesAutomatically: boolean;
  /** Warm tint on mistake cards + the mistake highlights row. */
  showsMistakeHighlights: boolean;
  /** Pinned notes stay at the top of a topic. */
  groupsPinnedNotesFirst: boolean;
  /** Denser note rows. */
  usesCompactCards: boolean;
  /** Contextual hints inside quick sheets and empty states. */
  showsHelperTips: boolean;
  /** Note type a new quick note starts with. */
  defaultNoteType: GrammarNoteType;
}

export const GRAMMAR_SETTINGS_DEFAULTS: GrammarSettings = {
  opensEditorAfterQuickSave: true,
  allowQuickQuizzes: true,
  includeOriginalSentence: true,
  includeCorrectedSentence: true,
  createMistakeNotesWithExplanation: true,
  groupMistakesByTopic: false,
  askBeforeSavingMistakes: false,
  saveGrammarMistakesAutomatically: false,
  showsMistakeHighlights: true,
  groupsPinnedNotesFirst: true,
  usesCompactCards: false,
  showsHelperTips: true,
  defaultNoteType: 'standard',
};

/** iOS UserDefaults keys — kept verbatim so the two stores stay comparable. */
const STORAGE_KEY: Record<keyof GrammarSettings, string> = {
  opensEditorAfterQuickSave: 'grammarNotes.opensEditorAfterQuickSave',
  allowQuickQuizzes: 'grammarNotes.allowQuickQuizzes',
  includeOriginalSentence: 'grammarNotes.includeOriginalSentence',
  includeCorrectedSentence: 'grammarNotes.includeCorrectedSentence',
  createMistakeNotesWithExplanation: 'grammarNotes.createMistakeNotesWithExplanation',
  groupMistakesByTopic: 'grammarNotes.groupMistakesByTopic',
  askBeforeSavingMistakes: 'grammarNotes.askBeforeSavingMistakes',
  saveGrammarMistakesAutomatically: 'grammarNotes.saveGrammarMistakesAutomatically',
  showsMistakeHighlights: 'grammarNotes.showsMistakeHighlights',
  groupsPinnedNotesFirst: 'grammarNotes.groupsPinnedNotesFirst',
  usesCompactCards: 'grammarNotes.usesCompactCards',
  showsHelperTips: 'grammarNotes.showsHelperTips',
  defaultNoteType: 'grammarNotes.defaultNoteType',
};

const NOTE_TYPES: GrammarNoteType[] = [
  'standard', 'mistake', 'rule', 'comparison', 'cheatSheet', 'exercise',
];

const readStored = (): GrammarSettings => {
  const next = { ...GRAMMAR_SETTINGS_DEFAULTS };
  try {
    for (const key of Object.keys(STORAGE_KEY) as (keyof GrammarSettings)[]) {
      const raw = localStorage.getItem(STORAGE_KEY[key]);
      if (raw === null) continue;
      if (key === 'defaultNoteType') {
        if (NOTE_TYPES.includes(raw as GrammarNoteType)) next.defaultNoteType = raw as GrammarNoteType;
      } else {
        next[key] = raw === 'true';
      }
    }
  } catch {
    /* private mode / storage disabled — defaults are fine */
  }
  return next;
};

const persist = <K extends keyof GrammarSettings>(key: K, value: GrammarSettings[K]) => {
  try {
    localStorage.setItem(STORAGE_KEY[key], String(value));
  } catch {
    /* best-effort */
  }
};

interface GrammarSettingsState extends GrammarSettings {
  set: <K extends keyof GrammarSettings>(key: K, value: GrammarSettings[K]) => void;
  toggle: (key: keyof Omit<GrammarSettings, 'defaultNoteType'>) => void;
  resetAll: () => void;
}

export const useGrammarSettings = create<GrammarSettingsState>((set, get) => ({
  ...readStored(),
  set: (key, value) => {
    persist(key, value);
    set({ [key]: value } as Pick<GrammarSettings, typeof key>);
  },
  toggle: (key) => {
    const next = !get()[key];
    persist(key, next);
    set({ [key]: next } as Pick<GrammarSettings, typeof key>);
  },
  resetAll: () => {
    for (const key of Object.keys(STORAGE_KEY) as (keyof GrammarSettings)[]) {
      persist(key, GRAMMAR_SETTINGS_DEFAULTS[key]);
    }
    set({ ...GRAMMAR_SETTINGS_DEFAULTS });
  },
}));

/** Snapshot for non-React callers (services building a mistake note). */
export const grammarSettingsSnapshot = (): GrammarSettings => {
  const state = useGrammarSettings.getState();
  return {
    opensEditorAfterQuickSave: state.opensEditorAfterQuickSave,
    allowQuickQuizzes: state.allowQuickQuizzes,
    includeOriginalSentence: state.includeOriginalSentence,
    includeCorrectedSentence: state.includeCorrectedSentence,
    createMistakeNotesWithExplanation: state.createMistakeNotesWithExplanation,
    groupMistakesByTopic: state.groupMistakesByTopic,
    askBeforeSavingMistakes: state.askBeforeSavingMistakes,
    saveGrammarMistakesAutomatically: state.saveGrammarMistakesAutomatically,
    showsMistakeHighlights: state.showsMistakeHighlights,
    groupsPinnedNotesFirst: state.groupsPinnedNotesFirst,
    usesCompactCards: state.usesCompactCards,
    showsHelperTips: state.showsHelperTips,
    defaultNoteType: state.defaultNoteType,
  };
};
