/* Debate mode — web port of the iOS Debate models + DebateConversationService.
   The learner picks a side (agree / disagree / surprise me), argues a generated
   topic across a fixed sequence of rounds against an AI opponent that always
   takes the opposite side. Replies go through the `speaking_conversation` task;
   the end-of-debate feedback uses `debate_feedback` (7 metrics). */
import { generateText } from '@/lib/aiClient';
import { findLanguage } from '@/lib/essayTypes';
import {
  type ConversationLength,
  type GeneratedConversationTopic,
  type SpeakingMessage,
} from '@/lib/speakingTypes';

export const DEBATE_HISTORY_LIMIT = 4;

/* --- Sides --- */

export type DebateSide = 'agree' | 'disagree' | 'surpriseMe';
export type ConcreteSide = 'agree' | 'disagree';

export interface DebateSideDef {
  id: DebateSide;
  titleKey: string;
  subtitleKey: string;
  iconSystemName: string;
}

export const DEBATE_SIDES: DebateSideDef[] = [
  { id: 'agree', titleKey: 'speaking.debate.side.agree.title', subtitleKey: 'speaking.debate.side.agree.subtitle', iconSystemName: 'hand.thumbsup.fill' },
  { id: 'disagree', titleKey: 'speaking.debate.side.disagree.title', subtitleKey: 'speaking.debate.side.disagree.subtitle', iconSystemName: 'hand.thumbsdown.fill' },
  { id: 'surpriseMe', titleKey: 'speaking.debate.side.surprise.title', subtitleKey: 'speaking.debate.side.surprise.subtitle', iconSystemName: 'shuffle' },
];

export const resolveConcreteSide = (
  side: DebateSide,
  coin: () => boolean = () => Math.random() < 0.5,
): ConcreteSide => {
  if (side === 'agree' || side === 'disagree') return side;
  return coin() ? 'agree' : 'disagree';
};

export const oppositeSide = (side: ConcreteSide): ConcreteSide =>
  side === 'agree' ? 'disagree' : 'agree';

const stanceVerb = (side: DebateSide): string => {
  switch (side) {
    case 'agree': return 'support';
    case 'disagree': return 'oppose';
    default: return 'take a side on';
  }
};

/* --- Rounds --- */

export type DebateRoundKind =
  | 'openingArgument'
  | 'rebuttal'
  | 'crossExamination'
  | 'closingStatement';

export interface DebateRound {
  index: number;
  kind: DebateRoundKind;
}

export const ROUND_LABEL: Record<DebateRoundKind, string> = {
  openingArgument: 'Opening',
  rebuttal: 'Rebuttal',
  crossExamination: 'Cross-examination',
  closingStatement: 'Closing',
};

export const ROUND_LEARNER_PROMPT: Record<DebateRoundKind, string> = {
  openingArgument: 'State your opinion and give your strongest reason.',
  rebuttal: 'Respond to the opponent and defend your position.',
  crossExamination: "Challenge the opponent's point or add a new argument.",
  closingStatement: 'Summarise your case in one strong final statement.',
};

export const ROUND_AI_INSTRUCTION: Record<DebateRoundKind, string> = {
  openingArgument: "Acknowledge the learner's opening, then present one clear counter-argument.",
  rebuttal: "Challenge the learner's reasoning and ask one probing follow-up question.",
  crossExamination: "Press the weakest point in the learner's argument, but stay respectful and constructive.",
  closingStatement: "Give a brief closing counter-point and invite the learner's final statement.",
};

export const roundTitle = (round: DebateRound): string =>
  `Round ${round.index + 1} · ${ROUND_LABEL[round.kind]}`;

export const debateRoundsFor = (length: ConversationLength): DebateRound[] => {
  const kinds: DebateRoundKind[] =
    length === 'short'
      ? ['openingArgument', 'rebuttal', 'closingStatement']
      : length === 'medium'
        ? ['openingArgument', 'rebuttal', 'crossExamination', 'closingStatement']
        : ['openingArgument', 'rebuttal', 'crossExamination', 'rebuttal', 'closingStatement'];
  return kinds.map((kind, index) => ({ index, kind }));
};

/* --- Pure session (round progression) --- */

export interface DebateSession {
  topic: GeneratedConversationTopic;
  learnerSide: ConcreteSide;
  aiSide: ConcreteSide;
  rounds: DebateRound[];
  currentRoundIndex: number;
}

export const makeDebateSession = (
  topic: GeneratedConversationTopic,
  requestedSide: DebateSide,
  length: ConversationLength,
  coin?: () => boolean,
): DebateSession => {
  const learnerSide = resolveConcreteSide(requestedSide, coin);
  return {
    topic,
    learnerSide,
    aiSide: oppositeSide(learnerSide),
    rounds: debateRoundsFor(length),
    currentRoundIndex: 0,
  };
};

export const currentRound = (session: DebateSession): DebateRound | null =>
  session.rounds[session.currentRoundIndex] ?? null;

export const isDebateFinished = (session: DebateSession): boolean =>
  session.currentRoundIndex >= session.rounds.length;

/* Advance one round. Returns the next session plus `didAdvance` — false means we
   were already on the last round, so the caller should end the debate. */
export const advanceSession = (
  session: DebateSession,
): { session: DebateSession; didAdvance: boolean } => {
  if (session.currentRoundIndex >= session.rounds.length - 1) {
    return { session: { ...session, currentRoundIndex: session.rounds.length }, didAdvance: false };
  }
  return {
    session: { ...session, currentRoundIndex: session.currentRoundIndex + 1 },
    didAdvance: true,
  };
};

/* --- Prompts (iOS-verbatim) --- */

