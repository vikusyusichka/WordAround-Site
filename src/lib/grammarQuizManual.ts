/* Hand-written quiz questions — the validation + assembly half of
   AddManualQuizQuestionSheet, kept pure so the rules are testable. */
import type { GrammarQuizQuestion, GrammarQuizQuestionType } from '@/lib/models';

export type ManualQuestionError =
  | 'questionRequired'
  | 'optionsRequired'
  | 'answerRequired'
  | 'answerNotAnOption'
  | 'blankRequired';

export interface ManualQuestionDraft {
  type: GrammarQuizQuestionType;
  questionText: string;
  /** Four slots for multiple choice; empty ones are dropped. */
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export const EMPTY_MANUAL_DRAFT: ManualQuestionDraft = {
  type: 'shortAnswer',
  questionText: '',
  options: ['', '', '', ''],
  correctAnswer: '',
  explanation: '',
};

/** iOS `validationError` — the first failing rule, or null when valid. */
export const validateManualQuestion = (draft: ManualQuestionDraft): ManualQuestionError | null => {
  const question = draft.questionText.trim();
  if (question.length === 0) return 'questionRequired';

  const answer = draft.correctAnswer.trim();
  switch (draft.type) {
    case 'multipleChoice': {
      const options = draft.options.map((o) => o.trim()).filter((o) => o.length > 0);
      if (options.length < 2) return 'optionsRequired';
      if (answer.length === 0) return 'answerRequired';
      if (!options.some((o) => o.toLowerCase() === answer.toLowerCase())) return 'answerNotAnOption';
      return null;
    }
    case 'trueFalse':
      return null;
    case 'fillGap':
      if (!question.includes('_')) return 'blankRequired';
      if (answer.length === 0) return 'answerRequired';
      return null;
    case 'shortAnswer':
    default:
      return answer.length === 0 ? 'answerRequired' : null;
  }
};

export const manualDraftToQuestion = (
  draft: ManualQuestionDraft,
  order: number,
): GrammarQuizQuestion => ({
  id: crypto.randomUUID(),
  type: draft.type,
  questionText: draft.questionText.trim(),
  options:
    draft.type === 'multipleChoice'
      ? draft.options.map((o) => o.trim()).filter((o) => o.length > 0)
      : draft.type === 'trueFalse'
        ? ['True', 'False']
        : [],
  correctAnswer:
    draft.type === 'trueFalse' ? draft.correctAnswer || 'True' : draft.correctAnswer.trim(),
  explanation: draft.explanation.trim() || undefined,
  order,
});
