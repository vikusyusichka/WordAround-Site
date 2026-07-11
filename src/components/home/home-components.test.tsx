import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { StatCard } from './StatCard';
import { ProgressCard } from './ProgressCard';
import { SetItem } from './SetItem';
import { STAT_CARDS, TODAY_GOAL, type HomeSetPreviewItem } from '@/lib/homeTypes';

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
    render(<StatCard item={STAT_CARDS[0]} />);
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('Learned today')).toBeInTheDocument();
    expect(screen.getByText('words')).toBeInTheDocument();
  });
});

describe('ProgressCard', () => {
  it('goal layout shows the value line', () => {
    render(
      <ProgressCard item={TODAY_GOAL} layout="goal" title="Today's goal" subtitle="6 words left" />,
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
