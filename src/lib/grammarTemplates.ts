/* Built-in templates — web port of GrammarNoteTemplateProvider (7 note
   templates) + GrammarTemplateProvider (5 topic templates). iOS block types
   the web editor doesn't have are mapped down: numberedList/checklist →
   bulletList, comparison → example (text/secondaryText kept), exercise →
   paragraph; quiz + image blocks are dropped. All texts are iOS-verbatim. */
import { derivePreviewText } from '@/lib/grammarNoteEditor';
import type {
  GrammarBlockType,
  GrammarNote,
  GrammarNoteBlock,
  GrammarNoteTopic,
  GrammarNoteType,
} from '@/lib/models';

export interface TemplateBlock {
  type: GrammarBlockType;
  text?: string;
  secondaryText?: string;
  items?: string[];
}

export interface GrammarNoteTemplate {
  id: string;
  title: string;
  description: string;
  noteType: GrammarNoteType;
  languageCode?: string;
  tags: string[];
  blocks: TemplateBlock[];
  estimatedMinutes: number;
  difficulty: string;
}

export interface GrammarTopicTemplate {
  id: string;
  title: string;
  description: string;
  languageCode?: string;
  languageName?: string;
  icon: string;
  colorHex: string;
  difficulty: string;
  estimatedMinutes: number;
  noteTemplates: GrammarNoteTemplate[];
  tags: string[];
}

/* --- 7 note templates (GrammarNoteTemplateProvider.templates) --- */

export const NOTE_TEMPLATES: GrammarNoteTemplate[] = [
  {
    id: 'grammar-rule',
    title: 'Grammar Rule Template',
    description: 'Rule, examples, warning and practice in one clean structure.',
    noteType: 'rule',
    tags: ['rule', 'structured'],
    blocks: [
      { type: 'heading', text: 'Rule name' },
      { type: 'rule', text: 'When do we use this rule?', secondaryText: 'Formula / pattern' },
      { type: 'example', text: 'Correct example', secondaryText: 'Translation or explanation' },
      { type: 'warning', text: 'Common mistake to avoid' },
      { type: 'paragraph', text: 'Write 3 sentences using this rule.' },
    ],
    estimatedMinutes: 8,
    difficulty: 'A1',
  },
  {
    id: 'mistake-correction',
    title: 'Mistake Correction Template',
    description: 'Perfect for saving your own mistakes and fixing them properly.',
    noteType: 'mistake',
    tags: ['mistake', 'review'],
    blocks: [
      { type: 'heading', text: 'Mistake title' },
      { type: 'quote', text: 'Original sentence with mistake' },
      { type: 'rule', text: 'Corrected sentence', secondaryText: 'Why this correction is correct' },
      { type: 'example', text: 'More correct examples' },
      {
        type: 'bulletList',
        items: ['I understand the mistake', 'I can make a similar sentence', 'I reviewed it later'],
      },
    ],
    estimatedMinutes: 6,
    difficulty: 'A2',
  },
  {
    id: 'comparison',
    title: 'Comparison Template',
    description: 'Compare two confusing grammar forms without turning your brain into soup.',
    noteType: 'comparison',
    tags: ['comparison', 'contrast'],
    blocks: [
      { type: 'heading', text: 'A vs B' },
      { type: 'example', text: 'Form A: meaning and use', secondaryText: 'Form B: meaning and use' },
      { type: 'example', text: 'Example for A', secondaryText: 'Example for B' },
      { type: 'warning', text: 'When learners usually mix them up' },
      { type: 'paragraph', text: 'Choose A or B in 5 sentences.' },
    ],
    estimatedMinutes: 10,
    difficulty: 'A2',
  },
  {
    id: 'cheat-sheet',
    title: 'Cheat Sheet Template',
    description: 'Short, fast, and useful. A miracle, apparently.',
    noteType: 'cheatSheet',
    tags: ['cheat-sheet', 'quick'],
    blocks: [
      { type: 'heading', text: 'Cheat sheet' },
      { type: 'bulletList', items: ['Key rule', 'Useful pattern', 'Common exception'] },
      { type: 'divider' },
      { type: 'example', text: 'Quick example' },
    ],
    estimatedMinutes: 4,
    difficulty: 'A1',
  },
  {
    id: 'verb-tense',
    title: 'Verb / Tense Template',
    description: 'Conjugation, usage, examples and practice for tenses.',
    noteType: 'rule',
    tags: ['verbs', 'tense'],
    blocks: [
      { type: 'heading', text: 'Tense name' },
      { type: 'rule', text: 'When to use it', secondaryText: 'Structure / conjugation pattern' },
      { type: 'bulletList', items: ['Subject + verb form', 'Negative form', 'Question form'] },
      { type: 'example', text: 'Example sentences' },
      { type: 'paragraph', text: 'Write your own sentence in this tense.' },
    ],
    estimatedMinutes: 12,
    difficulty: 'A2',
  },
  {
    id: 'quick-quiz-ready',
    title: 'Quick Quiz Ready Template',
    description: 'Structured for a one-tap quiz from the rule and example.',
    noteType: 'rule',
    tags: ['quiz', 'practice'],
    blocks: [
      { type: 'heading', text: 'Rule to quiz' },
      { type: 'rule', text: 'Key rule one-liner', secondaryText: 'Why it matters' },
      { type: 'example', text: 'Example to recall' },
    ],
    estimatedMinutes: 7,
    difficulty: 'A2',
  },
  {
    id: 'image-based',
    title: 'Image-Based Grammar Note Template',
    description: 'Add a screenshot or chart, then explain it in your own words.',
    noteType: 'standard',
    tags: ['image', 'visual'],
    blocks: [
      { type: 'heading', text: 'Note title' },
      { type: 'paragraph', text: 'Explain what the image shows and why it matters.' },
      { type: 'example', text: 'Concrete example using the rule from the image.' },
    ],
    estimatedMinutes: 6,
    difficulty: 'A1',
  },
];

