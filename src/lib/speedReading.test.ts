import { describe, expect, it } from 'vitest';

import type { ReadingQuestion } from './readingQuestionService';
import {
  buildSpeedReadingPrompt,
  chunkSeconds,
  initialSpeedSessionState,
  makeChunks,
  ratingFor,
  speedSessionReducer,
  speedWPM,
  targetWordCount,
  timerViolations,
  wordsRead,
  type SpeedConfiguration,
  type SpeedSessionState,
} from './speedReading';

const config: SpeedConfiguration = { target: 'balanced', timer: 'strict', length: 'two' };

describe('configuration derivations', () => {
  it('targetWordCount = range midpoint (350 / 800 / 1500)', () => {
    expect(targetWordCount({ ...config, length: 'two' })).toBe(350);
    expect(targetWordCount({ ...config, length: 'five' })).toBe(800);
    expect(targetWordCount({ ...config, length: 'ten' })).toBe(1500);
  });

  it('chunkSeconds: 0 for noTimer; max(6, round(chunk/wpm*60*mult))', () => {
    expect(chunkSeconds({ ...config, timer: 'noTimer' })).toBe(0);
    // balanced strict: 75/240*60*1.0 = 18.75 → 19
    expect(chunkSeconds({ ...config, timer: 'strict' })).toBe(19);
    // balanced soft: 18.75*1.4 = 26.25 → 26
    expect(chunkSeconds({ ...config, timer: 'soft' })).toBe(26);
  });
});

describe('makeChunks', () => {
  it('packs paragraphs toward the target and flushes at 1.4×', () => {
    const para = Array.from({ length: 30 }, () => 'word').join(' ');
    // 6×30 = 180 words, target 75 → flush at ≥105 (chunk of 120) + tail (60).
    const text = Array.from({ length: 6 }, () => para).join('\n\n');
    const chunks = makeChunks(text, 75);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].split(/\s+/)).toHaveLength(120);
    expect(chunks[1].split(/\s+/)).toHaveLength(60);
  });

  it('breaks an oversized paragraph by sentences', () => {
    const sentence = 'This sentence contains exactly eight words in total. ';
    const big = sentence.repeat(20).trim(); // 160 words in one paragraph, target 55
    const chunks = makeChunks(big, 55);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.split(/\s+/).length).toBeLessThanOrEqual(70);
    }
  });
});

describe('metrics', () => {
  it('speedWPM rounds and floors seconds at 1', () => {
    expect(speedWPM(240, 60)).toBe(240);
    expect(speedWPM(100, 0)).toBe(0);
    expect(speedWPM(0, 60)).toBe(0);
  });

  it('ratings use wpmRange bands (hi+40 / lo / lo-30)', () => {
    expect(ratingFor(280, 'balanced')).toBe('excellent'); // 240+40
    expect(ratingFor(200, 'balanced')).toBe('balanced');
    expect(ratingFor(160, 'balanced')).toBe('fast'); // ≥150
    expect(ratingFor(140, 'balanced')).toBe('tooSlow');
  });

  it('timerViolations counts only in strict mode', () => {
    const times = [25, 10, 30];
    expect(timerViolations(times, { ...config, timer: 'strict' })).toBe(2); // limit 19
    expect(timerViolations(times, { ...config, timer: 'soft' })).toBe(0);
  });
});

describe('prompt', () => {
  it('iOS-verbatim structure', () => {
    const prompt = buildSpeedReadingPrompt({ ...config, length: 'five' }, 'English');
    expect(prompt).toContain(
      'Write a self-contained non-fiction reading passage in English for a speed-reading practice session.',
    );
    expect(prompt).toContain('Target length: about 800 words (between 600 and 1000).');
    expect(prompt).toContain('upper-intermediate learner of English');
    expect(prompt).toContain('- Do not write a title.');
  });
});

describe('speedSessionReducer', () => {
  const q = (id: string): ReadingQuestion => ({
    id, type: 'trueFalse', prompt: `Q${id}`, options: ['True', 'False'], correctAnswer: 'True',
  });
  const start = (): SpeedSessionState =>
    speedSessionReducer(initialSpeedSessionState(config), {
      type: 'START', config, chunks: ['one two three', 'four five six'], questions: [q('a')],
    });

  it('countdown 3→1 then reading', () => {
    let s = start();
    expect(s.phase).toBe('countdown');
    s = speedSessionReducer(s, { type: 'COUNTDOWN_TICK' });
    s = speedSessionReducer(s, { type: 'COUNTDOWN_TICK' });
    expect(s.countdownValue).toBe(1);
    s = speedSessionReducer(s, { type: 'COUNTDOWN_TICK' });
    expect(s.phase).toBe('reading');
  });

  const toReading = () => {
    let s = start();
    for (let i = 0; i < 3; i++) s = speedSessionReducer(s, { type: 'COUNTDOWN_TICK' });
    return s;
  };

  it('strict TICK auto-advances at the chunk limit', () => {
    let s = toReading();
    const limit = chunkSeconds(config); // 19
    for (let i = 0; i < limit; i++) s = speedSessionReducer(s, { type: 'TICK' });
    expect(s.chunkIndex).toBe(1);
    expect(s.chunkTimes).toEqual([limit]);
  });

  it('pause stops ticks; wordsRead counts completed + current chunk', () => {
    let s = toReading();
    expect(wordsRead(s)).toBe(3);
    s = speedSessionReducer(s, { type: 'TOGGLE_PAUSE' });
    s = speedSessionReducer(s, { type: 'TICK' });
    expect(s.elapsedSeconds).toBe(0);
    s = speedSessionReducer(s, { type: 'TOGGLE_PAUSE' });
    s = speedSessionReducer(s, { type: 'ADVANCE_CHUNK' });
    expect(wordsRead(s)).toBe(6);
  });

  it('finishing the last chunk moves to questions; FINISH builds the result', () => {
    let s = toReading();
    s = speedSessionReducer(s, { type: 'TICK' });
    s = speedSessionReducer(s, { type: 'ADVANCE_CHUNK' });
    s = speedSessionReducer(s, { type: 'ADVANCE_CHUNK' }); // last → questions
    expect(s.phase).toBe('questions');
    s = speedSessionReducer(s, { type: 'SELECT_ANSWER', answer: 'True' });
    s = speedSessionReducer(s, { type: 'FINISH' });
    expect(s.phase).toBe('results');
    expect(s.result?.comprehensionPercent).toBe(100);
    expect(s.result?.targetWPM).toBe(240);
    expect(s.result?.rating).toBeDefined();
  });

  it('font scale clamps to 0.8–1.4', () => {
    let s = toReading();
    for (let i = 0; i < 10; i++) s = speedSessionReducer(s, { type: 'FONT_DELTA', delta: 0.1 });
    expect(s.fontScale).toBe(1.4);
    for (let i = 0; i < 10; i++) s = speedSessionReducer(s, { type: 'FONT_DELTA', delta: -0.1 });
    expect(s.fontScale).toBe(0.8);
  });
});
