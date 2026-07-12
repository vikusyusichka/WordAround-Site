import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { speak } from './speech';

describe('speak', () => {
  const cancel = vi.fn();
  const speakFn = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('speechSynthesis', { cancel, speak: speakFn, getVoices: () => [] });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        lang = '';
        rate = 1;
        pitch = 1;
        voice: unknown = null;
        constructor(t: string) {
          this.text = t;
        }
      },
    );
    cancel.mockClear();
    speakFn.mockClear();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('cancels then speaks with the given language', () => {
    speak('hello', 'en-US');
    expect(cancel).toHaveBeenCalledOnce();
    expect(speakFn).toHaveBeenCalledOnce();
    const utterance = speakFn.mock.calls[0][0];
    expect(utterance.text).toBe('hello');
    expect(utterance.lang).toBe('en-US');
  });

  it('is a no-op for blank text', () => {
    speak('   ', 'en-US');
    expect(speakFn).not.toHaveBeenCalled();
  });
});
