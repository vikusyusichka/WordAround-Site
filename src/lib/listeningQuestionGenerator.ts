/* Local listening-question generator — web port of
   LocalListeningQuestionGenerator.swift. Fully offline; language/level are
   accepted by iOS but ignored, so the web omits them. Build order mainIdea →
   details → vocabulary → trueFalse; per-type caps 1/4/4/5; dedup by prompt;
   forced mainIdea fallback. All prompts/clips/stopwords iOS-verbatim. */
import type { ListeningQuestion, ListeningQuestionType } from '@/lib/listeningTypes';
import { LISTENING_QUESTION_TYPES } from '@/lib/listeningTypes';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'were', 'was', 'are',
  'but', 'not', 'you', 'your', 'they', 'them', 'their', 'what', 'when', 'where', 'which',
  'has', 'had', 'his', 'her', 'its', 'our', 'out', 'who', 'she', 'him', 'all', 'can',
]);

const meaningfulWords = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

const clip = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const capitalize = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

const sentencesFrom = (text: string): string[] => {
  const parts: string[] = [];
  let current = '';
  for (const ch of text) {
    current += ch;
    if (ch === '.' || ch === '!' || ch === '?' || ch === '…') {
      const cleaned = current.trim();
      if (cleaned.length >= 8) parts.push(cleaned);
      current = '';
    }
  }
  const tail = current.trim();
  if (tail.length >= 8) parts.push(tail);
  if (parts.length > 0) return parts;
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length >= 8);
};

/** Shuffle + dedupe options, returning the correct answer's new index. */
const shuffleOptions = (options: string[], correct: string): { options: string[]; correctIndex: number } => {
  const seen = new Set<string>();
  const deduped = options.filter((o) => {
    const key = o.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  for (let i = deduped.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deduped[i], deduped[j]] = [deduped[j], deduped[i]];
  }
  let index = deduped.findIndex((o) => o.toLowerCase() === correct.toLowerCase());
  if (index < 0) {
    deduped.unshift(correct);
    index = 0;
  }
  return { options: deduped, correctIndex: index };
};

const question = (
  type: ListeningQuestionType,
  prompt: string,
  options: string[],
  correct: string,
  explanation?: string,
): ListeningQuestion => {
  const shuffled = shuffleOptions(options, correct);
  return {
    id: crypto.randomUUID(),
    prompt,
    options: shuffled.options,
    correctIndex: shuffled.correctIndex,
    type,
    explanation,
  };
};

const MAIN_IDEA_FILLERS = [
  'The passage has no clear topic.',
  'The passage is only a list of dates.',
  'The passage describes a different subject entirely.',
];

const makeMainIdea = (sentences: string[]): ListeningQuestion | null => {
  const lead = sentences[0];
  if (!lead) return null;
  const correct = clip(lead, 120);
  const options = [correct];
  for (const s of sentences.slice(1, 3)) options.push(clip(s, 90));
  let fillerIndex = 0;
  while (options.length < 4) {
    options.push(MAIN_IDEA_FILLERS[Math.min(fillerIndex, MAIN_IDEA_FILLERS.length - 1)]);
    fillerIndex += 1;
  }
  return question(
    'mainIdea',
    'What is the passage mainly about?',
    options,
    correct,
    'This matches the opening, which states the main idea.',
  );
};

const makeDetail = (sentence: string, sentences: string[]): ListeningQuestion | null => {
  if (sentence.length < 20) return null;
  const correct = clip(sentence, 110);
  const options = [correct];
  for (const other of sentences) {
    if (options.length >= 4) break;
    if (other === sentence) continue;
    const clipped = clip(other, 90);
    if (!options.includes(clipped)) options.push(clipped);
  }
  while (options.length < 4) options.push('This is never mentioned in the passage.');
  return question(
    'details',
    'Which statement is mentioned in the passage?',
    options,
    correct,
    'This detail appears in the passage.',
  );
};

const makeVocabulary = (sentence: string, allText: string): ListeningQuestion | null => {
  const candidates = meaningfulWords(sentence).filter((w) => w.length >= 6);
  if (candidates.length === 0) return null;
  const target = candidates.reduce((a, b) => (b.length > a.length ? b : a));
  const display = capitalize(target);
  const options = [display];
  for (const w of meaningfulWords(allText)) {
    if (options.length >= 4) break;
    if (w.toLowerCase() === target.toLowerCase() || w.length < 5) continue;
    const cap = capitalize(w);
    if (!options.some((o) => o.toLowerCase() === cap.toLowerCase())) options.push(cap);
  }
  if (options.length < 2) return null;
  return question(
    'vocabulary',
    'Which of these words was used in the passage?',
    options,
    display,
    `"${display}" appears in the passage.`,
  );
};

const makeTrueFalse = (sentence: string, preferTrue: boolean): ListeningQuestion | null => {
  const words = meaningfulWords(sentence);
  if (words.length < 4) return null;
  if (preferTrue) {
    return {
      id: crypto.randomUUID(),
      prompt: `True or false: ${clip(sentence, 140)}`,
      options: ['True', 'False'],
      correctIndex: 0,
      type: 'trueFalse',
      explanation: 'This statement matches the passage.',
    };
  }
  const target = words.find((w) => w.length >= 5);
  if (!target) return null;
  const idx = sentence.toLowerCase().indexOf(target.toLowerCase());
  if (idx < 0) return null;
  const altered = sentence.slice(0, idx) + 'never' + sentence.slice(idx + target.length);
  if (altered === sentence) return null;
  return {
    id: crypto.randomUUID(),
    prompt: `True or false: ${clip(altered, 140)}`,
    options: ['True', 'False'],
    correctIndex: 1,
    type: 'trueFalse',
    explanation: 'This altered statement does not match the passage.',
  };
};

export const generateListeningQuestions = (params: {
  text: string;
  types: ListeningQuestionType[];
  count: number;
}): ListeningQuestion[] => {
  const enabled = new Set(params.types.length > 0 ? params.types : LISTENING_QUESTION_TYPES);
  const maxQuestions = Math.max(1, params.count);
  const sentences = sentencesFrom(params.text);
  if (sentences.length === 0) return [];

  const questions: ListeningQuestion[] = [];
  const usedPrompts = new Set<string>();
  const append = (q: ListeningQuestion | null) => {
    if (!q || usedPrompts.has(q.prompt) || questions.length >= maxQuestions) return;
    usedPrompts.add(q.prompt);
    questions.push(q);
  };

  if (enabled.has('mainIdea')) append(makeMainIdea(sentences));
  if (enabled.has('details')) {
    for (const sentence of sentences.slice(1, 5)) {
      if (questions.length >= maxQuestions) break;
      append(makeDetail(sentence, sentences));
    }
  }
  if (enabled.has('vocabulary')) {
    for (const sentence of sentences.slice(0, 4)) {
      if (questions.length >= maxQuestions) break;
      append(makeVocabulary(sentence, params.text));
    }
  }
  if (enabled.has('trueFalse')) {
    sentences.slice(0, 5).forEach((sentence, index) => {
      if (questions.length >= maxQuestions) return;
      append(makeTrueFalse(sentence, index % 2 === 0));
    });
  }
  if (questions.length === 0) append(makeMainIdea(sentences));

  return questions.slice(0, maxQuestions);
};
