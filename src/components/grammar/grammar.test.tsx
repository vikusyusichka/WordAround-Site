import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { GrammarTopicCard } from './GrammarTopicCard';
import { GrammarNoteTypePicker } from './GrammarNoteTypePicker';
import { GrammarBlockEditor } from './GrammarBlockEditor';
import { AddBlockMenu } from './AddBlockMenu';
import { QuizQuestionView } from './QuizQuestionView';
import { QuizResultView } from './QuizResultView';
import type { AnsweredQuestion } from '@/lib/grammarQuizSession';
import type { GrammarNoteBlock, GrammarNoteTopic, GrammarQuizQuestion } from '@/lib/models';

const topic: GrammarNoteTopic = {
  id: 't1', ownerUID: 'u', title: 'Spanish verbs', description: 'ser vs estar',
  icon: 'book.pages.fill', colorHex: '#4F7CFF', notesCount: 3,
  isPinned: false, isMistakesTopic: false, createdAt: 0, updatedAt: 0,
};

describe('GrammarTopicCard', () => {
  it('renders title, description, note count; fires open + delete', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(<GrammarTopicCard topic={topic} onOpen={onOpen} onDelete={onDelete} />);
    expect(screen.getByText('Spanish verbs')).toBeInTheDocument();
    expect(screen.getByText('ser vs estar')).toBeInTheDocument();
    expect(screen.getByText('3 notes')).toBeInTheDocument();
    await user.click(screen.getByText('Spanish verbs'));
    expect(onOpen).toHaveBeenCalled();
    // Delete button is the only icon-only button (aria-label present).
    const del = screen.getAllByRole('button').find((b) => b !== screen.getByText('Spanish verbs').closest('button'));
    await user.click(del!);
    expect(onDelete).toHaveBeenCalled();
  });
});

describe('GrammarNoteTypePicker', () => {
  it('renders 6 types and fires onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GrammarNoteTypePicker value="standard" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: /Standard/ })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: /Rule/ }));
    expect(onChange).toHaveBeenCalledWith('rule');
  });
});

describe('GrammarBlockEditor', () => {
  const paragraph: GrammarNoteBlock = { id: 'b1', type: 'paragraph', text: 'hi', items: [], order: 0 };
  const bullet: GrammarNoteBlock = { id: 'b2', type: 'bulletList', text: '', items: ['one'], order: 1 };

  it('paragraph edit dispatches UPDATE_BLOCK', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(<GrammarBlockEditor block={paragraph} isFirst isLast={false} dispatch={dispatch} />);
    const ta = screen.getByPlaceholderText(/Write your explanation/i);
    await user.type(ta, '!');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'UPDATE_BLOCK', id: 'b1' }),
    );
  });

  it('bulletList add-item dispatches ADD_LIST_ITEM', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(<GrammarBlockEditor block={bullet} isFirst={false} isLast dispatch={dispatch} />);
    await user.click(screen.getByText(/add item/i));
    expect(dispatch).toHaveBeenCalledWith({ type: 'ADD_LIST_ITEM', id: 'b2' });
  });

  it('move-up is disabled on the first block', () => {
    const dispatch = vi.fn();
    render(<GrammarBlockEditor block={paragraph} isFirst isLast dispatch={dispatch} />);
    expect(screen.getByRole('button', { name: /move up/i })).toBeDisabled();
  });
});

describe('AddBlockMenu', () => {
  it('expands and dispatches the chosen block type', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddBlockMenu onAdd={onAdd} />);
    await user.click(screen.getByRole('button', { name: /add block/i }));
    // "Example" block type option
    await user.click(screen.getByText('Example'));
    expect(onAdd).toHaveBeenCalledWith('example');
  });
});

describe('QuizQuestionView', () => {
  const mc: GrammarQuizQuestion = {
    id: 'q1', type: 'multipleChoice', questionText: 'Which rule?',
    options: ['Alpha', 'Beta'], correctAnswer: 'Alpha', explanation: 'why', order: 0,
  };
  const gap: GrammarQuizQuestion = {
    id: 'q2', type: 'fillGap', questionText: 'Fill: I _____ tall',
    options: [], correctAnswer: 'am', order: 0,
  };

  it('multiple choice: tapping an option submits + shows feedback', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onAdvance = vi.fn();
    render(<QuizQuestionView question={mc} isLast={false} onSubmit={onSubmit} onAdvance={onAdvance} />);
    await user.click(screen.getByRole('button', { name: /Alpha/ }));
    expect(onSubmit).toHaveBeenCalledWith('Alpha');
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(onAdvance).toHaveBeenCalled();
  });

  it('fill gap: typed answer submits via button; wrong shows correct answer', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<QuizQuestionView question={gap} isLast onSubmit={onSubmit} onAdvance={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/missing word/i), 'is');
    await user.click(screen.getByRole('button', { name: /Submit answer/i }));
    expect(onSubmit).toHaveBeenCalledWith('is');
    expect(screen.getByText('Incorrect')).toBeInTheDocument();
    expect(screen.getByText(/Correct answer: am/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Finish/ })).toBeInTheDocument();
  });
});

describe('QuizResultView', () => {
  it('shows score, grade and incorrect/correct sections', () => {
    const answered: AnsweredQuestion[] = [
      {
        question: { id: 'q1', type: 'shortAnswer', questionText: 'Q one', options: [], correctAnswer: 'a', order: 0 },
        userAnswer: 'a', isCorrect: true,
      },
      {
        question: { id: 'q2', type: 'shortAnswer', questionText: 'Q two', options: [], correctAnswer: 'b', order: 1 },
        userAnswer: 'x', isCorrect: false,
      },
    ];
    render(
      <QuizResultView
        score={50} correct={1} total={2} answered={answered}
        onTryAgain={vi.fn()} onReviewNote={vi.fn()} onDone={vi.fn()}
      />,
    );
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Keep practicing')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 correct')).toBeInTheDocument();
    expect(screen.getByText(/Your answer: x/)).toBeInTheDocument();
    expect(screen.getByText('Q one')).toBeInTheDocument();
  });
});
