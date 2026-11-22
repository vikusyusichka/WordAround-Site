import { describe, expect, it } from 'vitest';

import { formatClock, markTest, newSection, questionCount, secondsLeft, testProblems } from './model';
import type { CustomQuestion, CustomSection } from './model';

const q = (id: string, type: CustomQuestion['type'], correctAnswer: string, options: string[] = []): CustomQuestion => ({
  id,
  type,
  questionText: `Question ${id}`,
  options,
  correctAnswer,
  order: 0,
});

const reading: CustomSection = {
  id: 'r',
  kind: 'reading',
  title: 'Text 1',
  text: 'Some text',
  questions: [q('1', 'multipleChoice', 'Madrid', ['Madrid', 'Paris']), q('2', 'trueFalse', 'False', ['True', 'False'])],
};
const listening: CustomSection = {
  id: 'l',
  kind: 'listening',
  title: 'Dialogue',
  audio: { source: 'tts', text: 'Hola' },
  maxPlays: 2,
  questions: [q('3', 'fillGap', 'casa'), q('4', 'shortAnswer', 'el lunes')],
};

describe('testProblems', () => {
  it('accepts a complete test', () => {
    expect(testProblems({ title: 'Mock 1', timeLimitMinutes: 60, sections: [reading, listening] })).toEqual([]);
  });

  it('names every problem and the section it is in', () => {
    const emptyReading = { ...newSection('reading') };
    const emptyListening = { ...newSection('listening') };
    expect(
      testProblems({ title: '  ', timeLimitMinutes: 0, sections: [emptyReading, emptyListening] }).map((p) => p),
    ).toEqual([
      { code: 'titleRequired' },
      { code: 'timeLimitInvalid' },
      { code: 'readingTextRequired', section: 1 },
      { code: 'questionsRequired', section: 1 },
      { code: 'audioRequired', section: 2 },
      { code: 'questionsRequired', section: 2 },
    ]);
  });

  it('needs at least one section', () => {
    expect(testProblems({ title: 'x', timeLimitMinutes: null, sections: [] })).toEqual([{ code: 'sectionsRequired' }]);
  });

  it('counts an uploaded file as audio', () => {
    const withFile: CustomSection = { ...listening, audio: { source: 'file', url: 'https://x', path: 'p', name: 'a.mp3' } };
    expect(testProblems({ title: 'x', timeLimitMinutes: null, sections: [withFile] })).toEqual([]);
  });
});

describe('markTest', () => {
  it('marks every question, ignoring case and spaces, and leaves blanks wrong', () => {
    const result = markTest({ sections: [reading, listening] }, { '1': ' madrid ', '2': 'True', '3': 'CASA' });
    expect(result.correct).toBe(2);
    expect(result.total).toBe(4);
    expect(result.percent).toBe(50);
    expect(result.sections.map((s) => [s.correct, s.total])).toEqual([
      [1, 2],
      [1, 2],
    ]);
    const blank = result.sections[1].items[1];
    expect(blank).toMatchObject({ given: '', isCorrect: false, correctAnswer: 'el lunes' });
  });

  it('scores an empty test as 0%', () => {
    expect(markTest({ sections: [] }, {}).percent).toBe(0);
  });

  it('counts questions across sections', () => {
    expect(questionCount({ sections: [reading, listening] })).toBe(4);
  });
});

describe('timer', () => {
  it('counts down and stops at zero', () => {
    expect(secondsLeft(null, 0, 10_000)).toBeNull();
    expect(secondsLeft(1, 0, 0)).toBe(60);
    expect(secondsLeft(1, 0, 59_500)).toBe(1);
    expect(secondsLeft(1, 0, 120_000)).toBe(0);
  });

  it('formats the clock', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(3725)).toBe('1:02:05');
  });
});
