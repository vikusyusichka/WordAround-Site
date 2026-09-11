import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { StatCard } from './StatCard';
import { ProgressCard } from './ProgressCard';
import { SetItem } from './SetItem';
import { STREAK_CARD, type HomeSetPreviewItem, type StatCardItem } from '@/lib/homeTypes';

/* Fixtures, not production constants — the home screen renders only the
   streak card and real set data, so a test needs its own shapes. */
const sampleStat: StatCardItem = { ...STREAK_CARD, value: '24' };

const sampleGoal: HomeSetPreviewItem = {
  id: 'goal',
  title: '',
  subtitle: '',
  iconSystemName: 'book.closed',
  currentValue: 24,
  totalValue: 30,
  unit: 'words',
  progress: 0.8,
  accentColor: 'var(--color-primary-blue)',
  backgroundColor: 'var(--color-goal-bg)',
  progressBackgroundColor: 'var(--color-goal-progress-bg)',
  titleColor: 'var(--color-primary-blue-dark)',
  valueColor: 'var(--color-primary-blue-dark)',
  subtitleColor: 'var(--color-text-secondary)',
  iconBackground: 'var(--color-card-white)',
  blobColor: 'var(--color-home-goal-blob)',
};

const sampleSet: HomeSetPreviewItem = {
  id: 's1',
  title: 'Travel Essentials',
  subtitle: '42 words',
  iconSystemName: 'airplane',
  currentValue: 0,
  totalValue: 42,
  unit: 'words',
  progress: 0,
  accentColor: 'var(--color-cs-blue)',
  backgroundColor: '#eef',
  progressBackgroundColor: '#dde',
  titleColor: 'var(--color-cs-dark-text)',
  valueColor: 'var(--color-cs-blue)',
  subtitleColor: 'var(--color-text-secondary)',
  iconBackground: 'var(--color-cs-blue)',
  blobColor: '#dde',
};

describe('StatCard', () => {
  it('renders value + translated title/subtitle', () => {
    render(<StatCard item={sampleStat} />);
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('Streak')).toBeInTheDocument();
    expect(screen.getByText('days')).toBeInTheDocument();
  });
});

describe('ProgressCard', () => {
  it('goal layout shows the value line', () => {
    render(
      <ProgressCard item={sampleGoal} layout="goal" title="Today's goal" subtitle="6 words left" />,
    );
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText(/\/ 30 words/)).toBeInTheDocument();
    expect(screen.getByText('6 words left')).toBeInTheDocument();
  });

  it('action layout renders a clickable button when onClick is set', async () => {
    const onClick = vi.fn();
    render(
      <ProgressCard
        item={sampleSet}
        layout="action"
        title="Travel"
        subtitle="Keep going"
        actionSystemName="arrow.right"
        onClick={onClick}
      />,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('SetItem', () => {
  it('renders title, subtitle and trailing text', () => {
    render(<SetItem item={sampleSet} trailingText="Review" />);
    expect(screen.getByText('Travel Essentials')).toBeInTheDocument();
    expect(screen.getByText('42 words')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });
});
