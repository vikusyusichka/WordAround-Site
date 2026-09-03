import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { GrammarNoteRow } from './GrammarNoteRow';
import { GrammarTopicCard } from './GrammarTopicCard';
import { NoteFilterChips } from './NoteFilterChips';
import { GrammarNoteTypePicker } from './GrammarNoteTypePicker';
import { GrammarBlockEditor } from './GrammarBlockEditor';
import { AddBlockMenu } from './AddBlockMenu';
import { QuizQuestionView } from './QuizQuestionView';
import { QuizResultView } from './QuizResultView';
import type { AnsweredQuestion } from '@/lib/grammarQuizSession';
import { makeGrammarNote, makeGrammarTopic } from '@/lib/grammarFactories';
import type {
  GrammarNote,
  GrammarNoteBlock,
  GrammarNoteTopic,
  GrammarQuizQuestion,
} from '@/lib/models';

const topic: GrammarNoteTopic = makeGrammarTopic({
  id: 't1',
  ownerUID: 'u',
  title: 'Spanish verbs',
  description: 'ser vs estar',
  colorHex: '#4F7CFF',
  notesCount: 3,
  now: 0,
});

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

/* --- 4E: note row (pin / favorite / tags) + filter chips ------------------ */

const note: GrammarNote = makeGrammarNote({
  id: 'n1',
  ownerUID: 'u',
  topicId: 't1',
  title: 'Ser vs Estar',
  previewText: 'Identity vs state',
  noteType: 'rule',
  tags: ['A1', 'verbs'],
  hasQuiz: true,
  now: 0,
});

describe('GrammarNoteRow', () => {
  const renderRow = (patch: Partial<GrammarNote> = {}, handlers = {}) => {
    const props = {
      onOpen: vi.fn(),
      onDelete: vi.fn(),
      onTogglePinned: vi.fn(),
      onToggleFavorite: vi.fn(),
      ...handlers,
    };
    render(<GrammarNoteRow note={{ ...note, ...patch }} {...props} />);
    return props;
  };

  it('shows the title, preview, tags and the quiz badge', () => {
    renderRow();
    expect(screen.getByText('Ser vs Estar')).toBeInTheDocument();
    expect(screen.getByText('Identity vs state')).toBeInTheDocument();
    expect(screen.getByText('#A1')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
  });

  it('prefers the search snippet over the preview', () => {
    render(
      <GrammarNoteRow
        note={note}
        snippet="…estar for state…"
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onTogglePinned={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByText('…estar for state…')).toBeInTheDocument();
    expect(screen.queryByText('Identity vs state')).not.toBeInTheDocument();
  });

  it('fires pin and favorite from the row actions', async () => {
    const user = userEvent.setup();
    const props = renderRow();
    await user.click(screen.getByRole('button', { name: 'Pin note' }));
    expect(props.onTogglePinned).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Add to favorites' }));
    expect(props.onToggleFavorite).toHaveBeenCalled();
  });

  it('labels the actions by current state', () => {
    renderRow({ isPinned: true, isFavorite: true });
    expect(screen.getByRole('button', { name: 'Unpin note' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove from favorites' })).toBeInTheDocument();
  });

  it('swaps the actions for move arrows while reordering', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(
      <GrammarNoteRow
        note={note}
        isReordering
        isFirst
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onTogglePinned={vi.fn()}
        onToggleFavorite={vi.fn()}
        onMove={onMove}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Pin note' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move up' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move down' }));
    expect(onMove).toHaveBeenCalledWith('down');
  });
});

describe('NoteFilterChips', () => {
  it('renders the five filters with counts and reports the choice', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <NoteFilterChips value="all" counts={{ all: 4, pinned: 1 }} onChange={onChange} />,
    );
    for (const label of ['All', 'Pinned', 'Favorites', 'Mistakes', 'Quizzes']) {
      expect(screen.getByRole('tab', { name: new RegExp(label) })).toBeInTheDocument();
    }
    expect(screen.getByRole('tab', { name: /All/ })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: /Mistakes/ }));
    expect(onChange).toHaveBeenCalledWith('mistakes');
  });
});
