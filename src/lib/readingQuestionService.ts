/* Local comprehension-question generator — web port of
   ReadingQuestionService.swift. 100% offline heuristics (no AI): builds up to
   maxQuestions from the text's sentences in the iOS order, dedup by prompt,
   only enabled types. All prompts/caps/thresholds are iOS-verbatim. */
import { readingSentences } from '@/lib/readingTextAnalyzer';
import { DEFAULT_QUESTION_TYPES } from '@/lib/readingTypes';
import type { ReadingFocus, ReadingQuestionType } from '@/lib/models';

export interface ReadingQuestion {
  id: string;
  type: ReadingQuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  sourceSentence?: string;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'were', 'was', 'are',
  'but', 'not', 'you', 'your', 'they', 'them', 'their', 'what', 'when', 'where', 'which',
]);

const meaningfulWords = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

const capitalize = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

const truncate = (s: string, max: number, keep: number) =>
  s.length > max ? `${s.slice(0, keep)}…` : s;

const shuffleOptions = (options: string[], correct: string): string[] => {
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (!shuffled.some((o) => o.toLowerCase() === correct.toLowerCase())) {
    if (shuffled.length === 0) return [correct];
    shuffled[0] = correct;
  }
  return shuffled;
};

/** Case-insensitive first-occurrence replacement (iOS range(of:options:)). */
const replaceFirstCaseInsensitive = (text: string, target: string, replacement: string) => {
  const idx = text.toLowerCase().indexOf(target.toLowerCase());
  if (idx < 0) return text;
  return text.slice(0, idx) + replacement + text.slice(idx + target.length);
};

const question = (
  type: ReadingQuestionType,
  prompt: string,
  options: string[],
  correctAnswer: string,
  explanation?: string,
  sourceSentence?: string,
): ReadingQuestion => ({
  id: crypto.randomUUID(),
  type,
  prompt,
  options,
  correctAnswer,
  explanation,
  sourceSentence,
});

const makeComprehension = (
  title: string,
  preview: string,
  sentences: string[],
  focus: ReadingFocus,
): ReadingQuestion | null => {
  const lead = sentences[0] ?? preview;
  if (!lead) return null;
  const correct = truncate(lead, 120, 117);
  const options = [correct];
  for (const sentence of sentences.slice(1, 3)) {
    options.push(truncate(sentence, 80, 77));
  }
  const fillers = [
    'The text discusses something else.',
    'The text has no clear topic.',
    'The text is only a title.',
  ];
  while (options.length < 4) {
    options.push(fillers[Math.min(options.length - 1, 2)]);
  }
  const prompt =
    focus === 'mainIdea' || focus === 'speedFluency'
      ? `What is the main idea of "${title}"?`
      : focus === 'vocabulary'
        ? `Which option best summarizes "${title}"?`
        : 'What is this text mostly about?';
  return question(
    'comprehension', prompt, shuffleOptions(options, correct), correct,
    'This matches the central idea of the passage.', lead,
  );
};

const makeComprehensionDetail = (sentence: string, title: string): ReadingQuestion | null => {
  if (sentence.length < 20) return null;
  const correct = truncate(sentence, 100, 97);
  const options = [
    correct,
    'The author changes topic completely.',
    `The sentence is unrelated to ${title}.`,
    'None of the above.',
  ];
  return question(
    'comprehension', 'Which statement best reflects this part of the text?',
    shuffleOptions(options, correct), correct,
    'This sentence appears in the passage.', sentence,
  );
};

const makeTrueFalse = (sentence: string, preferTrue: boolean): ReadingQuestion | null => {
  const words = meaningfulWords(sentence);
  if (words.length < 4) return null;

  if (preferTrue) {
    return question(
      'trueFalse', `True or false: "${sentence}"`, ['True', 'False'], 'True',
      'This statement matches the text.', sentence,
    );
  }

  const target = words.find((w) => w.length >= 5);
  if (!target) return null;
  const falseSentence = replaceFirstCaseInsensitive(sentence, target, 'never');
  if (falseSentence === sentence) return null;
  return question(
    'trueFalse', `True or false: "${falseSentence}"`, ['True', 'False'], 'False',
    'This modified statement does not match the original text.', sentence,
  );
};

const makeFillGap = (sentence: string, allContent: string): ReadingQuestion | null => {
  const words = meaningfulWords(sentence).filter((w) => w.length >= 5);
  if (words.length < 1 || sentence.split(' ').filter((w) => w.length > 0).length < 6) return null;
  const target = words.reduce((a, b) => (b.length > a.length ? b : a));

  const gapSentence = replaceFirstCaseInsensitive(sentence, target, '____');

  const distractors = meaningfulWords(allContent)
    .filter((w) => w.toLowerCase() !== target.toLowerCase() && w.length >= 4)
    .slice(0, 6)
    .map(capitalize);

  const deduped = [...new Set([capitalize(target), ...distractors].map((o) => o.toLowerCase()))]
    .slice(0, 4)
    .map(capitalize);
  if (deduped.length < 2) return null;

  const correct = deduped.find((o) => o.toLowerCase() === target.toLowerCase()) ?? deduped[0];
  return question(
    'fillGap', `Fill the gap: ${gapSentence}`, shuffleOptions(deduped, correct), correct,
    'The word appears in the original sentence.', sentence,
  );
};

