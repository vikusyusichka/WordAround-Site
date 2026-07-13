import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { EssayEditor } from './EssayEditor';
import { EssayLanguageSelector } from './EssayLanguageSelector';
import { EssayTopicCard } from './EssayTopicCard';
import { EssayTopicModePicker } from './EssayTopicModePicker';
import { ESSAY_LANGUAGES, type GeneratedEssayTask } from '@/lib/essayTypes';

const task: GeneratedEssayTask = {
  id: 't-1',
  title: 'A rainy day',
  task: 'Write about a memorable rainy day.',
  detectedLevel: 'B2',
  estimatedTimeMinutes: 12,
  wordLimitMin: 90,
  wordLimitMax: 150,
  quickTips: ['Plan first', 'Use senses', 'Vary sentences'],
};

describe('EssayTopicCard', () => {
  it('renders title, task text, CEFR badge, time, word range, and tips', () => {
    render(<EssayTopicCard task={task} />);
    expect(screen.getByText('A rainy day')).toBeInTheDocument();
    expect(screen.getByText('Write about a memorable rainy day.')).toBeInTheDocument();
    expect(screen.getByText('B2')).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
    expect(screen.getByText(/90-150/)).toBeInTheDocument();
    for (const tip of task.quickTips) {
      expect(screen.getByText(tip)).toBeInTheDocument();
    }
  });
});

describe('EssayTopicModePicker', () => {
  it('marks the active mode and fires onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EssayTopicModePicker value="suggested" onChange={onChange} />);
    expect(screen.getByRole('tab', { name: 'Suggested' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'My topic' }));
    expect(onChange).toHaveBeenCalledWith('custom');
  });
});

describe('EssayLanguageSelector', () => {
  it('renders the current value collapsed', () => {
    render(<EssayLanguageSelector value={ESSAY_LANGUAGES[0]} onChange={() => {}} />);
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    // Options are hidden until expanded.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('expands, lists options, and fires onChange + collapses on select', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EssayLanguageSelector value={ESSAY_LANGUAGES[0]} onChange={onChange} />);
    await user.click(screen.getByRole('button', { expanded: false }));
    // Now listbox is open.
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    const ukrainianOption = screen.getByRole('option', { name: /Ukrainian/ });
    await user.click(ukrainianOption);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ukrainian' }),
    );
    // Listbox closes after select.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('EssayEditor', () => {
  it('renders word count and calls onChange on typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EssayEditor
        task={task}
        text=""
        wordCount={0}
        validation="empty"
        onChange={onChange}
        onReset={() => {}}
      />,
    );
    // Word-count display present.
    expect(screen.getByText(/0 \/ 90-150/)).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText(/Start writing your essay/i);
    await user.type(textarea, 'hi');
    expect(onChange).toHaveBeenCalled();
  });

  it('shows the "below minimum" hint when validation=belowMinimum', () => {
    render(
      <EssayEditor
        task={task}
        text="a b c"
        wordCount={3}
        validation="belowMinimum"
        onChange={() => {}}
        onReset={() => {}}
      />,
    );
    expect(screen.getByText(/Keep going.*at least 90/)).toBeInTheDocument();
  });

  it('shows the "above max" hint when validation=aboveMaximum', () => {
    render(
      <EssayEditor
        task={task}
        text=""
        wordCount={200}
        validation="aboveMaximum"
        onChange={() => {}}
        onReset={() => {}}
      />,
    );
    expect(screen.getByText(/passed the limit/i)).toBeInTheDocument();
  });

  it('fires onReset when Reset is clicked', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(
      <EssayEditor
        task={task}
        text="something"
        wordCount={1}
        validation="belowMinimum"
        onChange={() => {}}
        onReset={onReset}
      />,
    );
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(onReset).toHaveBeenCalled();
  });
});
