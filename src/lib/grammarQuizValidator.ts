/* Quiz question normalization — web port of GrammarQuizQuestionValidator.swift.
   Applied to every generation path (AI and smart-local) before saving. */
import type { GrammarQuizQuestion } from '@/lib/models';

export class GrammarQuizValidationError extends Error {
  code: 'empty' | 'invalidQuestion';
  index?: number;
  constructor(code: 'empty' | 'invalidQuestion', message: string, index?: number) {
    super(message);
    this.code = code;
    this.index = index;
  }
}

const invalid = (index: number, reason: string) =>
  new GrammarQuizValidationError('invalidQuestion', `Question ${index + 1} is invalid: ${reason}`, index);

/** Validate + normalize; throws GrammarQuizValidationError on bad input. */
export const validateQuizQuestions = (
  questions: GrammarQuizQuestion[],
): GrammarQuizQuestion[] => {
  if (questions.length === 0) {
    throw new GrammarQuizValidationError('empty', 'No quiz questions were created. Please try again.');
  }

  const seenIds = new Set<string>();
  return questions.map((raw, index) => {
    const q: GrammarQuizQuestion = { ...raw, options: [...raw.options] };

    const trimmedText = q.questionText.trim();
    const trimmedAnswer = q.correctAnswer.trim();
    if (trimmedText.length === 0) throw invalid(index, 'missing question text');
    if (trimmedAnswer.length === 0) throw invalid(index, 'missing correct answer');
    q.questionText = trimmedText;
    q.correctAnswer = trimmedAnswer;
    const explanation = q.explanation?.trim() ?? '';
    q.explanation = explanation.length > 0 ? explanation : undefined;

    switch (q.type) {
      case 'multipleChoice': {
        const opts = q.options.map((o) => o.trim()).filter((o) => o.length > 0);
        if (opts.length < 2) throw invalid(index, 'multiple choice needs at least 2 options');
        if (!opts.some((o) => o.toLowerCase() === trimmedAnswer.toLowerCase())) {
          throw invalid(index, 'options must contain the correct answer');
        }
        const seen = new Set<string>();
        q.options = opts.filter((opt) => {
          const key = opt.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        break;
      }
      case 'trueFalse': {
        const normalized = trimmedAnswer.toLowerCase();
        if (normalized !== 'true' && normalized !== 'false') {
          throw invalid(index, 'true/false answer must be True or False');
        }
        q.correctAnswer = normalized === 'true' ? 'True' : 'False';
        q.options = ['True', 'False'];
        break;
      }
      case 'fillGap': {
        if (!trimmedText.includes('_')) {
          throw invalid(index, 'fill gap must contain a blank (e.g. _____)');
        }
        q.options = [];
        break;
      }
      case 'shortAnswer':
        q.options = [];
        break;
    }

    if (q.id.length === 0 || seenIds.has(q.id)) q.id = crypto.randomUUID();
    seenIds.add(q.id);
    q.order = index;
    return q;
  });
};
