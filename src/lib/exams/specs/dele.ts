/* DELE — Diplomas de Español como Lengua Extranjera (Instituto Cervantes).

   Each level is its own exam with its own format, so each is a variant here.
   Section timings follow the official "Estructura y duración — DELE 2020"
   table. Only levels whose task-by-task format has been checked are listed;
   add the rest the same way once verified against the level's official guide.

   Scoring: each of the four sections is worth 25 points. Reading + Writing
   form group 1 and Listening + Speaking group 2; "Apto" needs at least 30 of
   50 in each group and 60 of 100 overall. Cervantes converts raw answers to
   points with its own method, so the proportional scaling used here is an
   estimate. Writing and speaking use the analytic scale's four criteria,
   each rated 0–3. */

import type { ExamSpec, ExamVariant, RubricCriterion } from '../types';

const WRITING_CRITERIA: RubricCriterion[] = [
  {
    id: 'adecuacion',
    name: 'Adecuación al contexto',
    descriptor:
      'Fulfils the task: content, text type, register and the communicative purpose asked for.',
  },
  {
    id: 'coherencia',
    name: 'Coherencia y cohesión',
    descriptor: 'Clear organisation and progression of ideas; appropriate connectors and paragraphing.',
  },
  {
    id: 'correccion',
    name: 'Corrección',
    descriptor: 'Grammatical, lexical and orthographic accuracy for the level.',
  },
  {
    id: 'alcance',
    name: 'Alcance',
    descriptor: 'Range of grammar and vocabulary used to express nuance appropriate to the level.',
  },
];

const SPEAKING_CRITERIA: RubricCriterion[] = [
  {
    id: 'coherencia',
    name: 'Coherencia',
    descriptor: 'Organises the message clearly and links ideas; takes and keeps the turn appropriately.',
  },
  {
    id: 'fluidez',
    name: 'Fluidez',
    descriptor: 'Speaks at an even pace with few long pauses; judged from transcript and timing only.',
  },
  {
    id: 'correccion',
    name: 'Corrección',
    descriptor: 'Grammatical and lexical accuracy for the level.',
  },
  {
    id: 'alcance',
    name: 'Alcance',
    descriptor: 'Range of grammar and vocabulary to describe, argue and express opinions.',
  },
];

