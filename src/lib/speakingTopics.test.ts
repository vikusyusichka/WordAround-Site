import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { aiWorkerUrl: 'https://worker.test' } }));

import {
  generateConversationTopic,
  pickFallbackTopic,
  recentTopicTitles,
  rememberTopicTitle,
} from './speakingTopics';

describe('recent-title store', () => {
  beforeEach(() => localStorage.clear());

  it('remembers newest-first, dedupes, caps at 12', () => {
    for (let i = 0; i < 15; i++) rememberTopicTitle('english', 'B1', `T${i}`);
    rememberTopicTitle('english', 'B1', 'T5'); // move to front
    const titles = recentTopicTitles('english', 'B1');
    expect(titles).toHaveLength(12);
    expect(titles[0]).toBe('T5');
  });

  it('is scoped per language+level', () => {
    rememberTopicTitle('english', 'B1', 'A');
    expect(recentTopicTitles('english', 'B2')).toEqual([]);
  });
});

describe('pickFallbackTopic', () => {
  it('returns a full topic avoiding used titles when possible', () => {
    const all = ['A memorable trip', 'Your favourite meal', 'A hobby you enjoy', 'Technology in daily life', 'A place you want to visit'];
    const topic = pickFallbackTopic('english', all.slice(0, 4));
    expect(topic.title).toBe('A place you want to visit');
    expect(topic.firstAIMessage).toContain('A place you want to visit');
    expect(topic.category).toBe('Conversation');
  });
});

describe('generateConversationTopic', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs to /api/speaking/topic and maps the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Weekend plans', description: 'd', promptContext: 'ctx',
        openingQuestion: 'What are your weekend plans?', category: 'Daily',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { topic, usedFallback } = await generateConversationTopic({
      languageId: 'english', level: 'B1', length: 'short', forceRefresh: true,
    });
    expect(fetchMock.mock.calls[0][0]).toBe('https://worker.test/api/speaking/topic');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ language: 'English', level: 'B1', lengthMinutes: 5 });
    expect(topic.title).toBe('Weekend plans');
    expect(topic.firstAIMessage).toBe('What are your weekend plans?');
    expect(usedFallback).toBe(false);
  });

  it('falls back locally after 2 failed attempts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    const { topic, usedFallback } = await generateConversationTopic({
      languageId: 'english', level: 'B1', length: 'short', forceRefresh: true,
    });
    expect(usedFallback).toBe(true);
    expect(topic.title.length).toBeGreaterThan(0);
  });
});