const makeVocabulary = (sentence: string, allContent: string): ReadingQuestion | null => {
  const candidates = meaningfulWords(sentence).filter((w) => w.length >= 6);
  if (candidates.length === 0) return null;
  const target = candidates.reduce((a, b) => (b.length > a.length ? b : a));
  const displayTarget = capitalize(target);

  const options = [displayTarget];
  options.push(
    ...meaningfulWords(allContent)
      .filter((w) => w.toLowerCase() !== target.toLowerCase() && w.length >= 5)
      .slice(0, 3)
      .map(capitalize),
  );
  const deduped = [...new Set(options.map((o) => o.toLowerCase()))].slice(0, 4).map(capitalize);
  if (deduped.length < 2) return null;

  return question(
    'vocabulary',
    `Which word from the text appears in this sentence?\n"${sentence}"`,
    shuffleOptions(deduped, displayTarget), displayTarget,
    `"${displayTarget}" is used in this sentence.`, sentence,
  );
};

const makeFindEvidence = (sentences: string[], preview: string): ReadingQuestion | null => {
  const claim = sentences[1] ?? sentences[0] ?? preview;
  if (!claim) return null;
  const correct = truncate(claim, 110, 107);
  const options = [correct];
  for (const sentence of sentences.slice(0, 3)) {
    if (options.length >= 4) break;
    const snippet = truncate(sentence, 90, 87);
    if (!options.includes(snippet)) options.push(snippet);
  }
  while (options.length < 4) options.push('No supporting sentence in the text.');
  return question(
    'findEvidence', 'Which sentence best supports the main point of the passage?',
    shuffleOptions(options, correct), correct,
    "This sentence supports the passage's main idea.", claim,
  );
};

const makeOrderReconstruction = (sentences: string[]): ReadingQuestion | null => {
  if (sentences.length < 3) return null;
  const numbered = (list: string[]) => list.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const correct = numbered(sentences);
  let shuffled = shuffleOptions([...sentences], sentences[0]);
  if (shuffled.join('|') === sentences.join('|')) shuffled = [...sentences].reverse();
  const wrongA = numbered(shuffled);
  const wrongB = numbered([...sentences].reverse());
  const options = shuffleOptions(
    [correct, wrongA, wrongB, sentences.slice(1).join(' ')],
    correct,
  );
  return question(
    'orderReconstruction', 'Choose the correct order of these sentences:',
    options, correct, 'This order matches the original text flow.',
  );
};

export interface GenerateQuestionsInput {
  content: string;
  title: string;
  preview: string;
  focus: ReadingFocus;
  enabledTypes: ReadingQuestionType[];
  maxQuestions?: number;
}

export const generateReadingQuestions = (input: GenerateQuestionsInput): ReadingQuestion[] => {
  const content = input.content.trim();
  if (content.length === 0) return [];

  const maxQuestions = input.maxQuestions ?? 8;
  const enabled = new Set(
    input.enabledTypes.length > 0 ? input.enabledTypes : DEFAULT_QUESTION_TYPES,
  );
  const sentences = readingSentences(input.content);

  const questions: ReadingQuestion[] = [];
  const usedPrompts = new Set<string>();
  const append = (q: ReadingQuestion | null) => {
    if (!q || !enabled.has(q.type) || usedPrompts.has(q.prompt)) return;
    usedPrompts.add(q.prompt);
    questions.push(q);
  };

  if (enabled.has('comprehension')) {
    append(makeComprehension(input.title, input.preview, sentences, input.focus));
  }
  if (enabled.has('trueFalse')) {
    sentences.slice(0, 4).forEach((sentence, index) => {
      if (questions.length >= maxQuestions) return;
      append(makeTrueFalse(sentence, index % 2 === 0));
    });
  }
  if (enabled.has('vocabulary')) {
    for (const sentence of sentences.slice(0, 3)) {
      if (questions.length >= maxQuestions) break;
      append(makeVocabulary(sentence, input.content));
    }
  }
  if (enabled.has('fillGap')) {
    for (const sentence of sentences) {
      if (questions.length >= maxQuestions) break;
      append(makeFillGap(sentence, input.content));
    }
  }
  if (enabled.has('findEvidence')) {
    append(makeFindEvidence(sentences, input.preview));
  }
  if (enabled.has('orderReconstruction') && sentences.length >= 3) {
    append(makeOrderReconstruction(sentences.slice(0, 4)));
  }
  if (input.focus === 'detailedComprehension' || input.focus === 'grammarAwareness') {
    for (const sentence of sentences.slice(1, 3)) {
      if (questions.length >= maxQuestions) break;
      append(makeComprehensionDetail(sentence, input.title));
    }
  }
  if (questions.length === 0 && enabled.has('comprehension')) {
    append(makeComprehension(input.title, input.preview, sentences, input.focus));
  }

  return questions.slice(0, maxQuestions);
};

/** iOS ReadingSessionService: 8 questions when focus is vocabulary, else 7. */
export const maxQuestionsForFocus = (focus: ReadingFocus): number =>
  focus === 'vocabulary' ? 8 : 7;
