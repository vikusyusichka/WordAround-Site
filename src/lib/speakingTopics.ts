/* Conversation topic generation — web port of SpeakingTopicGenerationService
   + CloudflareSpeakingTopicAIClient + LocalFallbackSpeakingTopicAIClient.
   Dedicated worker endpoint POST {origin}/api/speaking/topic, with a local
   fallback list and a per-language/level recent-title store (localStorage). */
import { env } from '@/lib/env';
import { findLanguage } from '@/lib/essayTypes';
import type { ConversationLength, GeneratedConversationTopic } from '@/lib/speakingTypes';
import { CONVERSATION_LENGTH_MINUTES } from '@/lib/speakingTypes';

const TOPIC_ENDPOINT = `${env.aiWorkerUrl.replace(/\/$/, '')}/api/speaking/topic`;
const TOPIC_TIMEOUT_MS = 25_000;
const RECENT_CAP = 12;

interface TopicWorkerResponse {
  title?: string;
  description?: string;
  prompt?: string;
  openingQuestion?: string;
  firstAIMessage?: string;
  promptContext?: string;
  context?: string;
  category?: string;
  error?: string;
}

const requestRemoteTopic = async (
  params: { languageId: string; level: string; length: ConversationLength; avoidTitles: string[] },
  signal?: AbortSignal,
): Promise<GeneratedConversationTopic> => {
  const controller = new AbortController();
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  const timeout = setTimeout(() => controller.abort(), TOPIC_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(TOPIC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        language: findLanguage(params.languageId).title,
        level: params.level,
        lengthMinutes: CONVERSATION_LENGTH_MINUTES[params.length],
        avoidTitles: params.avoidTitles.slice(-12),
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw new Error(`topic ${response.status}`);
  const data = (await response.json()) as TopicWorkerResponse;
  const title = data.title?.trim() ?? '';
  const description = (data.description ?? data.prompt)?.trim() ?? '';
  const promptContext = (data.promptContext ?? data.context)?.trim() ?? '';
  const firstAIMessage = (data.openingQuestion ?? data.firstAIMessage)?.trim() ?? '';
  if (!title || !description || !promptContext || !firstAIMessage) {
    throw new Error('topic missing required fields');
  }
  const category = data.category?.trim();
  return {
    title,
    description,
    firstAIMessage,
    promptContext,
    category: category && category.length > 0 ? category : 'Conversation',
  };
};

/* --- Local fallback topics --- */

const FALLBACK_TITLES: Record<string, string[]> = {
  english: ['A memorable trip', 'Your favourite meal', 'A hobby you enjoy', 'Technology in daily life', 'A place you want to visit'],
  spanish: ['Un viaje memorable', 'Tu comida favorita', 'Un pasatiempo que disfrutas', 'La tecnología en la vida diaria', 'Un lugar que quieres visitar'],
  french: ['Un voyage mémorable', 'Ton plat préféré', 'Un passe-temps que tu aimes', 'La technologie au quotidien', 'Un lieu que tu veux visiter'],
  german: ['Eine unvergessliche Reise', 'Dein Lieblingsessen', 'Ein Hobby, das dir gefällt', 'Technik im Alltag', 'Ein Ort, den du besuchen willst'],
};

export const pickFallbackTopic = (
  languageId: string,
  avoidTitles: string[],
): GeneratedConversationTopic => {
  const titles = FALLBACK_TITLES[languageId] ?? FALLBACK_TITLES.english;
  const available = titles.filter((t) => !avoidTitles.includes(t));
  const title = (available.length > 0 ? available : titles)[Math.floor(Math.random() * (available.length > 0 ? available.length : titles.length))];
  return {
    title,
    description: 'A friendly open conversation topic to practise speaking.',
    firstAIMessage: `Let's talk about "${title}". What are your thoughts?`,
    promptContext: `Have a relaxed conversation about "${title}". Ask the learner open questions and encourage them to share opinions and details.`,
    category: 'Conversation',
  };
};

/* --- Recent-title store (localStorage) --- */

const recentKey = (languageId: string, level: string) =>
  `wa.speaking.recentTopics.${languageId}.${level}`;

export const recentTopicTitles = (languageId: string, level: string): string[] => {
  try {
    const raw = localStorage.getItem(recentKey(languageId, level));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map((t) => String(t)).slice(0, RECENT_CAP) : [];
  } catch {
    return [];
  }
};

export const rememberTopicTitle = (languageId: string, level: string, title: string): void => {
  const rest = recentTopicTitles(languageId, level).filter((t) => t !== title);
  try {
    localStorage.setItem(recentKey(languageId, level), JSON.stringify([title, ...rest].slice(0, RECENT_CAP)));
  } catch {
    /* best-effort */
  }
};

/* In-memory cache, keyed by language|level|length. */
const cache = new Map<string, GeneratedConversationTopic>();

export const generateConversationTopic = async (params: {
  languageId: string;
  level: string;
  length: ConversationLength;
  avoidTitles?: string[];
  forceRefresh?: boolean;
}): Promise<{ topic: GeneratedConversationTopic; usedFallback: boolean }> => {
  const avoidTitles = params.avoidTitles ?? [];
  const cacheKey = `${params.languageId}|${params.level}|${params.length}`;

  if (!params.forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && !avoidTitles.includes(cached.title)) return { topic: cached, usedFallback: false };
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const topic = await requestRemoteTopic({
        languageId: params.languageId,
        level: params.level,
        length: params.length,
        avoidTitles,
      });
      cache.set(cacheKey, topic);
      rememberTopicTitle(params.languageId, params.level, topic.title);
      return { topic, usedFallback: false };
    } catch {
      /* retry / fall through */
    }
  }

  const fallback = pickFallbackTopic(params.languageId, avoidTitles);
  return { topic: fallback, usedFallback: true };
};
