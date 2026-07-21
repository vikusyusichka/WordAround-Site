import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { aiWorkerUrl: 'https://worker.test' } }));

import { fetchRandomImage, PICTURE_CONTEXT, RANDOM_IMAGE_PATH } from './describePicture';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

const expectCode = async (promise: Promise<unknown>, code: string) => {
  await expect(promise).rejects.toMatchObject({ code });
};

describe('fetchRandomImage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs to the worker path and maps the payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ok({
        id: 'abc123',
        imageURL: 'https://images.unsplash.com/photo-1',
        authorName: 'Ada Lovelace',
        authorURL: 'https://unsplash.com/@ada',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const image = await fetchRandomImage();

    expect(fetchMock.mock.calls[0][0]).toBe(`https://worker.test${RANDOM_IMAGE_PATH}`);
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(image).toEqual({
      id: 'abc123',
      imageURL: 'https://images.unsplash.com/photo-1',
      authorName: 'Ada Lovelace',
      authorURL: 'https://unsplash.com/@ada',
    });
  });

  it('defaults a missing author to Unknown + the Unsplash home URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ id: 'x', imageURL: 'https://i/1' })));
    const image = await fetchRandomImage();
    expect(image.authorName).toBe('Unknown');
    expect(image.authorURL).toBe('https://unsplash.com');
  });

  it('429 → rate-limited', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }));
    await expectCode(fetchRandomImage(), 'rate-limited');
  });

  it('non-2xx → server-error carrying the status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({ error: 'upstream down' }) }));
    await expect(fetchRandomImage()).rejects.toMatchObject({ code: 'server-error', status: 502 });
  });

  it('missing id or imageURL → no-image', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ id: 'only-id' })));
    await expectCode(fetchRandomImage(), 'no-image');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ id: '', imageURL: '' })));
    await expectCode(fetchRandomImage(), 'no-image');
  });

  it('unparseable body → invalid-response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('not json');
      },
    }));
    await expectCode(fetchRandomImage(), 'invalid-response');
  });

  it('fetch rejection → network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expectCode(fetchRandomImage(), 'network');
  });
});

describe('PICTURE_CONTEXT', () => {
  it('is a monologue topic context telling the model there is no interlocutor', () => {
    expect(PICTURE_CONTEXT.kind).toBe('topic');
    if (PICTURE_CONTEXT.kind !== 'topic') throw new Error('unreachable');
    expect(PICTURE_CONTEXT.topic.category).toBe('Describe Picture');
    expect(PICTURE_CONTEXT.topic.promptContext).toContain('no AI interlocutor');
  });
});
