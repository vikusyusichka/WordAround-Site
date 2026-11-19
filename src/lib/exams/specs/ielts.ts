/* IELTS — Academic and General Training.

   Format: Listening 30 min / 40 items (4 parts, played once), Reading 60 min /
   40 items (3 passages), Writing 60 min (Task 1 ≥150 words, Task 2 ≥250 words
   and worth double), Speaking 11–14 min in 3 parts. Every section is reported
   as a band 0–9 in half bands; the overall band is their mean, rounded to the
   nearest half band.

   The raw → band tables are NOT published in full by IELTS and shift a little
   between test versions; these are the widely used estimates. Hence
   `conversionApproximate`. */

import type { ConversionRow, ExamVariant, ExamSpec, RubricCriterion, SectionSpec } from '../types';

export const IELTS_LISTENING_TABLE: ConversionRow[] = [
  { minRaw: 39, score: 9 },
  { minRaw: 37, score: 8.5 },
  { minRaw: 35, score: 8 },
  { minRaw: 32, score: 7.5 },
  { minRaw: 30, score: 7 },
  { minRaw: 26, score: 6.5 },
  { minRaw: 23, score: 6 },
  { minRaw: 18, score: 5.5 },
  { minRaw: 16, score: 5 },
  { minRaw: 13, score: 4.5 },
  { minRaw: 10, score: 4 },
  { minRaw: 8, score: 3.5 },
  { minRaw: 6, score: 3 },
  { minRaw: 4, score: 2.5 },
  { minRaw: 2, score: 2 },
  { minRaw: 1, score: 1 },
  { minRaw: 0, score: 0 },
];

export const IELTS_ACADEMIC_READING_TABLE: ConversionRow[] = [
  { minRaw: 39, score: 9 },
  { minRaw: 37, score: 8.5 },
  { minRaw: 35, score: 8 },
  { minRaw: 33, score: 7.5 },
  { minRaw: 30, score: 7 },
  { minRaw: 27, score: 6.5 },
  { minRaw: 23, score: 6 },
  { minRaw: 19, score: 5.5 },
  { minRaw: 15, score: 5 },
  { minRaw: 13, score: 4.5 },
  { minRaw: 10, score: 4 },
  { minRaw: 8, score: 3.5 },
  { minRaw: 6, score: 3 },
  { minRaw: 4, score: 2.5 },
  { minRaw: 2, score: 2 },
  { minRaw: 1, score: 1 },
  { minRaw: 0, score: 0 },
];

/* General Training texts are easier, so each band needs more correct answers. */
export const IELTS_GENERAL_READING_TABLE: ConversionRow[] = [
  { minRaw: 40, score: 9 },
  { minRaw: 39, score: 8.5 },
  { minRaw: 37, score: 8 },
  { minRaw: 36, score: 7.5 },
  { minRaw: 34, score: 7 },
  { minRaw: 32, score: 6.5 },
  { minRaw: 30, score: 6 },
  { minRaw: 27, score: 5.5 },
  { minRaw: 23, score: 5 },
  { minRaw: 19, score: 4.5 },
  { minRaw: 15, score: 4 },
  { minRaw: 12, score: 3.5 },
  { minRaw: 9, score: 3 },
  { minRaw: 6, score: 2.5 },
  { minRaw: 3, score: 2 },
  { minRaw: 1, score: 1 },
  { minRaw: 0, score: 0 },
];

const COHERENCE: RubricCriterion = {
  id: 'coherenceCohesion',
  name: 'Coherence and Cohesion',
  descriptor:
    'Logical organisation and progression; paragraphing; range and accuracy of cohesive devices and referencing.',
};
const LEXICAL: RubricCriterion = {
  id: 'lexicalResource',
  name: 'Lexical Resource',
  descriptor:
    'Range, precision and naturalness of vocabulary, including less common items and collocation; spelling and word formation.',
};
const GRAMMAR: RubricCriterion = {
  id: 'grammaticalRange',
  name: 'Grammatical Range and Accuracy',
  descriptor:
    'Range of structures, including complex sentences; frequency and impact of grammatical and punctuation errors.',
};