/* --- 5 topic templates (GrammarTemplateProvider.topicTemplates) --- */

const note = (
  t: Omit<GrammarNoteTemplate, 'estimatedMinutes'> & { estimatedMinutes?: number },
): GrammarNoteTemplate => ({ estimatedMinutes: 8, ...t });

export const TOPIC_TEMPLATES: GrammarTopicTemplate[] = [
  {
    id: 'topic-spanish-a1-essentials',
    title: 'Spanish A1 Essentials',
    description:
      'The grammar core every Spanish beginner trips on — ser vs estar, gender, present tense, hay/está and questions.',
    languageCode: 'es',
    languageName: 'Spanish',
    icon: 'text.book.closed.fill',
    colorHex: '#FF7B54',
    difficulty: 'A1',
    estimatedMinutes: 45,
    tags: ['spanish', 'A1', 'essentials'],
    noteTemplates: [
      note({
        id: 'es-a1-ser-estar',
        title: 'Ser vs Estar',
        description: 'The classic Spanish trap. When to use which copula.',
        noteType: 'comparison',
        languageCode: 'es',
        tags: ['A1', 'verbs', 'ser-estar'],
        difficulty: 'A1',
        blocks: [
          { type: 'heading', text: 'Ser vs Estar' },
          {
            type: 'rule',
            text: 'Use ser for identity, origin, occupation, and permanent traits. Use estar for state, location and temporary conditions.',
            secondaryText: 'Ser = essence. Estar = state.',
          },
          {
            type: 'example',
            text: 'Ser: Soy estudiante. (I am a student — identity)',
            secondaryText: 'Estar: Estoy cansado. (I am tired — state)',
          },
          {
            type: 'example',
            text: 'La fiesta es en mi casa. (The party is at my house — event)',
            secondaryText: 'Mi casa está en Madrid. (My house is in Madrid — location)',
          },
          {
            type: 'warning',
            text: "Don't use estar for nationality, profession or material — those stay with ser.",
          },
          { type: 'paragraph', text: 'Fill in: Ella _____ profesora. / Hoy _____ lloviendo.' },
        ],
      }),
      note({
        id: 'es-a1-gender-articles',
        title: 'Gender and Articles',
        description: 'Every Spanish noun has a gender — choose el/la, un/una correctly.',
        noteType: 'rule',
        languageCode: 'es',
        tags: ['A1', 'nouns', 'articles'],
        difficulty: 'A1',
        blocks: [
          { type: 'heading', text: 'Gender and Articles' },
          {
            type: 'rule',
            text: 'Most nouns ending in -o are masculine; most ending in -a are feminine.',
            secondaryText: 'Articles: el/los (masc), la/las (fem); un/unos, una/unas (indefinite).',
          },
          {
            type: 'bulletList',
            items: ['el libro (the book)', 'la mesa (the table)', 'un coche (a car)', 'una casa (a house)'],
          },
          { type: 'warning', text: 'Watch the exceptions: el día, la mano, el problema, el mapa.' },
          { type: 'paragraph', text: 'Add the right article: ___ agua, ___ programa, ___ universidad.' },
        ],
      }),
      note({
        id: 'es-a1-present-tense',
        title: 'Present Tense Basics',
        description: 'Regular -ar, -er, -ir conjugation in the present.',
        noteType: 'rule',
        languageCode: 'es',
        tags: ['A1', 'verbs', 'present'],
        difficulty: 'A1',
        blocks: [
          { type: 'heading', text: 'Present Tense Basics' },
          {
            type: 'rule',
            text: 'Drop the infinitive ending (-ar/-er/-ir), add the personal ending.',
            secondaryText: 'hablar → habl- / comer → com- / vivir → viv-',
          },
          {
            type: 'bulletList',
            items: [
              'yo hablo / como / vivo',
              'tú hablas / comes / vives',
              'él, ella habla / come / vive',
              'nosotros hablamos / comemos / vivimos',
              'ellos hablan / comen / viven',
            ],
          },
          { type: 'example', text: 'Hablo español todos los días.' },
          { type: 'paragraph', text: 'Conjugate: trabajar, leer, escribir for yo/tú/nosotros.' },
        ],
      }),
      note({
        id: 'es-a1-hay-esta',
        title: 'Hay vs Está',
        description: 'There is / there are vs is located.',
        noteType: 'comparison',
        languageCode: 'es',
        tags: ['A1', 'location'],
        difficulty: 'A1',
        blocks: [
          { type: 'heading', text: 'Hay vs Está' },
          {
            type: 'rule',
            text: 'Use hay to say something exists (there is/are). Use está/están for known things in a specific location.',
            secondaryText: 'Hay + indefinite/quantity. Está + definite article.',
          },
          {
            type: 'example',
            text: 'Hay un banco en la calle. (There is a bank…)',
            secondaryText: 'El banco está en la calle. (The bank is on the street.)',
          },
          { type: 'warning', text: "Don't say 'Hay el coche' — use 'está' with the definite article." },
          {
            type: 'paragraph',
            text: 'Choose hay/está: ___ tres libros en la mesa. / Mi llave ___ en la mochila.',
          },
        ],
      }),
      note({
        id: 'es-a1-questions',
        title: 'Basic Question Structure',
        description: 'How to ask yes/no questions and use interrogatives.',
        noteType: 'rule',
        languageCode: 'es',
        tags: ['A1', 'questions'],
        difficulty: 'A1',
        blocks: [
          { type: 'heading', text: 'Basic Question Structure' },
          {
            type: 'rule',
            text: 'Spanish flips word order or just adds intonation. Question words always carry an accent.',
            secondaryText: '¿qué? ¿quién? ¿dónde? ¿cuándo? ¿por qué? ¿cómo?',
          },
          { type: 'example', text: '¿Hablas inglés?', secondaryText: '¿Dónde vives?' },
          { type: 'warning', text: "Spanish opens questions with ¿ — don't forget the inverted mark." },
          { type: 'paragraph', text: 'Turn into questions: Vives en Madrid. / Tiene un perro.' },
        ],
      }),
    ],
  },
  {
    id: 'topic-english-tenses-pack',
    title: 'English Tenses Pack',
    description: 'Five tenses that cover ~80% of everyday English.',
    languageCode: 'en',
    languageName: 'English',
    icon: 'clock.fill',
    colorHex: '#4F7CFF',
    difficulty: 'A2',
    estimatedMinutes: 50,
    tags: ['english', 'A2', 'tenses'],
    noteTemplates: [
      note({
        id: 'en-a2-present-simple',
        title: 'Present Simple',
        description: 'Habits, facts, schedules.',
        noteType: 'rule',
        languageCode: 'en',
        tags: ['A2', 'tense', 'present-simple'],
        difficulty: 'A2',
        blocks: [
          { type: 'heading', text: 'Present Simple' },
          {
            type: 'rule',
            text: 'Used for habits, general truths and fixed schedules.',
            secondaryText: 'Subject + base verb (+ s for he/she/it)',
          },
          {
            type: 'bulletList',
            items: [
              'I work / You work / He works',
              'Negative: do/does + not + base',
              'Question: Do/Does + subject + base',
            ],
          },
          { type: 'example', text: 'She speaks three languages. / The train leaves at 7.' },
          { type: 'paragraph', text: 'Write 3 sentences about your daily routine.' },
        ],
      }),
      note({
        id: 'en-a2-present-continuous',
        title: 'Present Continuous',
        description: 'Now, around now, temporary actions.',
        noteType: 'rule',
        languageCode: 'en',
        tags: ['A2', 'tense', 'present-continuous'],
        difficulty: 'A2',
        blocks: [
          { type: 'heading', text: 'Present Continuous' },
          {
            type: 'rule',
            text: 'Use for actions happening now or around now, and temporary states.',
            secondaryText: 'am/is/are + verb-ing',
          },
          { type: 'example', text: "I am studying right now. / She's working from home this week." },
          { type: 'warning', text: 'Avoid with stative verbs: know, like, want, believe.' },
          { type: 'paragraph', text: 'Describe what 3 people in your room are doing.' },
        ],
      }),
      note({
        id: 'en-a2-past-simple',
        title: 'Past Simple',
        description: 'Finished actions at a defined time in the past.',
        noteType: 'rule',
        languageCode: 'en',
        tags: ['A2', 'tense', 'past-simple'],
        difficulty: 'A2',
        blocks: [
          { type: 'heading', text: 'Past Simple' },
          {
            type: 'rule',
            text: 'Used for completed actions at a specific past time.',
            secondaryText: 'Regular: verb + -ed. Irregular: see list.',
          },
          { type: 'example', text: 'I visited Rome last year. / She went home early.' },
          { type: 'warning', text: 'Watch irregular forms: go→went, have→had, see→saw, do→did.' },
          { type: 'paragraph', text: 'Write 5 sentences about yesterday.' },
        ],
      }),
      note({
        id: 'en-a2-present-perfect',
        title: 'Present Perfect',
        description: 'Past action connected to now.',
        noteType: 'rule',
        languageCode: 'en',
        tags: ['B1', 'tense', 'present-perfect'],
        difficulty: 'B1',
        blocks: [
          { type: 'heading', text: 'Present Perfect' },
          {
            type: 'rule',
            text: 'Use when the time is unspecified, or for experience and recent actions still relevant now.',
            secondaryText: 'have/has + past participle',
          },
          { type: 'example', text: 'I have lived here for 5 years. / She has just arrived.' },
          {
            type: 'example',
            text: 'Past simple: I saw it yesterday.',
            secondaryText: 'Present perfect: I have seen it. (any time before now)',
          },
          { type: 'paragraph', text: 'Choose past simple vs present perfect in 5 sentences.' },
        ],
      }),
      note({
        id: 'en-a2-future-forms',
        title: 'Future Forms',
        description: 'Will, going to, present continuous for future.',
        noteType: 'comparison',
        languageCode: 'en',
        tags: ['A2', 'future'],
        difficulty: 'A2',
        blocks: [
          { type: 'heading', text: 'Future Forms' },
          {
            type: 'rule',
            text: 'Three common ways to talk about the future.',
            secondaryText:
              'will (decision now / prediction), be going to (plan / evidence), present continuous (fixed arrangement)',
          },
          {
            type: 'example',
            text: "I'll help you. (decision now)",
            secondaryText: "I'm going to study tonight. (plan)",
          },
          { type: 'example', text: "I'm meeting Anna at 6. (arrangement)" },
          { type: 'paragraph', text: 'Match: decision / plan / arrangement to 6 sentences.' },
        ],
      }),
    ],
  },
  {
    id: 'topic-german-cases-starter',
    title: 'German Cases Starter',
    description: 'Nominativ, Akkusativ, Dativ, Genitiv — the foundation of German grammar.',
    languageCode: 'de',
    languageName: 'German',
    icon: 'square.grid.2x2.fill',
    colorHex: '#7C5CFF',
    difficulty: 'A2',
    estimatedMinutes: 60,
    tags: ['german', 'A2', 'cases'],
    noteTemplates: [
      note({
        id: 'de-nom',
        title: 'Nominativ',
        description: 'Subject case — who/what is doing the action.',
        noteType: 'rule',
        languageCode: 'de',
        tags: ['A1', 'case', 'nominativ'],
        difficulty: 'A1',
        blocks: [
          { type: 'heading', text: 'Nominativ' },
          {
            type: 'rule',
            text: 'The Nominativ marks the subject of the sentence.',
            secondaryText: 'Articles: der / die / das / die (pl)',
          },
          { type: 'example', text: 'Der Hund schläft. (The dog sleeps.)' },
          {
            type: 'warning',
            text: 'The subject can be a noun phrase, a pronoun, or a name — always Nominativ.',
          },
          { type: 'paragraph', text: 'Identify the Nominativ in: Die Frau liest ein Buch.' },
        ],
      }),
      note({
        id: 'de-akk',
        title: 'Akkusativ',
        description: 'Direct object case.',
        noteType: 'rule',
        languageCode: 'de',
        tags: ['A2', 'case', 'akkusativ'],
        difficulty: 'A2',
        blocks: [
          { type: 'heading', text: 'Akkusativ' },
          {
            type: 'rule',
            text: 'The Akkusativ marks the direct object — what is being acted upon.',
            secondaryText: 'Articles: den / die / das / die. Only der → den changes!',
          },
          { type: 'example', text: 'Ich sehe den Mann. / Sie liest das Buch.' },
          { type: 'warning', text: 'Prepositions that always take Akkusativ: durch, für, gegen, ohne, um.' },
          { type: 'paragraph', text: 'Translate: I have a brother. I see the woman.' },
        ],
      }),
      note({
        id: 'de-dat',
        title: 'Dativ',
        description: 'Indirect object case.',
        noteType: 'rule',
        languageCode: 'de',
        tags: ['A2', 'case', 'dativ'],
        difficulty: 'A2',
        blocks: [
          { type: 'heading', text: 'Dativ' },
          {
            type: 'rule',
            text: 'The Dativ marks the indirect object — the recipient/beneficiary.',
            secondaryText: 'Articles: dem / der / dem / den (pl) + -n on plural noun',
          },
          { type: 'example', text: 'Ich gebe dem Kind ein Geschenk.' },
          { type: 'warning', text: 'Dativ prepositions: aus, bei, mit, nach, seit, von, zu.' },
          {
            type: 'paragraph',
            text: 'Mark Nominativ/Akkusativ/Dativ in: Der Mann gibt der Frau das Buch.',
          },
        ],
      }),
      note({
        id: 'de-gen',
        title: 'Genitiv Overview',
        description: 'Possession case (formal/written German).',
        noteType: 'rule',
        languageCode: 'de',
        tags: ['B1', 'case', 'genitiv'],
        difficulty: 'B1',
        blocks: [
          { type: 'heading', text: 'Genitiv Overview' },
          {
            type: 'rule',
            text: "Used for possession and after specific prepositions. In spoken German, often replaced by 'von + Dativ'.",
            secondaryText: 'Articles: des / der / des / der. Masculine/neuter nouns add -s or -es.',
          },
          { type: 'example', text: 'Das Auto meines Vaters. / Die Farbe des Hauses.' },
          { type: 'warning', text: 'Genitiv prepositions: während, trotz, wegen, statt — formal use.' },
          { type: 'paragraph', text: "Rewrite using 'von + Dativ': Das Buch des Lehrers." },
        ],
      }),
      note({
        id: 'de-articles-by-case',
        title: 'Articles by Case',
        description: 'Compact reference table.',
        noteType: 'cheatSheet',
        languageCode: 'de',
        tags: ['A2', 'cheat-sheet'],
        difficulty: 'A2',
        blocks: [
          { type: 'heading', text: 'Articles by Case' },
          {
            type: 'bulletList',
            items: [
              'Nominativ: der / die / das / die',
              'Akkusativ: den / die / das / die',
              'Dativ: dem / der / dem / den (+ noun-n)',
              'Genitiv: des / der / des / der',
            ],
          },
          { type: 'divider' },
          { type: 'example', text: 'Nom → Akk: der → den (the only masculine change in singular).' },
        ],
      }),
    ],
  },
  {
    id: 'topic-french-survival',
    title: 'French Survival Grammar',
    description: 'Five rules that keep you afloat in any French conversation.',
    languageCode: 'fr',
    languageName: 'French',
    icon: 'flag.fill',
    colorHex: '#22B07D',
    difficulty: 'A1',
    estimatedMinutes: 40,
    tags: ['french', 'A1', 'survival'],
    noteTemplates: [
      note({
        id: 'fr-etre-avoir',
        title: 'Être vs Avoir',
        description: 'The two essential verbs.',
        noteType: 'comparison',
        languageCode: 'fr',
        tags: ['A1', 'verbs', 'etre-avoir'],
        difficulty: 'A1',
        blocks: [
          { type: 'heading', text: 'Être vs Avoir' },
          {
            type: 'rule',
            text: 'Être = to be (identity, state, location). Avoir = to have (possession, age, sensations).',
            secondaryText: "je suis / tu es / il est | j'ai / tu as / il a",
          },
          {
            type: 'example',
            text: 'Je suis fatigué. (I am tired.)',
            secondaryText: "J'ai faim. (I am hungry — literally: I have hunger.)",
          },
          {
            type: 'warning',
            text: "French uses avoir where English uses 'to be': age, hunger, thirst, fear.",
          },
          { type: 'paragraph', text: 'Translate: I am happy. I am 25. I am hungry. I have a brother.' },
        ],
      }),
      note({
        id: 'fr-articles',
        title: 'Definite and Indefinite Articles',
        description: 'Le, la, les, un, une, des.',
        noteType: 'rule',
        languageCode: 'fr',
        tags: ['A1', 'articles'],
        difficulty: 'A1',
        blocks: [
          { type: 'heading', text: 'Definite and Indefinite Articles' },
          {
            type: 'rule',
            text: 'French has gendered articles. Use definite (le/la/les) for specific things, indefinite (un/une/des) for one of many.',
            secondaryText: "le + masc, la + fem, l' before vowel; les + plural",
          },
          {
            type: 'bulletList',
            items: ["le livre / la table / l'ami / les enfants", 'un livre / une table / des amis'],
          },
          { type: 'warning', text: "Both le/la become l' before a vowel or silent h." },
          { type: 'paragraph', text: 'Add the right article: ___ chat, ___ école, ___ étudiants.' },
        ],
      }),
      note({
        id: 'fr-negation',
        title: 'Negation with Ne...pas',
        description: 'Wrap the verb to make it negative.',
        noteType: 'rule',
        languageCode: 'fr',
        tags: ['A1', 'negation'],
        difficulty: 'A1',
        blocks: [
          { type: 'heading', text: 'Negation with Ne...pas' },
          {
            type: 'rule',
            text: "Place 'ne' before the verb and 'pas' after.",
            secondaryText: 'ne + verb + pas',
          },
          { type: 'example', text: "Je ne parle pas français. / Il n'aime pas le café." },
          { type: 'warning', text: "In spoken French, 'ne' is often dropped: 'Je parle pas.'" },
          { type: 'paragraph', text: "Make negative: J'aime le thé. / Nous parlons espagnol." },
        ],
      }),
      note({
        id: 'fr-questions',
        title: 'Basic Questions',
        description: 'Three ways to ask.',
        noteType: 'rule',
        languageCode: 'fr',
        tags: ['A1', 'questions'],
        difficulty: 'A1',
        blocks: [
          { type: 'heading', text: 'Basic Questions' },
          {
            type: 'rule',
            text: 'Three common patterns: intonation, est-ce que, inversion.',
            secondaryText:
              'Tu parles français? / Est-ce que tu parles français? / Parles-tu français?',
          },
          { type: 'example', text: "Où est-ce que tu habites? / Comment t'appelles-tu?" },
          { type: 'warning', text: 'Inversion is formal — use est-ce que in everyday speech.' },
          { type: 'paragraph', text: 'Turn into questions: Tu aimes la pizza. / Il travaille ici.' },
        ],
      }),
      note({
        id: 'fr-adj-agreement',
        title: 'Adjective Agreement',
        description: 'Adjectives match the noun in gender and number.',
        noteType: 'rule',
        languageCode: 'fr',
        tags: ['A2', 'adjectives'],
        difficulty: 'A2',
        blocks: [
          { type: 'heading', text: 'Adjective Agreement' },
          {
            type: 'rule',
            text: 'Adjectives agree with the noun in gender and number.',
            secondaryText: 'Default add -e for feminine, -s for plural, -es for feminine plural.',
          },
          {
            type: 'example',
            text: 'un petit chat / une petite chatte / des petits chats / des petites chattes',
          },
          { type: 'warning', text: 'Watch irregular adjectives: beau/belle, vieux/vieille, nouveau/nouvelle.' },
          { type: 'paragraph', text: 'Agree the adjective (grand): ___ maison, ___ enfants, ___ amies.' },
        ],
      }),
    ],
  },
  {
    id: 'topic-custom-blank',
    title: 'Custom Blank Topic',
    description: 'Start from scratch — only the topic is created, no notes inside.',
    icon: 'doc.badge.plus',
    colorHex: '#4F7CFF',
    difficulty: 'A1',
    estimatedMinutes: 1,
    noteTemplates: [],
    tags: ['blank'],
  },
];

