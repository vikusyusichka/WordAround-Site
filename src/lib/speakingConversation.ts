/* AI conversation replies + hints — web port of SpeakingConversationService.
   Plain text out (not JSON) via the worker's speaking_conversation task; the
   prompt builders are iOS-verbatim. History window = last 4 messages. */
import { generateText } from '@/lib/aiClient';
import { findLanguage } from '@/lib/essayTypes';
import {
  contextDescription,
  contextPromptContext,
  contextTitle,
  type SpeakingContext,
  type SpeakingMessage,
} from '@/lib/speakingTypes';

export const CONVERSATION_HISTORY_LIMIT = 4;

const languageTitle = (languageId: string) => findLanguage(languageId).title;

export const buildConversationPrompt = (params: {
  languageId: string;
  level: string;
  context: SpeakingContext;
  recentMessages: SpeakingMessage[];
  latestUserMessage: string;
}): string => {
  const title = languageTitle(params.languageId);
  const recentLines =
    params.recentMessages.length === 0
      ? '(no prior turns)'
      : params.recentMessages
          .map((m) => `${m.role === 'ai' ? 'Tutor' : 'Learner'}: ${m.text}`)
          .join('\n');

  return [
    'You are a language tutor.',
    '',
    `Language: ${title}`,
    `Level: ${params.level}`,
    `Scenario/Topic: ${contextTitle(params.context)} — ${contextPromptContext(params.context)}`,
    '',
    'Reply naturally.',
    'Correct only one important mistake briefly.',
    'Ask one follow-up question.',
    'Keep reply short (1-2 sentences).',
    `Reply in ${title}. Do not output JSON or markdown.`,
    '',
    'Recent conversation:',
    recentLines,
    '',
    'Learner said:',
    params.latestUserMessage,
    '',
    'Return only the tutor reply.',
  ].join('\n');
};

export const buildHintPrompt = (params: {
  languageId: string;
  level: string;
  context: SpeakingContext;
  recentMessages: SpeakingMessage[];
  lastUserMessage?: string;
}): string => {
  const title = languageTitle(params.languageId);
  const lastAIQuestion = [...params.recentMessages].reverse().find((m) => m.role === 'ai')?.text;
  const lastAnswer = params.lastUserMessage?.trim();

  const transcript =
    params.recentMessages.length === 0
      ? '(conversation has not started yet)'
      : params.recentMessages
          .map((m) => `${m.role === 'ai' ? 'Tutor' : 'Learner'}: ${m.text}`)
          .join('\n');

  const questionLine =
    lastAIQuestion && lastAIQuestion.length > 0
      ? `Tutor's last question: ${lastAIQuestion}`
      : 'There is no tutor question yet — suggest a natural way to start talking about the topic.';
  const answerLine =
    lastAnswer && lastAnswer.length > 0
      ? `Learner's last answer: ${lastAnswer}`
      : 'The learner has not answered yet.';

  const levelGuidance =
    params.level === 'A1' || params.level === 'A2'
      ? `The learner is a beginner (${params.level}). Keep it ONE very simple, natural short sentence with basic, common words.`
      : `Match CEFR level ${params.level}: natural and fluent, but still ONE short sentence the learner can comfortably say aloud.`;

  return [
    'You help a language learner by suggesting ONE example answer they could say out loud next.',
    '',
    'Practice mode: AI Conversation (back-and-forth dialogue with a tutor)',
    `Language: ${title}`,
    `Level: ${params.level}`,
    `Topic: ${contextTitle(params.context)} — ${contextDescription(params.context)}`,
    `Topic context: ${contextPromptContext(params.context)}`,
    questionLine,
    answerLine,
    '',
    'Recent conversation:',
    transcript,
    '',
    'Write ONE example answer the learner could say next.',
    'Rules:',
    '- If there is a tutor question, the answer MUST directly and relevantly respond to it.',
    `- ${levelGuidance}`,
    `- Write it in ${title}, in the learner's own first-person voice.`,
    '- Output ONLY the sentence itself — no translation, no quotes, no label, no explanation, no markdown.',
  ].join('\n');
};

export const requestConversationReply = async (
  params: Parameters<typeof buildConversationPrompt>[0],
  signal?: AbortSignal,
): Promise<string> => {
  const reply = await generateText(
    { prompt: buildConversationPrompt(params), task: 'speaking_conversation' },
    signal,
  );
  return reply.trim();
};

