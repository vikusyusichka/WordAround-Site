import { describe, expect, it } from 'vitest';

import { pickMimeType } from './audioRecorder';

describe('pickMimeType', () => {
  it('prefers opus-in-webm when the browser supports it (Chromium)', () => {
    expect(pickMimeType(() => true)).toBe('audio/webm;codecs=opus');
  });

  it('falls back to mp4 when only that is supported (Safari)', () => {
    expect(pickMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4');
  });

  it('returns undefined when nothing matches, so the recorder uses its default', () => {
    expect(pickMimeType(() => false)).toBeUndefined();
  });
});