/* --- Filters (iOS filter semantics: nil-language templates always pass) --- */

export const TEMPLATE_LANGUAGES = ['en', 'es', 'fr', 'de'] as const;
export const TEMPLATE_DIFFICULTIES = ['A1', 'A2', 'B1', 'B2'] as const;

export interface TemplateFilter {
  languageCode?: string;
  difficulty?: string;
  query?: string;
}

const matchesFilter = (
  tpl: { title: string; description: string; tags: string[]; languageCode?: string; difficulty: string },
  filter: TemplateFilter,
): boolean => {
  if (filter.languageCode && tpl.languageCode !== undefined && tpl.languageCode !== filter.languageCode) {
    return false;
  }
  if (filter.difficulty && tpl.difficulty.toLowerCase() !== filter.difficulty.toLowerCase()) {
    return false;
  }
  const q = filter.query?.trim().toLowerCase() ?? '';
  if (q.length > 0) {
    return (
      tpl.title.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q) ||
      tpl.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }
  return true;
};

export const filterNoteTemplates = (filter: TemplateFilter): GrammarNoteTemplate[] =>
  NOTE_TEMPLATES.filter((tpl) => matchesFilter(tpl, filter));

export const filterTopicTemplates = (filter: TemplateFilter): GrammarTopicTemplate[] =>
  TOPIC_TEMPLATES.filter((tpl) => matchesFilter(tpl, filter));

