import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { EssayEditor } from './EssayEditor';
import { EssayHelperToolbar } from './EssayHelperToolbar';
import { EssayHintButton } from './EssayHintButton';
import { EssayLanguageSelector } from './EssayLanguageSelector';
import { EssayScoreCard } from './EssayScoreCard';
import { EssayTopicCard } from './EssayTopicCard';
import { EssayTopicModePicker } from './EssayTopicModePicker';
import { GrammarIssueCard } from './GrammarIssueCard';
import {
  ESSAY_LANGUAGES,
  type EssayScore,
  type GeneratedEssayTask,
  type GrammarIssue,
} from '@/lib/essayTypes';

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
      />,
    );
    expect(screen.getByText(/passed the limit/i)).toBeInTheDocument();
  });

});

/* --- 4C2 additions --------------------------------------------------------- */

const goodScore: EssayScore = {
  total: 84,
  grammar: 92, vocabulary: 78, length: 90,
  complexity: 75, relevance: 70, independence: 100,
  cefrLevel: 'B2',
  qualityLabel: 'Very good',
};

const grammarIssue: GrammarIssue = {
  id: 'g1',
  message: 'Possible spelling mistake found.',
  incorrectText: 'teh',
  suggestedCorrection: 'the',
  offset: 0,
  length: 3,
  category: 'grammar',
};

describe('EssayHintButton', () => {
  it('renders remaining hint count for B1 (7 total)', () => {
    render(
      <EssayHintButton
        difficulty="B1"
        hintsUsedCount={2}
        isRequestingHint={false}
        onRequest={() => {}}
      />,
    );
    expect(screen.getByText(/5\/7 left/i)).toBeInTheDocument();
  });

  it('disables when hints not available for this level (Native = 0)', () => {
    render(
      <EssayHintButton
        difficulty="Native"
        hintsUsedCount={0}
        isRequestingHint={false}
        onRequest={() => {}}
      />,
    );
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText(/not available/i)).toBeInTheDocument();
  });

  it('disables when limit spent', () => {
    render(
      <EssayHintButton
        difficulty="C1"
        hintsUsedCount={3}
        isRequestingHint={false}
        onRequest={() => {}}
      />,
    );
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText(/no hints left/i)).toBeInTheDocument();
  });

  it('fires onRequest when clicked', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(
      <EssayHintButton
        difficulty="B1"
        hintsUsedCount={0}
        isRequestingHint={false}
        onRequest={onRequest}
      />,
    );
    await user.click(screen.getByRole('button'));
    expect(onRequest).toHaveBeenCalled();
  });
});

describe('EssayScoreCard', () => {
  it('renders total, CEFR badge, quality label, and all 6 sub-score labels', () => {
    render(<EssayScoreCard score={goodScore} />);
    expect(screen.getByText('84')).toBeInTheDocument();
    expect(screen.getByText('B2')).toBeInTheDocument();
    expect(screen.getByText('Very good')).toBeInTheDocument();
    // 6 category labels
    for (const label of ['Grammar', 'Vocabulary', 'Length', 'Complexity', 'Relevance', 'Independence']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});

describe('GrammarIssueCard', () => {
  it('renders category, original, suggestion, and reason', () => {
    render(<GrammarIssueCard issue={grammarIssue} />);
    expect(screen.getByText(/grammar/i)).toBeInTheDocument();
    expect(screen.getByText('teh')).toBeInTheDocument();
    expect(screen.getByText('the')).toBeInTheDocument();
    expect(screen.getByText(/Possible spelling mistake/)).toBeInTheDocument();
  });

  it('omits the suggestion row when suggestedCorrection is null', () => {
    const noSuggestion: GrammarIssue = { ...grammarIssue, suggestedCorrection: null };
    render(<GrammarIssueCard issue={noSuggestion} />);
    expect(screen.getByText('teh')).toBeInTheDocument();
    expect(screen.queryByText('the')).not.toBeInTheDocument();
    expect(screen.getByText(/Possible spelling mistake/)).toBeInTheDocument();
  });
});

/* --- 4C3: helper toolbar ---------------------------------------------------- */

describe('EssayHelperToolbar', () => {
  it('shows remaining translate + synonym budget for B1 (10 / 6)', () => {
    render(
      <EssayHelperToolbar
        difficulty="B1"
        usedTranslations={2}
        usedSynonyms={1}
        onTranslate={() => {}}
        onSynonym={() => {}}
      />,
    );
    // Translate: 10 - 2 = 8 left; Synonym: 6 - 1 = 5 left.
    expect(screen.getByText(/8 left/)).toBeInTheDocument();
    expect(screen.getByText(/5 left/)).toBeInTheDocument();
  });

  it('fires onTranslate / onSynonym when the buttons are clicked', async () => {
    const user = userEvent.setup();
    const onTranslate = vi.fn();
    const onSynonym = vi.fn();
    render(
      <EssayHelperToolbar
        difficulty="B1"
        usedTranslations={0}
        usedSynonyms={0}
        onTranslate={onTranslate}
        onSynonym={onSynonym}
      />,
    );
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    await user.click(buttons[1]);
    expect(onTranslate).toHaveBeenCalled();
    expect(onSynonym).toHaveBeenCalled();
  });

  it('disables both buttons at Native (limit 0) and shows "not available"', () => {
    render(
      <EssayHelperToolbar
        difficulty="Native"
        usedTranslations={0}
        usedSynonyms={0}
        onTranslate={() => {}}
        onSynonym={() => {}}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
    expect(screen.getAllByText(/not available/i)).toHaveLength(2);
  });

  it('disables a tool once its budget is fully spent', () => {
    render(
      <EssayHelperToolbar
        difficulty="C1"
        usedTranslations={3}
        usedSynonyms={0}
        onTranslate={() => {}}
        onSynonym={() => {}}
      />,
    );
    const buttons = screen.getAllByRole('button');
    // C1 translation limit = 3 → spent → disabled; synonym limit = 3 → 3 left → enabled.
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).not.toBeDisabled();
  });
});