const TASK1_ACHIEVEMENT: RubricCriterion = {
  id: 'taskAchievement',
  name: 'Task Achievement',
  descriptor:
    'Covers the requirements of the task, presents a clear overview, and highlights and supports key features accurately.',
};
const TASK2_RESPONSE: RubricCriterion = {
  id: 'taskResponse',
  name: 'Task Response',
  descriptor:
    'Addresses all parts of the prompt, presents a clear position throughout, and extends and supports main ideas.',
};

const SPEAKING_CRITERIA: RubricCriterion[] = [
  {
    id: 'fluencyCoherence',
    name: 'Fluency and Coherence',
    descriptor:
      'Speaks at length without noticeable effort or loss of coherence; hesitation is content-related; uses discourse markers.',
  },
  LEXICAL,
  GRAMMAR,
  {
    id: 'pronunciation',
    name: 'Pronunciation',
    descriptor:
      'Intelligibility; control of features such as stress, rhythm, intonation and chunking. Judged from the transcript and timing only, so rate conservatively.',
  },
];

const LISTENING: SectionSpec = {
  id: 'listening',
  skill: 'listening',
  title: 'Listening',
  minutes: 30,
  scoring: { kind: 'objectiveTable', table: IELTS_LISTENING_TABLE },
  tasks: [
    {
      id: 'part1',
      kind: 'objective',
      title: 'Part 1',
      description: 'A conversation between two people in an everyday social context (e.g. booking, enquiry).',
      items: 10,
      questionTypes: ['formCompletion', 'sentenceCompletion', 'multipleChoice'],
      plays: 1,
    },
    {
      id: 'part2',
      kind: 'objective',
      title: 'Part 2',
      description: 'A monologue in an everyday social context (e.g. a talk about local facilities).',
      items: 10,
      questionTypes: ['multipleChoice', 'matching', 'sentenceCompletion'],
      plays: 1,
    },
    {
      id: 'part3',
      kind: 'objective',
      title: 'Part 3',
      description: 'A conversation of up to four people in an educational or training context.',
      items: 10,
      questionTypes: ['multipleChoice', 'matching', 'sentenceCompletion'],
      plays: 1,
    },
    {
      id: 'part4',
      kind: 'objective',
      title: 'Part 4',
      description: 'A monologue on an academic subject, such as a university lecture.',
      items: 10,
      questionTypes: ['sentenceCompletion', 'formCompletion', 'multipleChoice'],
      plays: 1,
    },
  ],
};

const SPEAKING: SectionSpec = {
  id: 'speaking',
  skill: 'speaking',
  title: 'Speaking',
  minutes: 14,
  scoring: { kind: 'rubricBand', criterionMax: 9 },
  tasks: [
    {
      id: 'part1',
      kind: 'speaking',
      format: 'interview',
      title: 'Part 1 — Introduction and interview',
      description: 'General questions about familiar topics such as home, work, studies and interests.',
      speakSeconds: 300,
      weight: 1,
      criteria: SPEAKING_CRITERIA,
    },
    {
      id: 'part2',
      kind: 'speaking',
      format: 'longTurn',
      title: 'Part 2 — Long turn',
      description: 'A task card with a topic and prompts; the candidate speaks for 1–2 minutes after 1 minute of preparation.',
      prepSeconds: 60,
      speakSeconds: 120,
      weight: 1,
      criteria: SPEAKING_CRITERIA,
    },
    {
      id: 'part3',
      kind: 'speaking',
      format: 'discussion',
      title: 'Part 3 — Discussion',
      description: 'A two-way discussion of more abstract issues connected to the Part 2 topic.',
      speakSeconds: 300,
      weight: 1,
      criteria: SPEAKING_CRITERIA,
    },
  ],
};