const B2: ExamVariant = {
  id: 'b2',
  title: 'B2',
  level: 'B2',
  overall: {
    kind: 'groups',
    max: 100,
    passTotal: 60,
    groups: [
      { id: 'group1', title: 'Reading + Writing', sectionIds: ['reading', 'writing'], max: 50, passMin: 30 },
      { id: 'group2', title: 'Listening + Speaking', sectionIds: ['listening', 'speaking'], max: 50, passMin: 30 },
    ],
  },
  sections: [
    {
      id: 'reading',
      skill: 'reading',
      title: 'Comprensión de lectura',
      minutes: 70,
      scoring: { kind: 'objectiveScaled', max: 25 },
      tasks: [
        {
          id: 'tarea1',
          kind: 'objective',
          title: 'Tarea 1',
          description: 'A long informative or literary text with three-option multiple-choice questions.',
          items: 6,
          questionTypes: ['multipleChoice'],
        },
        {
          id: 'tarea2',
          kind: 'objective',
          title: 'Tarea 2',
          description: 'Four short texts by different people; match each statement to the text it refers to.',
          items: 10,
          questionTypes: ['matching'],
        },
        {
          id: 'tarea3',
          kind: 'objective',
          title: 'Tarea 3',
          description: 'A text with six gaps; choose the missing fragment for each from eight options.',
          items: 6,
          questionTypes: ['gapFill'],
        },
        {
          id: 'tarea4',
          kind: 'objective',
          title: 'Tarea 4',
          description: 'A cloze text testing grammar and vocabulary in context, three options per gap.',
          items: 14,
          questionTypes: ['gapFill', 'multipleChoice'],
        },
      ],
    },
    {
      id: 'listening',
      skill: 'listening',
      title: 'Comprensión auditiva',
      minutes: 40,
      scoring: { kind: 'objectiveScaled', max: 25 },
      tasks: [
        {
          id: 'tarea1',
          kind: 'objective',
          title: 'Tarea 1',
          description: 'Six short conversations, one multiple-choice question each.',
          items: 6,
          questionTypes: ['multipleChoice'],
          plays: 2,
        },
        {
          id: 'tarea2',
          kind: 'objective',
          title: 'Tarea 2',
          description: 'A conversation between two people; decide which speaker each statement refers to.',
          items: 6,
          questionTypes: ['matching'],
          plays: 2,
        },
        {
          id: 'tarea3',
          kind: 'objective',
          title: 'Tarea 3',
          description: 'A radio interview with multiple-choice questions.',
          items: 6,
          questionTypes: ['multipleChoice'],
          plays: 2,
        },
        {
          id: 'tarea4',
          kind: 'objective',
          title: 'Tarea 4',
          description: 'Six short monologues; match each to one of the statements given.',
          items: 6,
          questionTypes: ['matching'],
          plays: 2,
        },
        {
          id: 'tarea5',
          kind: 'objective',
          title: 'Tarea 5',
          description: 'A talk or lecture with multiple-choice questions.',
          items: 6,
          questionTypes: ['multipleChoice'],
          plays: 2,
        },
      ],
    },
    {
      id: 'writing',
      skill: 'writing',
      title: 'Expresión e interacción escritas',
      minutes: 80,
      scoring: { kind: 'rubricScaled', criterionMax: 3, max: 25 },
      tasks: [
        {
          id: 'tarea1',
          kind: 'writing',
          format: 'letter',
          title: 'Tarea 1',
          description:
            'A formal or informal letter or email reacting to a recording the candidate has listened to.',
          words: { min: 150, max: 180 },
          weight: 1,
          criteria: WRITING_CRITERIA,
        },
        {
          id: 'tarea2',
          kind: 'writing',
          format: 'article',
          title: 'Tarea 2',
          description:
            'An opinion article, review or report, choosing one of two options (one may be based on a chart).',
          words: { min: 150, max: 180 },
          weight: 1,
          criteria: WRITING_CRITERIA,
        },
      ],
    },
    {
      id: 'speaking',
      skill: 'speaking',
      title: 'Expresión e interacción orales',
      minutes: 20,
      prepMinutes: 20,
      scoring: { kind: 'rubricScaled', criterionMax: 3, max: 25 },
      tasks: [
        {
          id: 'tarea1',
          kind: 'speaking',
          format: 'longTurn',
          title: 'Tarea 1',
          description:
            'Assess several proposals to solve a problem, then discuss them with the examiner.',
          speakSeconds: 420,
          weight: 1,
          criteria: SPEAKING_CRITERIA,
        },
        {
          id: 'tarea2',
          kind: 'speaking',
          format: 'pictureDescription',
          title: 'Tarea 2',
          description:
            'Describe and imagine a situation shown in a photo, then talk with the examiner about a related experience.',
          speakSeconds: 360,
          weight: 1,
          criteria: SPEAKING_CRITERIA,
        },
        {
          id: 'tarea3',
          kind: 'speaking',
          format: 'discussion',
          title: 'Tarea 3',
          description: 'Comment on the data of a survey or news item and give an opinion in a short conversation.',
          speakSeconds: 240,
          weight: 1,
          criteria: SPEAKING_CRITERIA,
        },
      ],
    },
  ],
};

export const DELE: ExamSpec = {
  id: 'dele',
  name: 'DELE',
  fullName: 'Diplomas de Español como Lengua Extranjera',
  languageId: 'spanish',
  owner: 'Instituto Cervantes',
  officialUrl: 'https://examenes.cervantes.es',
  conversionApproximate: true,
  variants: [B2],
};
