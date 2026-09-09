/* Every notes setting, pinned to the behaviour it promises.

   The settings screen offers fourteen switches, and until this file existed
   only four of them were covered by a test — the three mistake-recipe toggles
   and "group mistakes by topic", all in grammarMistakeService.test.ts. The
   rest were verified by reading the code, which does not survive a refactor.
   A switch that silently stops doing anything is worse than no switch: the
   learner changes it, sees no difference, and stops trusting the screen.

   Each test here changes one setting and asserts the one thing it claims to
   change. */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { BlockToolbarTray } from '@/components/grammar/BlockToolbarTray';
import { GrammarNoteRow } from '@/components/grammar/GrammarNoteRow';
import { GrammarNotesEmptyState } from '@/components/grammar/GrammarNotesEmptyState';
import { QuickNoteSheet } from '@/components/grammar/QuickNoteSheet';
import { makeGrammarNote, makeGrammarTopic } from '@/lib/grammarFactories';
import { sortNotes } from '@/lib/grammarNoteService';
import { grammarSettingsSnapshot, useGrammarSettings } from './grammarSettingsStore';
import type { GrammarNote } from '@/lib/models';

const set = useGrammarSettings.getState().set;

beforeEach(() => {
  useGrammarSettings.getState().resetAll();
});

const note = (patch: Partial<GrammarNote> = {}): GrammarNote => ({
  ...makeGrammarNote({ ownerUID: 'u', topicId: 't', title: 'Note' }),
  ...patch,
});

const rowProps = {
  onOpen: vi.fn(),
  onDelete: vi.fn(),
  onTogglePinned: vi.fn(),
  onToggleFavorite: vi.fn(),
};

describe('groupsPinnedNotesFirst', () => {
  const pinned = note({ id: 'p', title: 'Pinned', isPinned: true, updatedAt: 1 });
  const recent = note({ id: 'r', title: 'Recent', isPinned: false, updatedAt: 999 });

  it('on: a pinned note outranks a newer unpinned one', () => {
    expect(sortNotes([recent, pinned], { pinnedFirst: true })[0].id).toBe('p');
  });

  it('off: the newer note wins and pinning stops affecting order', () => {
    expect(sortNotes([recent, pinned], { pinnedFirst: false })[0].id).toBe('r');
  });
});

describe('usesCompactCards', () => {
  const withPreview = note({ previewText: 'A preview line', tags: ['grammar'] });

  it('off: the row shows the preview and tags', () => {
    render(<GrammarNoteRow note={withPreview} {...rowProps} />);
    expect(screen.getByText('A preview line')).toBeInTheDocument();
    expect(screen.getByText('#grammar')).toBeInTheDocument();
  });

  it('on: the row drops them', () => {
    set('usesCompactCards', true);
    render(<GrammarNoteRow note={withPreview} {...rowProps} />);
    expect(screen.queryByText('A preview line')).not.toBeInTheDocument();
    expect(screen.queryByText('#grammar')).not.toBeInTheDocument();
  });
});

describe('showsMistakeHighlights', () => {
  const mistake = note({ noteType: 'mistake', isMistakeNote: true });

  /* The warm tint is an inline style, since the colour comes from the note
     type rather than from a class. Both branches are now color-mix over a
     variable, so the assertion is on WHICH colour is being mixed: the note
     type's own, or the plain card surface. */
  const backgroundOf = (title: string) =>
    screen.getByRole('button', { name: title }).style.background;

  it('on: a mistake note is tinted', () => {
    render(<GrammarNoteRow note={mistake} {...rowProps} />);
    expect(backgroundOf('Note')).toContain('--color-accent-pink');
  });

  it('off: it looks like any other note', () => {
    set('showsMistakeHighlights', false);
    render(<GrammarNoteRow note={mistake} {...rowProps} />);
    const bg = backgroundOf('Note');
    expect(bg).toContain('--color-surface');
    expect(bg).not.toContain('--color-accent-pink');
  });
});

