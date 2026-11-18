/* Exam prep — the data model every exam is described in.

   One engine runs every exam: IELTS, DELE, TOEFL, DELF… are not separate
   features but `ExamSpec` values. Adding an exam means adding a spec file
   under ./specs (plus its tests), never a new screen. Anything an exam does
   that this model cannot express is a reason to extend the model, not to
   special-case the exam in UI code.

   Spec text (titles, task descriptions, rubric descriptors) is English on
   purpose: it feeds AI prompts, which are always English-instruction (same
   rule as ESSAY_LANGUAGES). User-facing copy goes through i18n. */

export type ExamSkill = 'reading' | 'listening' | 'writing' | 'speaking';

/** Question formats an objective (auto-marked) task may mix. */
export type ObjectiveQuestionType =
  | 'multipleChoice'
  | 'trueFalseNotGiven'
  | 'matching'
  | 'gapFill'
  | 'sentenceCompletion'
  | 'formCompletion'
  | 'ordering';

export type WritingFormat = 'essay' | 'letter' | 'chartReport' | 'article' | 'review';

export type SpeakingFormat =
  | 'interview'
  | 'longTurn'
  | 'discussion'
  | 'pictureDescription'
  | 'roleplay';

/** One criterion of an examiner rubric (e.g. IELTS "Lexical Resource"). */
export interface RubricCriterion {
  id: string;
  name: string;
  /** What the examiner looks for — goes into the scoring prompt verbatim. */
  descriptor: string;
}

interface TaskBase {
  id: string;
  title: string;
  /** What the candidate meets in this task — drives AI generation. */
  description: string;
}

export interface ObjectiveTaskSpec extends TaskBase {
  kind: 'objective';
  /** Number of marked items (one point each). */
  items: number;
  questionTypes: ObjectiveQuestionType[];
  /** Listening only: how many times the recording plays. */
  plays?: 1 | 2;
  /** Rough length of the text or recording script, in words — guides generation. */
  stimulusWords: number;
}

export interface WritingTaskSpec extends TaskBase {
  kind: 'writing';
  format: WritingFormat;
  words: { min: number; max?: number };
  /** Suggested share of the section time; the section clock is what binds. */
  suggestedMinutes?: number;
  /** Relative weight inside the section (IELTS Task 2 counts double). */
  weight: number;
  criteria: RubricCriterion[];
}

export interface SpeakingTaskSpec extends TaskBase {
  kind: 'speaking';
  format: SpeakingFormat;
  /** Prep time for this task alone; section-wide prep lives on the section. */
  prepSeconds?: number;
  speakSeconds: number;
  weight: number;
  criteria: RubricCriterion[];
}

export type TaskSpec = ObjectiveTaskSpec | WritingTaskSpec | SpeakingTaskSpec;

/** One row of a raw → score table: `minRaw` correct answers or more earns `score`. */
export interface ConversionRow {
  minRaw: number;
  score: number;
}

/* How a section turns answers into the number the exam reports for it. */
export type SectionScoring =
  /** Raw correct answers → band via a published (or estimated) table. */
  | { kind: 'objectiveTable'; table: ConversionRow[] }
  /** Raw correct answers scaled proportionally onto `max` points. */
  | { kind: 'objectiveScaled'; max: number }
  /** Rubric criteria rated on 0..criterionMax; weighted mean, rounded to a half band. */
  | { kind: 'rubricBand'; criterionMax: number }
  /** Rubric criteria rated on 0..criterionMax; weighted share scaled onto `max` points. */
  | { kind: 'rubricScaled'; criterionMax: number; max: number };

export interface SectionSpec {
  id: string;
  skill: ExamSkill;
  title: string;
  minutes: number;
  /** Prep time before the section starts (DELE orals prepare tasks 1–2 together). */
  prepMinutes?: number;
  tasks: TaskSpec[];
  scoring: SectionScoring;
}

export interface ScoreGroup {
  id: string;
  title: string;
  sectionIds: string[];
  max: number;
  passMin: number;
}

/* How section scores combine into the exam's result. */
export type OverallScoring =
  /** Mean of section bands, rounded to the nearest half band (IELTS). */
  | { kind: 'bandMean'; max: number }
  /** Sections sum into groups; each group and the total must pass (DELE). */
  | { kind: 'groups'; groups: ScoreGroup[]; passTotal: number; max: number };

export interface ExamVariant {
  id: string;
  title: string;
  /** CEFR level the variant certifies, when the exam is level-specific. */
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  /** How hard generated material should be, for exams with no single level. */
  difficultyHint?: string;
  sections: SectionSpec[];
  overall: OverallScoring;
}

export interface ExamSpec {
  id: string;
  name: string;
  fullName: string;
  /** Id from ESSAY_LANGUAGES — the language the exam tests. */
  languageId: string;
  /** Who runs the real exam — shown in the "not affiliated" disclaimer. */
  owner: string;
  officialUrl: string;
  /** True when conversion tables are estimates, not published by the owner.
      The UI must then call every score an estimate. */
  conversionApproximate: boolean;
  variants: ExamVariant[];
}
