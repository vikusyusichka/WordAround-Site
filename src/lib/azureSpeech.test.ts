import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { aiWorkerUrl: 'https://worker.test' } }));

import {
  AZURE_TOKEN_PATH,
  fetchAzureToken,
  isPronunciationScoringAvailable,
  __resetAzureTokenCache,
} from './azureSpeech';

describe('fetchAzureToken', () => {
  beforeEach(() => __resetAzureTokenCache());
  afterEach(() => vi.unstubAllGlobals());

  it('returns the token+region and caches it (one network call for two reads)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ token: 't-123', region: 'westeurope' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchAzureToken();
    const second = await fetchAzureToken();

    expect(fetchMock.mock.calls[0][0]).toBe(`https://worker.test${AZURE_TOKEN_PATH}`);
    expect(first).toEqual({ token: 't-123', region: 'westeurope' });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('502 from the Worker (the real state today) → not-configured, not a crash', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 502, json: async () => ({ error: 'Azure rejected the speech credentials.' }),
    }));
    await expect(fetchAzureToken()).rejects.toMatchObject({
      code: 'not-configured',
      status: 502,
      message: 'Azure rejected the speech credentials.',
    });
  });

  it('2xx with an empty token is still not-configured', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: '', region: '' }) }));
    await expect(fetchAzureToken()).rejects.toMatchObject({ code: 'not-configured' });
  });

  it('does not cache failures', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ token: 't', region: 'r' }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAzureToken()).rejects.toMatchObject({ code: 'not-configured' });
    await expect(fetchAzureToken()).resolves.toEqual({ token: 't', region: 'r' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fetch rejection → network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(fetchAzureToken()).rejects.toMatchObject({ code: 'network' });
  });
});

describe('isPronunciationScoringAvailable', () => {
  beforeEach(() => __resetAzureTokenCache());
  afterEach(() => vi.unstubAllGlobals());

  it('never throws — false when the Worker has no Azure credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) }));
    await expect(isPronunciationScoringAvailable()).resolves.toBe(false);
  });

  it('true when a token comes back', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: 't', region: 'r' }) }));
    await expect(isPronunciationScoringAvailable()).resolves.toBe(true);
  });
});
