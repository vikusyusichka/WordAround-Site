import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import '@/lib/i18n';
import { FreeSpeakingTopicCard } from './FreeSpeakingTopicCard';
import { ConversationResultView } from './ConversationResultView';
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
