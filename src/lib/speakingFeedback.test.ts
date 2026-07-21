import { beforeEach, describe, expect, it, vi } from 'vitest';

const ai = vi.hoisted(() => ({ generateJSON: vi.fn(), generateText: vi.fn() }));
vi.mock('@/lib/aiClient', () => ai);

import {
  buildFeedbackPrompt,
  buildTranscript,
  generateSpeakingFeedback,
  localFallbackFeedback,
} from './speakingFeedback';
import type { SpeakingMessage } from './speakingTypes';

const msgs: SpeakingMessage[] = [
  { role: 'ai', text: 'Hi! What would you like to order?' },
  { role: 'user', text: 'I want a coffee please and a piece of cake' },
  { role: 'ai', text: 'Great choice! Anything else?' },
  { role: 'user', text: 'No thank you that is all for me today' },
];

describe('buildFeedbackPrompt', () => {
  it('speaking variant: 4 metrics, evaluates only learner turns', () => {
    const prompt = buildFeedbackPrompt({
      languageId: 'english', level: 'B1', scenarioOrTopicTitle: 'Cafe',
      scenarioOrTopicContext: 'ctx', messages: msgs, includeDebateMetrics: false,
    });
    expect(prompt).toContain('Produce four score blocks: grammar, pronunciation, vocabulary, fluency.');
    expect(prompt).toContain('U1: I want a coffee please and a piece of cake');
    expect(prompt).not.toContain('argumentQuality');
  });

  it('debate variant: 7 metrics + debate schema lines', () => {
    const prompt = buildFeedbackPrompt({
      languageId: 'english', level: 'B1', scenarioOrTopicTitle: 'T',
      scenarioOrTopicContext: 'c', messages: msgs, includeDebateMetrics: true,
    });
    expect(prompt).toContain('seven score blocks');
    expect(prompt).toContain('"argumentQuality"');
    expect(prompt).toContain('"persuasiveness"');
    expect(prompt).toContain('"structure"');
  });
});

describe('buildTranscript', () => {
  it('labels Tutor / You', () => {
    expect(buildTranscript(msgs.slice(0, 2))).toBe(
      'Tutor: Hi! What would you like to order?\nYou: I want a coffee please and a piece of cake',
    );
  });
});

describe('localFallbackFeedback (iOS formulas)', () => {
  it('scores from words/turns; grammar 70 pron 65', () => {
    const fb = localFallbackFeedback({ messages: msgs, transcript: 'x', includeDebateMetrics: false });
    expect(fb.isFallback).toBe(true);
    expect(fb.grammar.score).toBe(70);
    expect(fb.pronunciation.score).toBe(65);
    // 2 user turns, ~19 words → fluency = 10 + min(60,57) + min(30,12) = 79
    expect(fb.fluency.score).toBe(79);
    expect(fb.overallScore).toBeGreaterThan(0);
    expect(fb.extraMetrics).toHaveLength(0);
  });

  it('no user messages → all zero, dashes', () => {
    const fb = localFallbackFeedback({ messages: [msgs[0]], transcript: '', includeDebateMetrics: false });
    expect(fb.overallScore).toBe(0);
    expect(fb.grammar.score).toBe(0);
    expect(fb.pronunciation.rating).toBe('—');
  });

  it('debate adds 3 extra metrics', () => {
    const fb = localFallbackFeedback({ messages: msgs, transcript: 'x', includeDebateMetrics: true });
    expect(fb.extraMetrics.map((m) => m.title)).toEqual(['Argument Quality', 'Persuasiveness', 'Structure']);
  });
});

describe('generateSpeakingFeedback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no user messages → local fallback without an AI call', async () => {
    const { feedback, fallbackReason } = await generateSpeakingFeedback({
      languageId: 'english', level: 'B1', context: null, messages: [msgs[0]],
    });
    expect(ai.generateJSON).not.toHaveBeenCalled();
    expect(feedback.isFallback).toBe(true);
    expect(fallbackReason).toBe('No speaking answers were recorded.');
  });

  it('valid AI response maps to feedback', async () => {
    ai.generateJSON.mockResolvedValue({
      overallScore: 82, summary: 'Nice work.',
      grammar: { rating: 'Good', score: 80, explanation: 'g' },
      pronunciation: { rating: 'Estimated', score: 65, explanation: 'p' },
      vocabulary: { rating: 'Good', score: 78, explanation: 'v' },
      fluency: { rating: 'Great', score: 85, explanation: 'f' },
      corrections: [{ originalText: 'I want', correctedText: 'I would like', explanation: 'politeness', category: 'style' }],
    });
    const { feedback, fallbackReason } = await generateSpeakingFeedback({
      languageId: 'english', level: 'B1', context: null, messages: msgs,
    });
    expect(ai.generateJSON.mock.calls[0][0].task).toBe('speaking_feedback');
    expect(feedback.isFallback).toBe(false);
    expect(feedback.overallScore).toBe(82);
    expect(feedback.corrections).toHaveLength(1);
    expect(fallbackReason).toBeNull();
  });

  it('2 failed attempts → local fallback with a reason', async () => {
    ai.generateJSON.mockRejectedValue(new Error('boom'));
    const { feedback, fallbackReason } = await generateSpeakingFeedback({
      languageId: 'english', level: 'B1', context: null, messages: msgs,
    });
    expect(ai.generateJSON).toHaveBeenCalledTimes(2);
    expect(feedback.isFallback).toBe(true);
    expect(fallbackReason).toContain('AI feedback unavailable');
  });

  it('debate feedback uses the debate_feedback task', async () => {
    ai.generateJSON.mockResolvedValue({
      overallScore: 70, summary: 's',
      grammar: { rating: 'Good', score: 70, explanation: 'g' },
      pronunciation: { rating: 'Estimated', score: 60, explanation: 'p' },
      vocabulary: { rating: 'Fair', score: 60, explanation: 'v' },
      fluency: { rating: 'Good', score: 72, explanation: 'f' },
      argumentQuality: { rating: 'Good', score: 68, explanation: 'a' },
      persuasiveness: { rating: 'Fair', score: 55, explanation: 'p2' },
      structure: { rating: 'Good', score: 66, explanation: 's2' },
      corrections: [],
    });
    const { feedback } = await generateSpeakingFeedback({
      languageId: 'english', level: 'B1', context: null, messages: msgs, includeDebateMetrics: true,
    });
    expect(ai.generateJSON.mock.calls[0][0].task).toBe('debate_feedback');
    expect(feedback.extraMetrics).toHaveLength(3);
  });
});
