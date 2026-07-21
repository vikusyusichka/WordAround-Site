import { describe, expect, it } from 'vitest';

import {
  buildConversationPrompt,
  buildHintPrompt,
  fallbackReply,
  localHint,
} from './speakingConversation';
import { SPEAKING_SCENARIOS, type SpeakingContext } from './speakingTypes';

const scenarioContext: SpeakingContext = { kind: 'scenario', scenario: SPEAKING_SCENARIOS[0] };
const topicContext: SpeakingContext = {
  kind: 'topic',
  topic: { title: 'City life', description: 'd', firstAIMessage: 'q', promptContext: 'ctx', category: 'Conversation' },
};

describe('buildConversationPrompt', () => {
  it('includes tutor rules, language, level, context and history', () => {
    const prompt = buildConversationPrompt({
      languageId: 'french', level: 'B1', context: scenarioContext,
      recentMessages: [{ role: 'ai', text: 'Bonjour' }, { role: 'user', text: 'Salut' }],
      latestUserMessage: 'Un café',
    });
    expect(prompt).toContain('You are a language tutor.');
    expect(prompt).toContain('Language: French');
    expect(prompt).toContain('Level: B1');
    expect(prompt).toContain('Scenario/Topic: Cafe —');
    expect(prompt).toContain('Reply in French. Do not output JSON or markdown.');
    expect(prompt).toContain('Tutor: Bonjour');
    expect(prompt).toContain('Learner said:\nUn café');
  });

  it('empty history renders the no-turns placeholder', () => {
    const prompt = buildConversationPrompt({
      languageId: 'english', level: 'A1', context: topicContext, recentMessages: [], latestUserMessage: 'Hi',
    });
    expect(prompt).toContain('(no prior turns)');
  });
});

describe('buildHintPrompt', () => {
  it('A1/A2 uses the beginner guidance; references last AI question', () => {
    const prompt = buildHintPrompt({
      languageId: 'english', level: 'A2', context: scenarioContext,
      recentMessages: [{ role: 'ai', text: 'What would you like?' }],
      lastUserMessage: undefined,
    });
    expect(prompt).toContain('beginner (A2)');
    expect(prompt).toContain("Tutor's last question: What would you like?");
    expect(prompt).toContain('The learner has not answered yet.');
  });

  it('B1+ uses the CEFR guidance', () => {
    const prompt = buildHintPrompt({
      languageId: 'english', level: 'B2', context: topicContext, recentMessages: [], lastUserMessage: 'ok',
    });
    expect(prompt).toContain('Match CEFR level B2');
    expect(prompt).toContain('conversation has not started yet');
  });
});

describe('fallbacks', () => {
  it('fallbackReply per language', () => {
    expect(fallbackReply('german')).toContain('gehört');
    expect(fallbackReply('english')).toContain('I heard you');
  });

  it('localHint uses the scenario table then generic topic', () => {
    expect(localHint('english', scenarioContext)).toBe('Try saying: I would like a coffee, please.');
    expect(localHint('english', topicContext)).toContain('City life');
  });
});
