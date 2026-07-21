import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { FreeSpeakingTopicCard } from './FreeSpeakingTopicCard';
import { ConversationResultView } from './ConversationResultView';
import { DescribePictureImageCard } from './DescribePictureImageCard';
import type { SpeakingFeedback } from '@/lib/speakingTypes';

describe('FreeSpeakingTopicCard', () => {
  it('renders title, description and chips', () => {
    render(
      <FreeSpeakingTopicCard
        title="Weekend plans"
        description="Talk about your weekend."
        chips={['B1', 'Daily']}
        accentColor="#3CCF91"
      />,
    );
    expect(screen.getByText('Weekend plans')).toBeInTheDocument();
    expect(screen.getByText('Talk about your weekend.')).toBeInTheDocument();
    expect(screen.getByText('B1')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
  });
});

describe('ConversationResultView', () => {
  const feedback: SpeakingFeedback = {
    overallScore: 78,
    summary: 'Nice fluent answers.',
    grammar: { title: 'Grammar', rating: 'Good', score: 80, explanation: 'Solid.', iconName: 'text.book.closed.fill' },
    pronunciation: { title: 'Pronunciation', rating: 'Estimated', score: 70, explanation: 'n/a', iconName: 'waveform' },
    vocabulary: { title: 'Vocabulary', rating: 'Good', score: 76, explanation: 'Varied.', iconName: 'character.book.closed.fill' },
    fluency: { title: 'Fluency', rating: 'Great', score: 84, explanation: 'Smooth.', iconName: 'bubble.left.and.bubble.right.fill' },
    extraMetrics: [],
    corrections: [
      { originalText: 'I go yesterday', correctedText: 'I went yesterday', explanation: 'past tense', category: 'grammar' },
    ],
    transcript: 'You: I go yesterday',
    isFallback: false,
  };

  it('shows the overall score, summary and a correction', () => {
    render(
      <ConversationResultView
        feedback={feedback}
        subtitle="Weekend plans"
        chips={['English', 'B1']}
        accentColor="#3CCF91"
        fallbackReason={null}
        onBack={() => {}}
      />,
    );
    expect(screen.getByText('78')).toBeInTheDocument();
    expect(screen.getByText('Nice fluent answers.')).toBeInTheDocument();
    expect(screen.getByText('I went yesterday')).toBeInTheDocument();
  });
});

describe('DescribePictureImageCard', () => {
  const image = {
    id: 'abc',
    imageURL: 'https://images.unsplash.com/photo-1',
    authorName: 'Ada Lovelace',
    authorURL: 'https://unsplash.com/@ada',
  };

  it('renders the photo, the required Unsplash attribution link and the prompt chips', () => {
    render(
      <DescribePictureImageCard
        image={image}
        isLoading={false}
        error={null}
        accentColor="#F7A310"
        onRetry={() => {}}
      />,
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', image.imageURL);
    const credit = screen.getByRole('link', { name: 'Ada Lovelace' });
    expect(credit).toHaveAttribute('href', image.authorURL);
    expect(screen.getByText('people')).toBeInTheDocument();
    expect(screen.getByText('emotions')).toBeInTheDocument();
  });

  it('shows the error state with a retry button and no image', () => {
    const onRetry = vi.fn();
    render(
      <DescribePictureImageCard
        image={null}
        isLoading={false}
        error="Too many requests. Please try again shortly."
        accentColor="#F7A310"
        onRetry={onRetry}
      />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/Too many requests/)).toBeInTheDocument();
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
