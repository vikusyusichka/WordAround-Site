import { describe, expect, it } from 'vitest';

import {
  advanceSession,
  buildOpeningPrompt,
  buildReplyPrompt,
  currentRound,
  debateHints,
  debateRoundsFor,
  fallbackOpening,
  fallbackReply,
  isDebateFinished,
  makeDebateSession,
  oppositeSide,
  resolveConcreteSide,
  roundTitle,
} from './speakingDebate';
import type { GeneratedConversationTopic } from './speakingTypes';

const topic: GeneratedConversationTopic = {
  title: 'Homework should be banned',
  description: 'Debate about homework.',
  firstAIMessage: 'q',
  promptContext: 'School policy debate.',
  category: 'Education',
};

describe('sides', () => {
  it('agree/disagree resolve to themselves; surpriseMe uses the coin', () => {
    expect(resolveConcreteSide('agree')).toBe('agree');
    expect(resolveConcreteSide('disagree')).toBe('disagree');
    expect(resolveConcreteSide('surpriseMe', () => true)).toBe('agree');
    expect(resolveConcreteSide('surpriseMe', () => false)).toBe('disagree');
  });

  it('the AI always takes the opposite side', () => {
    expect(oppositeSide('agree')).toBe('disagree');
    expect(oppositeSide('disagree')).toBe('agree');
  });
});

describe('round plans', () => {
  it('short = 3 rounds, medium = 4, long = 5 (iOS sequences)', () => {
    expect(debateRoundsFor('short').map((r) => r.kind)).toEqual([
      'openingArgument', 'rebuttal', 'closingStatement',
    ]);
    expect(debateRoundsFor('medium').map((r) => r.kind)).toEqual([
      'openingArgument', 'rebuttal', 'crossExamination', 'closingStatement',
    ]);
    expect(debateRoundsFor('long').map((r) => r.kind)).toEqual([
      'openingArgument', 'rebuttal', 'crossExamination', 'rebuttal', 'closingStatement',
    ]);
  });

  it('roundTitle is 1-based with the round label', () => {
    expect(roundTitle({ index: 0, kind: 'openingArgument' })).toBe('Round 1 · Opening');
    expect(roundTitle({ index: 2, kind: 'crossExamination' })).toBe('Round 3 · Cross-examination');
  });
});

describe('session progression', () => {
  it('starts on round 0 with opposing sides', () => {
    const s = makeDebateSession(topic, 'agree', 'short');
    expect(s.learnerSide).toBe('agree');
    expect(s.aiSide).toBe('disagree');
    expect(s.currentRoundIndex).toBe(0);
    expect(currentRound(s)?.kind).toBe('openingArgument');
    expect(isDebateFinished(s)).toBe(false);
  });

  it('advances through rounds, then reports didAdvance=false and finishes', () => {
    let s = makeDebateSession(topic, 'disagree', 'short'); // 3 rounds

    let r = advanceSession(s);
    expect(r.didAdvance).toBe(true);
    s = r.session;
    expect(s.currentRoundIndex).toBe(1);

    r = advanceSession(s);
    expect(r.didAdvance).toBe(true);
    s = r.session;
    expect(s.currentRoundIndex).toBe(2);
    expect(isDebateFinished(s)).toBe(false);

    // On the last round → no advance, session marked finished.
    r = advanceSession(s);
    expect(r.didAdvance).toBe(false);
    s = r.session;
    expect(isDebateFinished(s)).toBe(true);
    expect(currentRound(s)).toBeNull();
  });

  it('does not mutate the input session', () => {
    const s = makeDebateSession(topic, 'agree', 'short');
    advanceSession(s);
    expect(s.currentRoundIndex).toBe(0);
  });
});

describe('buildOpeningPrompt', () => {
  it('states both sides, topic context, style rules and the language', () => {
    const p = buildOpeningPrompt({
      languageId: 'french', level: 'B2', topic, learnerSide: 'agree', aiSide: 'disagree',
    });
    expect(p).toContain('You are a friendly but sharp debate opponent');
    expect(p).toContain('Language: French');
    expect(p).toContain('Learner level: B2');
    expect(p).toContain('Debate topic: Homework should be banned');
    expect(p).toContain('Topic context: School policy debate.');
    expect(p).toContain('The learner will argue to support the statement.');
    expect(p).toContain('You argue the opposite: you oppose the statement.');
    expect(p).toContain('Reply in French. Do not output JSON or markdown.');
    expect(p).toContain('Return only your opening statement.');
  });

  it('flips the stance verbs when the learner disagrees', () => {
    const p = buildOpeningPrompt({
      languageId: 'english', level: 'A2', topic, learnerSide: 'disagree', aiSide: 'agree',
    });
    expect(p).toContain('The learner will argue to oppose the statement.');
    expect(p).toContain('You argue the opposite: you support the statement.');
  });
});

describe('buildReplyPrompt', () => {
  it('includes the round instruction and labels history Opponent/Learner', () => {
    const p = buildReplyPrompt({
      languageId: 'english', level: 'B1', topic, learnerSide: 'agree', aiSide: 'disagree',
      round: { index: 1, kind: 'rebuttal' },
      recentMessages: [
        { role: 'ai', text: 'I disagree.' },
        { role: 'user', text: 'I think homework helps.' },
      ],
      latestUserMessage: 'It builds discipline.',
    });
    expect(p).toContain('Current round: Round 2 · Rebuttal');
    expect(p).toContain("This round, you should: Challenge the learner's reasoning and ask one probing follow-up question.");
    expect(p).toContain('Opponent: I disagree.');
    expect(p).toContain('Learner: I think homework helps.');
    expect(p).toContain('Learner just said:\nIt builds discipline.');
    expect(p).toContain('Return only your reply.');
  });

  it('empty history renders the no-turns placeholder', () => {
    const p = buildReplyPrompt({
      languageId: 'english', level: 'B1', topic, learnerSide: 'agree', aiSide: 'disagree',
      round: { index: 0, kind: 'openingArgument' },
      recentMessages: [],
      latestUserMessage: 'Hi',
    });
    expect(p).toContain('(no prior turns)');
  });
});

describe('fallbacks', () => {
  it('opening embeds the topic title, per language', () => {
    expect(fallbackOpening('english', 'Cars')).toBe("Let's debate Cars. I disagree. What's your opinion?");
    expect(fallbackOpening('german', 'Autos')).toContain('Autos');
  });

  it('reply + hints are language-specific with an English default', () => {
    expect(fallbackReply('spanish')).toContain('no me convence');
    expect(fallbackReply('ukrainian')).toContain("doesn't fully convince me");
    expect(debateHints('english')).toHaveLength(5);
    expect(debateHints('french')[0]).toBe('Je pense que…');
  });
});
