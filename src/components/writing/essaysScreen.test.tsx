/* Whole-screen test for /practice/writing/essays: every button on the screen,
   pressed the way a learner would, with the AI / LanguageTool / Firebase
   services replaced by fakes. Mirrors the iOS EssayPracticeViewModel flows. */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { EssaysScreen } from './EssaysScreen';
import type { GeneratedEssayTask } from '@/lib/essayTypes';
import type { FlashcardSet } from '@/lib/models';

const fakes = vi.hoisted(() => ({
  generateSuggestedTask: vi.fn(),
  generateCustomTopicTask: vi.fn(),
  generateHint: vi.fn(),
  checkGrammar: vi.fn(),
  translate: vi.fn(),
  findSynonyms: vi.fn(),
  recordPractice: vi.fn(),
  saveMistake: vi.fn(),
  sets: [] as unknown[],
}));

vi.mock('@/lib/essayService', () => ({
  generateSuggestedTask: fakes.generateSuggestedTask,
  generateCustomTopicTask: fakes.generateCustomTopicTask,
  generateHint: fakes.generateHint,
}));
vi.mock('@/lib/grammarCheck', () => ({ checkGrammar: fakes.checkGrammar }));
vi.mock('@/lib/essayAssistance', () => ({
  translate: fakes.translate,
  findSynonyms: fakes.findSynonyms,
}));
vi.mock('@/lib/dailyPracticeStats', () => ({ recordPractice: fakes.recordPractice }));
vi.mock('@/hooks/useSets', () => ({
  useSetsQuery: () => ({ data: fakes.sets, isLoading: false }),
}));
vi.mock('@/hooks/useSaveMistake', () => ({
  useSaveMistake: () => ({ stateFor: () => 'idle', reasonFor: () => null, save: fakes.saveMistake }),
}));

const makeTask = (title: string, level: GeneratedEssayTask['detectedLevel'] = 'B1'): GeneratedEssayTask => ({
  id: title,
  title,
  task: `Write about ${title}.`,
  detectedLevel: level,
  estimatedTimeMinutes: 10,
  wordLimitMin: 3,
  wordLimitMax: 20,
  quickTips: ['Tip one'],
});

const set: FlashcardSet = {
  id: 'set-1',
  ownerUID: 'u',
  ownerEmail: '',
  title: 'Home words',
  description: '',
  privacy: 'private',
  colorHex: '#2F5BFF',
  icon: { kind: 'systemName', name: 'star.fill' } as FlashcardSet['icon'],
  cards: [
    { id: 'c1', word: 'casa', translation: 'house', example: '' },
    { id: 'c2', word: 'mesa', translation: 'table', example: '' },
  ],
  createdAt: 0,
  updatedAt: 0,
};

const renderScreen = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EssaysScreen />
    </QueryClientProvider>,
  );
};

const editor = () => screen.getByPlaceholderText('Start writing your essay here...');
const tile = (name: RegExp) => screen.getByRole('button', { name });

beforeEach(() => {
  vi.clearAllMocks();
  fakes.sets = [set];
  fakes.generateSuggestedTask.mockResolvedValue(makeTask('Rainy days'));
  fakes.generateCustomTopicTask.mockResolvedValue(makeTask('My garden', 'A2'));
  fakes.generateHint.mockResolvedValue({ id: 'h1', text: 'Describe the sounds.', category: 'content' });
  fakes.checkGrammar.mockResolvedValue([]);
  fakes.translate.mockResolvedValue('lluvia');
  fakes.findSynonyms.mockResolvedValue([{ id: 's1', word: 'big', result: 'huge', detail: null }]);
});