describe('allowQuickQuizzes', () => {
  /* The quiz block lives under "More" in the tray, so the menu has to be
     opened before the setting's effect is visible either way. */
  const openMore = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: /more/i }));

  it('on: the block tray offers a quiz block', async () => {
    const user = userEvent.setup();
    render(<BlockToolbarTray allowsQuiz onAdd={vi.fn()} />);
    await openMore(user);
    expect(screen.getByText('Quiz')).toBeInTheDocument();
  });

  it('off: the quiz block is gone', async () => {
    const user = userEvent.setup();
    render(<BlockToolbarTray allowsQuiz={false} onAdd={vi.fn()} />);
    await openMore(user);
    expect(screen.queryByText('Quiz')).not.toBeInTheDocument();
  });
});

describe('showsHelperTips', () => {
  it('on: an empty state carries its tip', () => {
    render(<GrammarNotesEmptyState title="Nothing" body="here" tip="Try this" />);
    expect(screen.getByText('Try this')).toBeInTheDocument();
  });

  it('off: the tip is withheld', () => {
    set('showsHelperTips', false);
    render(<GrammarNotesEmptyState title="Nothing" body="here" tip="Try this" />);
    expect(screen.queryByText('Try this')).not.toBeInTheDocument();
  });
});

describe('the quick-note sheet settings', () => {
  const topic = makeGrammarTopic({ id: 't1', ownerUID: 'u', title: 'Verbs', now: 0 });
  const sheet = (onSave = vi.fn()) => (
    <QuickNoteSheet
      open
      topics={[topic]}
      lockedTopicId="t1"
      isSaving={false}
      onSave={onSave}
      onClose={vi.fn()}
    />
  );

  it('defaultNoteType selects that type when the sheet opens', () => {
    set('defaultNoteType', 'rule');
    render(sheet());
    expect(screen.getByRole('button', { name: 'Rule' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  /* The sheet reports the choice as onSave's third argument; the routes then
     navigate to the editor with it. */
  it('opensEditorAfterQuickSave is reported on save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(sheet(onSave));
    await user.type(screen.getByPlaceholderText('Example: Ser vs Estar'), 'A title');
    await user.click(screen.getByRole('button', { name: 'Save quick note' }));
    expect(onSave).toHaveBeenCalledWith(expect.anything(), topic, true);
  });

  it('and reports false once it is switched off', async () => {
    set('opensEditorAfterQuickSave', false);
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(sheet(onSave));
    await user.type(screen.getByPlaceholderText('Example: Ser vs Estar'), 'A title');
    await user.click(screen.getByRole('button', { name: 'Save quick note' }));
    expect(onSave).toHaveBeenCalledWith(expect.anything(), topic, false);
  });
});

describe('the settings snapshot', () => {
  /* Services read settings through the snapshot rather than the hook. A key
     missing from it reads as undefined and the feature silently defaults —
     which is exactly how a switch stops working without anyone noticing. */
  it('carries every key the store defines', () => {
    const snapshot = grammarSettingsSnapshot();
    const stored = useGrammarSettings.getState();
    for (const key of Object.keys(snapshot) as (keyof typeof snapshot)[]) {
      expect(snapshot[key]).toEqual(stored[key]);
    }
    expect(Object.keys(snapshot)).toHaveLength(14);
  });

  it('reflects a change immediately, so a service reads the current value', () => {
    expect(grammarSettingsSnapshot().autoAddNotesToReview).toBe(true);
    set('autoAddNotesToReview', false);
    expect(grammarSettingsSnapshot().autoAddNotesToReview).toBe(false);
  });

  it('survives a round trip through localStorage', () => {
    set('usesCompactCards', true);
    set('defaultNoteType', 'cheatSheet');
    expect(localStorage.getItem('grammarNotes.usesCompactCards')).toBe('true');
    expect(localStorage.getItem('grammarNotes.defaultNoteType')).toBe('cheatSheet');
  });
});