export const requestConversationHint = async (
  params: Parameters<typeof buildHintPrompt>[0],
  signal?: AbortSignal,
): Promise<string> => {
  const hint = await generateText(
    { prompt: buildHintPrompt(params), task: 'speaking_conversation' },
    signal,
  );
  return hint.trim();
};

/* --- Local fallbacks (iOS parity) --- */

export const fallbackReply = (languageId: string): string => {
  switch (languageId) {
    case 'spanish': return 'Te escuché. Continuemos. ¿Qué más te gustaría?';
    case 'french': return 'Je t’ai entendu. Continuons. Que voudrais-tu d’autre ?';
    case 'german': return 'Ich habe dich gehört. Machen wir weiter. Was möchtest du noch?';
    case 'italian': return 'Ti ho sentito. Continuiamo. Cos’altro vorresti?';
    default: return 'I heard you. Let’s continue. What else would you like?';
  }
};

const SCENARIO_HINTS: Record<string, Record<string, string>> = {
  cafe: {
    english: 'Try saying: I would like a coffee, please.',
    spanish: 'Try saying: Quisiera un café, por favor.',
    french: 'Try saying: Je voudrais un café, s’il vous plaît.',
    german: 'Try saying: Ich hätte gern einen Kaffee, bitte.',
  },
  travel: {
    english: 'Try saying: Excuse me, how do I get to the station?',
    spanish: 'Try saying: Disculpa, ¿cómo llego a la estación?',
    french: 'Try saying: Excusez-moi, comment aller à la gare ?',
    german: 'Try saying: Entschuldigung, wie komme ich zum Bahnhof?',
  },
  'daily-life': {
    english: 'Try saying: I usually wake up at seven and have coffee.',
    spanish: 'Try saying: Normalmente me despierto a las siete y tomo café.',
    french: 'Try saying: Je me réveille à sept heures et je prends un café.',
    german: 'Try saying: Ich stehe um sieben auf und trinke Kaffee.',
  },
  shopping: {
    english: 'Try saying: How much does this cost?',
    spanish: 'Try saying: ¿Cuánto cuesta esto?',
    french: 'Try saying: Combien ça coûte ?',
    german: 'Try saying: Wie viel kostet das?',
  },
  'job-interview': {
    english: 'Try saying: I have three years of experience in this field.',
    spanish: 'Try saying: Tengo tres años de experiencia en este campo.',
    french: 'Try saying: J’ai trois ans d’expérience dans ce domaine.',
    german: 'Try saying: Ich habe drei Jahre Erfahrung in diesem Bereich.',
  },
  airport: {
    english: 'Try saying: I’d like to check in for my flight to Paris.',
    spanish: 'Try saying: Quisiera facturar para mi vuelo a París.',
    french: 'Try saying: Je voudrais enregistrer mes bagages pour Paris.',
    german: 'Try saying: Ich möchte für meinen Flug nach Paris einchecken.',
  },
};

const genericTopicHint = (languageId: string): string => {
  switch (languageId) {
    case 'spanish': return 'Intenta decir una frase sencilla sobre este tema.';
    case 'french': return 'Essaie de dire une phrase simple sur ce sujet.';
    case 'german': return 'Versuch, einen einfachen Satz zu diesem Thema zu sagen.';
    case 'italian': return 'Prova a dire una frase semplice su questo argomento.';
    default: return 'Try saying one simple sentence about this topic.';
  }
};

export const localHint = (languageId: string, context: SpeakingContext): string => {
  if (context.kind === 'scenario') {
    const perLang = SCENARIO_HINTS[context.scenario.id];
    return (
      perLang?.[languageId] ??
      perLang?.english ??
      `Try saying one short sentence about ${context.scenario.title.toLowerCase()}.`
    );
  }
  const title = context.topic.title.trim();
  if (title.length === 0) return genericTopicHint(languageId);
  switch (languageId) {
    case 'spanish': return `Intenta decir qué piensas o qué te gusta sobre «${title}».`;
    case 'french': return `Essaie de dire ce que tu penses ou ce que tu aimes à propos de « ${title} ».`;
    case 'german': return `Sag, was du über „${title}“ denkst oder was dir daran gefällt.`;
    case 'italian': return `Prova a dire cosa pensi o cosa ti piace di «${title}».`;
    default: return `Try saying what you think or like about “${title}.”`;
  }
};