const writing = (task1: 'chartReport' | 'letter'): SectionSpec => ({
  id: 'writing',
  skill: 'writing',
  title: 'Writing',
  minutes: 60,
  scoring: { kind: 'rubricBand', criterionMax: 9 },
  tasks: [
    {
      id: 'task1',
      kind: 'writing',
      format: task1,
      title: 'Task 1',
      description:
        task1 === 'chartReport'
          ? 'Summarise and compare the main features of a graph, table, chart, map or process diagram.'
          : 'Write a letter requesting information or explaining a situation; the tone may be personal, semi-formal or formal.',
      words: { min: 150 },
      suggestedMinutes: 20,
      weight: 1,
      criteria: [TASK1_ACHIEVEMENT, COHERENCE, LEXICAL, GRAMMAR],
    },
    {
      id: 'task2',
      kind: 'writing',
      format: 'essay',
      title: 'Task 2',
      description: 'An essay responding to a point of view, argument or problem.',
      words: { min: 250 },
      suggestedMinutes: 40,
      weight: 2,
      criteria: [TASK2_RESPONSE, COHERENCE, LEXICAL, GRAMMAR],
    },
  ],
});

const reading = (variant: 'academic' | 'general'): SectionSpec => ({
  id: 'reading',
  skill: 'reading',
  title: 'Reading',
  minutes: 60,
  scoring: {
    kind: 'objectiveTable',
    table: variant === 'academic' ? IELTS_ACADEMIC_READING_TABLE : IELTS_GENERAL_READING_TABLE,
  },
  tasks:
    variant === 'academic'
      ? [
          {
            id: 'passage1',
            kind: 'objective',
            title: 'Passage 1',
            description: 'A factual academic text for a non-specialist audience (books, journals, magazines).',
            items: 13,
            questionTypes: ['trueFalseNotGiven', 'sentenceCompletion', 'multipleChoice'],
          },
          {
            id: 'passage2',
            kind: 'objective',
            title: 'Passage 2',
            description: 'A discursive academic text with a clear line of argument.',
            items: 13,
            questionTypes: ['matching', 'gapFill', 'multipleChoice'],
          },
          {
            id: 'passage3',
            kind: 'objective',
            title: 'Passage 3',
            description: 'A longer, more complex argumentative academic text, possibly with views of the writer.',
            items: 14,
            questionTypes: ['multipleChoice', 'trueFalseNotGiven', 'matching'],
          },
        ]
      : [
          {
            id: 'section1',
            kind: 'objective',
            title: 'Section 1',
            description: 'Two or three short everyday texts such as notices and advertisements.',
            items: 14,
            questionTypes: ['trueFalseNotGiven', 'matching', 'sentenceCompletion'],
          },
          {
            id: 'section2',
            kind: 'objective',
            title: 'Section 2',
            description: 'Two work-related texts such as job descriptions, contracts or staff training material.',
            items: 13,
            questionTypes: ['sentenceCompletion', 'matching', 'gapFill'],
          },
          {
            id: 'section3',
            kind: 'objective',
            title: 'Section 3',
            description: 'One longer, more complex text on a topic of general interest.',
            items: 13,
            questionTypes: ['multipleChoice', 'matching', 'trueFalseNotGiven'],
          },
        ],
});

const variant = (id: 'academic' | 'general', title: string): ExamVariant => ({
  id,
  title,
  sections: [LISTENING, reading(id), writing(id === 'academic' ? 'chartReport' : 'letter'), SPEAKING],
  overall: { kind: 'bandMean', max: 9 },
});

export const IELTS: ExamSpec = {
  id: 'ielts',
  name: 'IELTS',
  fullName: 'International English Language Testing System',
  languageId: 'english',
  owner: 'British Council, IDP IELTS and Cambridge University Press & Assessment',
  officialUrl: 'https://ielts.org',
  conversionApproximate: true,
  variants: [variant('academic', 'Academic'), variant('general', 'General Training')],
};