/* --- Instantiation --- */

export const blocksFromTemplate = (blocks: TemplateBlock[]): GrammarNoteBlock[] =>
  blocks.map((b, index) => ({
    id: crypto.randomUUID(),
    type: b.type,
    text: b.text ?? '',
    secondaryText: b.secondaryText,
    items: b.items ?? (b.type === 'bulletList' ? [''] : []),
    order: index,
  }));

export const noteFromTemplate = (
  tpl: GrammarNoteTemplate,
  params: { ownerUID: string; topicId: string; now?: number },
): GrammarNote => {
  const now = params.now ?? Date.now();
  const contentBlocks = blocksFromTemplate(tpl.blocks);
  return {
    id: crypto.randomUUID(),
    ownerUID: params.ownerUID,
    topicId: params.topicId,
    title: tpl.title,
    noteType: tpl.noteType,
    previewText: derivePreviewText({ title: tpl.title, noteType: tpl.noteType, blocks: contentBlocks }),
    contentBlocks,
    createdAt: now,
    updatedAt: now,
  };
};

export const topicFromTemplate = (
  tpl: GrammarTopicTemplate,
  params: { ownerUID: string; now?: number },
): GrammarNoteTopic => {
  const now = params.now ?? Date.now();
  return {
    id: crypto.randomUUID(),
    ownerUID: params.ownerUID,
    title: tpl.title,
    description: tpl.description,
    icon: tpl.icon,
    colorHex: tpl.colorHex,
    notesCount: 0,
    isPinned: false,
    isMistakesTopic: false,
    createdAt: now,
    updatedAt: now,
  };
};
