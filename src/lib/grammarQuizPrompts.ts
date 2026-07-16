/* AI quiz prompt — web port of GrammarQuizAIPromptBuilder.swift. The prompt
   text and the response contract are verbatim from iOS so both platforms get
   identical model behavior (web omits the language lines — the web note model
   has no languageCode/Name yet). */
import type { GrammarNote, GrammarQuizQuestionType } from '@/lib/models';

export const QUIZ_QUESTION_TYPES: GrammarQuizQuestionType[] = [
  'multipleChoice', 'trueFalse', 'fillGap', 'shortAnswer',
];

export const QUIZ_RESPONSE_CONTRACT = [
  'Return ONLY a JSON object that matches:',
  '{"questions":[{"type":"multipleChoice|trueFalse|fillGap|shortAnswer", "questionText":"...","options":["..."],"correctAnswer":"...","explanation":"..."}]}',
  'Rules:',
  '- Do not invent grammar unrelated to the provided note content.',
  '- Avoid vague questions.',
  '- Every question must have a non-empty correctAnswer.',
  '- multipleChoice must include exactly 4 distinct options containing the correctAnswer.',
  '- trueFalse correctAnswer must be exactly "True" or "False" and options must be ["True","False"].',
  '- fillGap questionText must contain a single blank "_____" and correctAnswer is the missing word.',
  '- explanation should be one short useful sentence.',
].join('\n');

export interface QuizPromptOptions {
  questionCount: number;
  allowedTypes: GrammarQuizQuestionType[];
  focusInstructions?: string;
}

export const buildQuizPrompt = (note: GrammarNote, opts: QuizPromptOptions): string => {
  const effectiveTypes = opts.allowedTypes.length > 0 ? opts.allowedTypes : QUIZ_QUESTION_TYPES;
  const questionCount = Math.max(1, opts.questionCount);
  const focus = opts.focusInstructions?.trim() ?? '';

  const lines: string[] = [];
  lines.push('You are a grammar quiz generator for a language-learning app.');
  lines.push('Stick strictly to the provided note content; never invent grammar unrelated to it.');
  lines.push('');
  lines.push(`Note title: ${note.title.trim()}`);
  lines.push(`Note type: ${note.noteType}`);
  if (focus.length > 0) lines.push(`Focus: ${focus}`);
  lines.push(
    `Generate exactly ${questionCount} questions using only these types: ${effectiveTypes.join(', ')}.`,
  );
  lines.push('');
  lines.push('Note content blocks:');
  const usableBlocks = note.contentBlocks
    .filter((b) => b.text.trim().length > 0)
    .sort((a, b) => a.order - b.order);
  for (const block of usableBlocks) {
    let entry = `- [${block.type}] ${block.text}`;
    const secondary = block.secondaryText?.trim() ?? '';
    if (secondary.length > 0) entry += ` — alt: ${secondary}`;
    const items = block.items.filter((i) => i.length > 0);
    if (items.length > 0) entry += ` — items: ${items.join(' / ')}`;
    lines.push(entry);
  }
  lines.push('');
  lines.push(QUIZ_RESPONSE_CONTRACT);
  return lines.join('\n');
};