export interface DebatePromptBase {
  languageId: string;
  level: string;
  topic: GeneratedConversationTopic;
  learnerSide: ConcreteSide;
  aiSide: ConcreteSide;
}

export const buildOpeningPrompt = (params: DebatePromptBase): string => {
  const title = findLanguage(params.languageId).title;
  return [
    'You are a friendly but sharp debate opponent in a language learning app.',
    '',
    `Language: ${title}`,
    `Learner level: ${params.level}`,
    `Debate topic: ${params.topic.title}`,
    `Topic context: ${params.topic.promptContext}`,
    '',
    `The learner will argue to ${stanceVerb(params.learnerSide)} the statement.`,
    `You argue the opposite: you ${stanceVerb(params.aiSide)} the statement.`,
    '',
    'Open the debate:',
    '- Briefly state your position on the topic.',
    '- Give ONE clear, level-appropriate argument for your side.',
    '- Invite the learner to share their opening opinion.',
    '',
    'Style rules:',
    '- Be respectful and encouraging. Never insult or attack the person.',
    '- Keep it short (2-3 sentences).',
    `- Match level ${params.level} vocabulary.`,
    `- Reply in ${title}. Do not output JSON or markdown.`,
    '',
    'Return only your opening statement.',
  ].join('\n');
};

export const buildReplyPrompt = (
  params: DebatePromptBase & {
    round: DebateRound;
    recentMessages: SpeakingMessage[];
    latestUserMessage: string;
  },
): string => {
  const title = findLanguage(params.languageId).title;
  const recentLines =
    params.recentMessages.length === 0
      ? '(no prior turns)'
      : params.recentMessages
          .map((m) => `${m.role === 'ai' ? 'Opponent' : 'Learner'}: ${m.text}`)
          .join('\n');

  return [
    'You are a friendly but sharp debate opponent in a language learning app.',
    '',
    `Language: ${title}`,
    `Learner level: ${params.level}`,
    `Debate topic: ${params.topic.title}`,
    `Topic context: ${params.topic.promptContext}`,
    '',
    `The learner argues to ${stanceVerb(params.learnerSide)} the statement.`,
    `You argue the opposite: you ${stanceVerb(params.aiSide)} the statement.`,
    '',
    `Current round: ${roundTitle(params.round)}`,
    `This round, you should: ${ROUND_AI_INSTRUCTION[params.round.kind]}`,
    '',
    'Style rules:',
    "- Stay on your side and push back on the learner's reasoning.",
    '- Be respectful and constructive — challenge ideas, never the person.',
    '- Keep it short (1-2 sentences).',
    `- Match level ${params.level} vocabulary.`,
    `- Reply in ${title}. Do not output JSON or markdown.`,
    '',
    'Recent exchange:',
    recentLines,
    '',
    'Learner just said:',
    params.latestUserMessage,
    '',
    'Return only your reply.',
  ].join('\n');
};

export const requestDebateOpening = async (
  params: DebatePromptBase,
  signal?: AbortSignal,
): Promise<string> => {
  const reply = await generateText(
    { prompt: buildOpeningPrompt(params), task: 'speaking_conversation' },
    signal,
  );
  return reply.trim();
};

export const requestDebateReply = async (
  params: Parameters<typeof buildReplyPrompt>[0],
  signal?: AbortSignal,
): Promise<string> => {
  const reply = await generateText(
    { prompt: buildReplyPrompt(params), task: 'speaking_conversation' },
    signal,
  );
  return reply.trim();
};

/* --- Local fallbacks (iOS parity) --- */

export const fallbackOpening = (languageId: string, topicTitle: string): string => {
  switch (languageId) {
    case 'spanish': return `Empecemos a debatir sobre ${topicTitle}. Yo no estoy de acuerdo. ¿Cuál es tu opinión?`;
    case 'french': return `Commençons à débattre de ${topicTitle}. Je ne suis pas d'accord. Quel est ton avis ?`;
    case 'german': return `Lass uns über ${topicTitle} debattieren. Ich bin anderer Meinung. Was denkst du?`;
    case 'italian': return `Iniziamo a dibattere su ${topicTitle}. Io non sono d'accordo. Qual è la tua opinione?`;
    default: return `Let's debate ${topicTitle}. I disagree. What's your opinion?`;
  }
};

export const fallbackReply = (languageId: string): string => {
  switch (languageId) {
    case 'spanish': return 'Entiendo tu punto, pero no me convence del todo. ¿Por qué crees eso?';
    case 'french': return "Je comprends ton point, mais ça ne me convainc pas. Pourquoi penses-tu cela ?";
    case 'german': return 'Ich verstehe dein Argument, aber es überzeugt mich nicht ganz. Warum denkst du das?';
    case 'italian': return 'Capisco il tuo punto, ma non mi convince del tutto. Perché lo pensi?';
    default: return "I see your point, but it doesn't fully convince me. Why do you think that?";
  }
};

export const debateHints = (languageId: string): string[] => {
  switch (languageId) {
    case 'spanish': return ['Creo que…', 'Una razón es…', 'En mi opinión…', 'Por otro lado…', 'Estoy de acuerdo porque…'];
    case 'french': return ['Je pense que…', 'Une raison est…', 'À mon avis…', "D'un autre côté…", "Je suis d'accord parce que…"];
    case 'german': return ['Ich denke, dass…', 'Ein Grund ist…', 'Meiner Meinung nach…', 'Andererseits…', 'Ich stimme zu, weil…'];
    case 'italian': return ['Penso che…', 'Una ragione è…', 'Secondo me…', "D'altra parte…", "Sono d'accordo perché…"];
    default: return ['I think that…', 'One reason is…', 'In my opinion…', 'On the other hand…', 'I agree because…'];
  }
};
