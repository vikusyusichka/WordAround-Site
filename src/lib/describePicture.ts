/* Describe Picture image service — web port of DescribePictureImageService.
   The Unsplash key lives only in the Worker; the client just POSTs and gets back
   an image URL plus the attribution Unsplash's API terms require us to show. */
import { env } from '@/lib/env';
import type { SpeakingContext } from '@/lib/speakingTypes';

export const RANDOM_IMAGE_PATH = '/api/describe-picture/random-image';
const TIMEOUT_MS = 20_000;

export interface DescribePictureImage {
  id: string;
  imageURL: string;
  authorName: string;
  authorURL: string;
}

export type DescribePictureErrorCode =
  | 'network'
  | 'server-error'
  | 'rate-limited'
  | 'invalid-response'
  | 'no-image';

export interface DescribePictureError extends Error {
  code: DescribePictureErrorCode;
  status?: number;
}

const makeError = (
  code: DescribePictureErrorCode,
  message: string,
  status?: number,
): DescribePictureError =>
  Object.assign(new Error(message), { code, status }) as DescribePictureError;

interface RandomImageDTO {
  id?: string;
  imageURL?: string;
  authorName?: string;
  authorURL?: string;
  error?: string;
}

/* Fixed context for feedback — Describe Picture is a monologue, so the prompt
   tells the model there is no interlocutor. Verbatim from iOS pictureContext. */
export const PICTURE_CONTEXT: SpeakingContext = {
  kind: 'topic',
  topic: {
    title: 'Describe a picture',
    description: 'Describe what you can see in a picture.',
    firstAIMessage: 'Describe what you can see in this picture.',
    promptContext:
      "The learner is describing a photograph aloud. Evaluate their spoken description: people, objects, actions, colours and emotions they mention. There is no AI interlocutor — judge only the learner's monologue.",
    category: 'Describe Picture',
  },
};

/* The five things iOS nudges the learner to mention. */
export const PICTURE_PROMPT_HINTS: { icon: string; key: string }[] = [
  { icon: 'person.2.fill', key: 'people' },
  { icon: 'cube.box.fill', key: 'objects' },
  { icon: 'figure.walk', key: 'actions' },
  { icon: 'paintpalette.fill', key: 'colors' },
  { icon: 'heart.fill', key: 'emotions' },
];

export const fetchRandomImage = async (
  signal?: AbortSignal,
): Promise<DescribePictureImage> => {
  const controller = new AbortController();
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${env.aiWorkerUrl}${RANDOM_IMAGE_PATH}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (e) {
    throw makeError('network', e instanceof Error ? e.message : 'Network error');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 429) {
    throw makeError('rate-limited', 'Too many requests. Please try again shortly.', 429);
  }

  let dto: RandomImageDTO;
  try {
    dto = (await response.json()) as RandomImageDTO;
  } catch {
    throw makeError('invalid-response', 'The image service returned an unexpected response.');
  }

  if (!response.ok) {
    throw makeError(
      'server-error',
      dto.error?.trim() || `Image service error (${response.status}).`,
      response.status,
    );
  }

  const id = dto.id?.trim() ?? '';
  const imageURL = dto.imageURL?.trim() ?? '';
  if (id.length === 0 || imageURL.length === 0) {
    throw makeError('no-image', 'No image was available. Please try again.');
  }

  return {
    id,
    imageURL,
    authorName: dto.authorName?.trim() ? dto.authorName.trim() : 'Unknown',
    authorURL: dto.authorURL?.trim() ? dto.authorURL.trim() : 'https://unsplash.com',
  };
};