describe('EssaysScreen — every button', () => {
  it('makes a suggested topic on open, and the refresh button makes another', async () => {
    const user = userEvent.setup();
    renderScreen();
    expect(await screen.findByText('Rainy days')).toBeInTheDocument();
    expect(fakes.generateSuggestedTask).toHaveBeenCalledTimes(1);

    fakes.generateSuggestedTask.mockResolvedValueOnce(makeTask('City life'));
    await user.click(screen.getByRole('button', { name: 'New topic' }));
    expect(await screen.findByText('City life')).toBeInTheDocument();
  });

  it('My topic: type a topic, generate, then back on Suggested a new task is made', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Rainy days');

    await user.click(screen.getByRole('tab', { name: 'My topic' }));
    expect(screen.queryByText('Rainy days')).not.toBeInTheDocument();
    const generate = screen.getByRole('button', { name: /Generate task/ });
    expect(generate).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Write your own essay topic...'), 'gardening');
    await user.click(generate);
    expect(await screen.findByText('My garden')).toBeInTheDocument();
    expect(fakes.generateCustomTopicTask).toHaveBeenCalledWith('gardening', expect.anything(), expect.anything());

    fakes.generateSuggestedTask.mockResolvedValueOnce(makeTask('Sea trip'));
    await user.click(screen.getByRole('tab', { name: 'Suggested' }));
    expect(await screen.findByText('Sea trip')).toBeInTheDocument();
  });

  it('language and level pickers change the setup', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Rainy days');

    await user.click(screen.getByRole('button', { name: /Language/ }));
    await user.click(screen.getByRole('option', { name: /Spanish/ }));
    expect(screen.getByRole('button', { name: /Language/ })).toHaveTextContent('Spanish');

    await user.click(screen.getByRole('button', { name: /Difficulty/ }));
    await user.click(screen.getByRole('option', { name: /A1/ }));
    expect(screen.getByText('Hints left: 15')).toBeInTheDocument();
  });

  it('Hint opens the hint window and keeps the hint in the card', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Rainy days');

    await user.click(tile(/^Get hint/));
    const dialog = await screen.findByRole('dialog', { name: 'Writing hint' });
    expect(await within(dialog).findByText('Describe the sounds.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Got it' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(screen.getByText('Describe the sounds.')).toBeInTheDocument();
    expect(screen.getByText('Hints left: 6')).toBeInTheDocument();
  });

  it('Translate and Synonym find results and use up one each', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Rainy days');

    await user.click(tile(/^Translate/));
    let dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Spanish')).toBeInTheDocument(); // From (English essay)
    await user.type(within(dialog).getByPlaceholderText('Enter a word or short phrase'), 'lluvia');
    await user.click(within(dialog).getByRole('button', { name: 'Translate' }));
    expect(await within(dialog).findByText('lluvia', { selector: '*:not(textarea)' })).toBeInTheDocument();
    await user.click(within(dialog).getAllByRole('button', { name: 'Close' })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(tile(/^Translate/)).toHaveTextContent('9 left');

    await user.click(tile(/^Synonym/));
    dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('Enter a word'), 'big');
    await user.click(within(dialog).getByRole('button', { name: 'Find synonyms' }));
    expect(await within(dialog).findByText('huge')).toBeInTheDocument();
    await user.click(within(dialog).getAllByRole('button', { name: 'Close' })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(tile(/^Synonym/)).toHaveTextContent('5 left');
  });

  it('Translate refuses a phrase longer than the level allows', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Rainy days');

    await user.click(tile(/^Translate/));
    const dialog = await screen.findByRole('dialog');
    await user.type(
      within(dialog).getByPlaceholderText('Enter a word or short phrase'),
      'one two three four five six seven eight nine ten eleven',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Translate' }));
    expect(await within(dialog).findByText('Use up to 10 words.')).toBeInTheDocument();
    expect(fakes.translate).not.toHaveBeenCalled();
  });

  it('Sets: pick a set, pick words, see them in the card and remove one', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Rainy days');

    await user.click(tile(/^Sets/));
    await user.click(await screen.findByText('Home words'));
    const dialog = await screen.findByRole('dialog', { name: 'Home words' });
    await user.click(within(dialog).getByRole('checkbox', { name: /casa/ }));
    await user.click(within(dialog).getByRole('checkbox', { name: /mesa/ }));
    expect(within(dialog).getByText('2 selected')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(screen.getByText('casa — house')).toBeInTheDocument();
    expect(screen.getByText('mesa — table')).toBeInTheDocument();
    expect(tile(/^Sets/)).toHaveTextContent('2 selected');

    await user.click(screen.getByRole('button', { name: 'Remove casa' }));
    expect(screen.queryByText('casa — house')).not.toBeInTheDocument();
    expect(tile(/^Sets/)).toHaveTextContent('1 selected');
  });

  it('Check scores the essay, a re-check only counts new words, Reset clears it all', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Rainy days');

    const check = screen.getByRole('button', { name: /Check my essay/ });
    expect(check).toBeDisabled();

    fireEvent.change(editor(), { target: { value: 'It rains a lot today' } });
    expect(check).toBeEnabled();
    await user.click(check);
    expect(await screen.findByText('Essay score')).toBeInTheDocument();
    expect(fakes.recordPractice).toHaveBeenLastCalledWith(
      expect.objectContaining({ skill: 'writing', value: 5 }),
    );

    fireEvent.change(editor(), { target: { value: 'It rains a lot today and tonight' } });
    await user.click(screen.getByRole('button', { name: /Check my essay/ }));
    await screen.findByText('Essay score');
    expect(fakes.recordPractice).toHaveBeenLastCalledWith(expect.objectContaining({ value: 2 }));

    await user.click(tile(/^Translate/));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('Enter a word or short phrase'), 'sol');
    await user.click(within(dialog).getByRole('button', { name: 'Translate' }));
    await within(dialog).findByText('lluvia');
    await user.click(within(dialog).getAllByRole('button', { name: 'Close' })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(tile(/^Translate/)).toHaveTextContent('9 left');

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(editor()).toHaveValue('');
    expect(screen.queryByText('Essay score')).not.toBeInTheDocument();
    expect(tile(/^Translate/)).toHaveTextContent('10 left');
  });

  it('a grammar issue can be saved to Notes', async () => {
    const user = userEvent.setup();
    fakes.checkGrammar.mockResolvedValue([
      {
        id: 'i1',
        message: 'Possible spelling mistake',
        incorrectText: 'teh',
        suggestedCorrection: 'the',
        offset: 0,
        length: 3,
        category: 'grammar',
      },
    ]);
    renderScreen();
    await screen.findByText('Rainy days');

    fireEvent.change(editor(), { target: { value: 'teh rain is loud' } });
    await user.click(screen.getByRole('button', { name: /Check my essay/ }));
    expect(await screen.findByText(/Possible spelling mistake/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Save to Notes/ }));
    await waitFor(() =>
      expect(fakes.saveMistake).toHaveBeenCalledWith(
        'i1',
        expect.objectContaining({ original: 'teh', corrected: 'the' }),
      ),
    );
  });

  it('when topic generation fails, the button tries again', async () => {
    const user = userEvent.setup();
    fakes.generateSuggestedTask.mockRejectedValueOnce(new Error('Network down'));
    renderScreen();
    expect(await screen.findByText('Network down')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Generate topic/ }));
    expect(await screen.findByText('Rainy days')).toBeInTheDocument();
  });
});
