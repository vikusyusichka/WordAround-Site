/* Types + static config for Phase 7 Speaking. Sessions are ephemeral (no
   persistence — iOS records only DailyPracticeStats, deferred on web). Mirrors
   the iOS Speaking Shared models. */
import type { HomeSetPreviewItem } from '@/lib/homeTypes';

export type SpeakingModeId =
  | 'ai-conversation'
  | 'free-speaking'
  | 'describe-picture'
  | 'debate-mode'
  | 'shadowing'
  | 'pronunciation';

export interface SpeakingMenuItemDef {
  id: SpeakingModeId;
  titleKey: string;
  subtitleKey: string;
  iconSystemName: string;
  accentColor: string;
  blobColor: string;
  enabled: boolean;
}

/* iOS SpeakingMode.allModes + AppColors. */
export const SPEAKING_MENU_ITEMS: SpeakingMenuItemDef[] = [
  {
    id: 'ai-conversation',
    titleKey: 'speaking.menu.conversation.title',
    subtitleKey: 'speaking.menu.conversation.subtitle',
    iconSystemName: 'bubble.left.and.bubble.right.fill',
    accentColor: '#2B5CFA',
    blobColor: '#D1DCFA',
    enabled: true,
  },
  {
    id: 'free-speaking',
    titleKey: 'speaking.menu.free.title',
    subtitleKey: 'speaking.menu.free.subtitle',
    iconSystemName: 'mic.fill',
    accentColor: '#3CCF91',
    blobColor: '#D1F5E6',
    enabled: true,
  },
  {
    id: 'describe-picture',
    titleKey: 'speaking.menu.picture.title',
    subtitleKey: 'speaking.menu.picture.subtitle',
    iconSystemName: 'photo.fill',
    accentColor: '#F7A310',
    blobColor: '#F2DBA1',
    enabled: true,
  },
  {
    id: 'debate-mode',
    titleKey: 'speaking.menu.debate.title',
    subtitleKey: 'speaking.menu.debate.subtitle',
    iconSystemName: 'person.2.fill',
    accentColor: '#ED6699',
    blobColor: '#FADBE7',
    enabled: true,
  },
  {
    id: 'shadowing',
    titleKey: 'speaking.menu.shadowing.title',
    subtitleKey: 'speaking.menu.shadowing.subtitle',
    iconSystemName: 'headphones',
    accentColor: '#8A5CE0',
    blobColor: '#E6D6FA',
    enabled: true,
  },
  {
    id: 'pronunciation',
    titleKey: 'speaking.menu.pronunciation.title',
    subtitleKey: 'speaking.menu.pronunciation.subtitle',
    iconSystemName: 'waveform',
    accentColor: '#2EB8CC',
    blobColor: '#CCF0F5',
    enabled: true,
  },
];

/* --- Conversation core --- */

export type ConversationLength = 'short' | 'medium' | 'long';
export const CONVERSATION_LENGTHS: ConversationLength[] = ['short', 'medium', 'long'];
export const CONVERSATION_LENGTH_MINUTES: Record<ConversationLength, number> = {
  short: 5,
  medium: 10,
  long: 15,
};

export type SpeakingRole = 'ai' | 'user';

export interface SpeakingMessage {
  role: SpeakingRole;
  text: string;
}

export type SpeakingState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface ConversationScenario {
  id: string;
  title: string;
  description: string;
  category: string;
  promptContext: string;
  firstMessages: Record<string, string>;
}

export interface GeneratedConversationTopic {
  title: string;
  description: string;
  firstAIMessage: string;
  promptContext: string;
  category: string;
}

export type SpeakingContext =
  | { kind: 'scenario'; scenario: ConversationScenario }
  | { kind: 'topic'; topic: GeneratedConversationTopic };

export const contextTitle = (context: SpeakingContext): string =>
  context.kind === 'scenario' ? context.scenario.title : context.topic.title;

export const contextPromptContext = (context: SpeakingContext): string =>
  context.kind === 'scenario' ? context.scenario.promptContext : context.topic.promptContext;

export const contextDescription = (context: SpeakingContext): string =>
  context.kind === 'scenario' ? context.scenario.description : context.topic.description;

export const firstMessageFor = (context: SpeakingContext, languageId: string): string => {
  if (context.kind === 'topic') return context.topic.firstAIMessage;
  const fm = context.scenario.firstMessages;
  return fm[languageId] ?? fm.english ?? '';
};

/* --- Feedback --- */

export interface SpeakingFeedbackMetric {
  title: string;
  rating: string;
  score: number;
  explanation: string;
  iconName: string;
}

export interface SpeakingCorrection {
  originalText: string;
  correctedText: string;
  explanation: string;
  category: string;
}

export interface SpeakingFeedback {
  overallScore: number;
  summary: string;
  grammar: SpeakingFeedbackMetric;
  pronunciation: SpeakingFeedbackMetric;
  vocabulary: SpeakingFeedbackMetric;
  fluency: SpeakingFeedbackMetric;
  corrections: SpeakingCorrection[];
  extraMetrics: SpeakingFeedbackMetric[];
  transcript: string;
  isFallback: boolean;
}

/* --- 6 conversation languages with first-messages (iOS parity) --- */

export const SPEAKING_SCENARIOS: ConversationScenario[] = [
  {
    id: 'cafe',
    title: 'Cafe',
    description: 'Order a drink and ask about desserts.',
    category: 'Daily life',
    promptContext:
      'The learner is a customer at a cosy cafe. You play the barista. Greet warmly, take their order, suggest desserts and snacks, and help them practice ordering, asking prices, and choosing items.',
    firstMessages: {
      english: 'Hi there! Welcome to the cafe. What would you like to order today?',
      spanish: '¡Hola! Bienvenido al café. ¿Qué te gustaría pedir hoy?',
      french: 'Bonjour ! Bienvenue au café. Que voulez-vous commander aujourd’hui ?',
      german: 'Hallo! Willkommen im Café. Was möchten Sie heute bestellen?',
      italian: 'Ciao! Benvenuto al caffè. Cosa vorresti ordinare oggi?',
      portuguese: 'Olá! Bem-vindo ao café. O que gostaria de pedir hoje?',
    },
  },
  {
    id: 'travel',
    title: 'Travel',
    description: 'Ask for directions and talk about your trip.',
    category: 'Travel',
    promptContext:
      'The learner is travelling abroad. You play a friendly local. Help them ask for directions, recommend places to visit, talk about transport, and practice talking about their trip.',
    firstMessages: {
      english: 'Hi! Are you visiting? Where are you headed today?',
      spanish: '¡Hola! ¿Estás de visita? ¿A dónde vas hoy?',
      french: 'Bonjour ! Vous êtes en visite ? Où allez-vous aujourd’hui ?',
      german: 'Hallo! Sind Sie zu Besuch? Wohin gehen Sie heute?',
      italian: 'Ciao! Sei in visita? Dove stai andando oggi?',
      portuguese: 'Olá! Está de visita? Para onde vai hoje?',
    },
  },
  {
    id: 'daily-life',
    title: 'Daily life',
    description: 'Talk about your routine and hobbies.',
    category: 'Daily life',
    promptContext:
      'Have a casual chat about everyday life. Ask the learner about their daily routine, weekend plans, hobbies, family, food they like. Keep it relaxed and friendly.',
    firstMessages: {
      english: 'Hey! How was your day so far?',
      spanish: '¡Hola! ¿Cómo va tu día?',
      french: 'Salut ! Comment se passe ta journée ?',
      german: 'Hallo! Wie war dein Tag bisher?',
      italian: 'Ciao! Com’è andata la tua giornata?',
      portuguese: 'Oi! Como foi o seu dia até agora?',
    },
  },
  {
    id: 'shopping',
    title: 'Shopping',
    description: 'Ask about prices, sizes and payment.',
    category: 'Daily life',
    promptContext:
      'The learner is shopping in a store. You play the shop assistant. Help them ask about prices, sizes, colors, payment methods, and try on items.',
    firstMessages: {
      english: 'Hi! Welcome in. Can I help you find anything?',
      spanish: '¡Hola! Bienvenido. ¿Te ayudo a encontrar algo?',
      french: 'Bonjour ! Bienvenue. Je peux vous aider à trouver quelque chose ?',
      german: 'Hallo! Willkommen. Kann ich Ihnen helfen, etwas zu finden?',
      italian: 'Ciao! Benvenuto. Posso aiutarti a trovare qualcosa?',
      portuguese: 'Olá! Bem-vindo. Posso ajudar a encontrar algo?',
    },
  },
  {
    id: 'job-interview',
    title: 'Job interview',
    description: 'Answer simple interview questions.',
    category: 'Professional',
    promptContext:
      'You are interviewing the learner for a job. Ask simple interview questions about their experience, skills, motivation, and availability. Be encouraging but realistic.',
    firstMessages: {
      english: 'Hello, thanks for coming in today. Could you start by telling me a little about yourself?',
      spanish: 'Hola, gracias por venir hoy. ¿Podrías empezar contándome un poco sobre ti?',
      french: 'Bonjour, merci d’être venu aujourd’hui. Pouvez-vous commencer par me parler un peu de vous ?',
      german: 'Hallo, danke, dass Sie heute gekommen sind. Können Sie mir etwas über sich erzählen?',
      italian: 'Ciao, grazie per essere venuto oggi. Puoi iniziare raccontandomi un po’ di te?',
      portuguese: 'Olá, obrigado por vir hoje. Pode começar me contando um pouco sobre você?',
    },
  },
  {
    id: 'airport',
    title: 'Airport',
    description: 'Check in, ask about luggage and boarding.',
    category: 'Travel',
    promptContext:
      'The learner is at the airport. You play a check-in agent or gate agent. Help them check in, ask about luggage, seat preferences, boarding times, and gate locations.',
    firstMessages: {
      english: 'Hello! May I see your passport and ticket, please?',
      spanish: '¡Hola! ¿Me muestras tu pasaporte y tu billete, por favor?',
      french: 'Bonjour ! Puis-je voir votre passeport et votre billet, s’il vous plaît ?',
      german: 'Hallo! Darf ich Ihren Reisepass und Ihr Ticket sehen, bitte?',
      italian: 'Salve! Posso vedere il suo passaporto e il biglietto, per favore?',
      portuguese: 'Olá! Posso ver o seu passaporte e bilhete, por favor?',
    },
  },
];

/* BCP-47 speech locales (subset for the web's 8-language picker). */
const SPEAKING_LOCALES: Record<string, string> = {
  english: 'en-US',
  spanish: 'es-ES',
  french: 'fr-FR',
  german: 'de-DE',
  italian: 'it-IT',
  ukrainian: 'uk-UA',
  polish: 'pl-PL',
  russian: 'ru-RU',
};

export const speakingLocaleFor = (languageId: string): string =>
  SPEAKING_LOCALES[languageId] ?? 'en-US';

/* Static "Today progress" stub — Speaking has no local session store. */
export const SPEAKING_TODAY_GOAL: HomeSetPreviewItem = {
  id: 'speaking-today',
  title: '',
  subtitle: '',
  iconSystemName: 'mic.fill',
  currentValue: 0,
  totalValue: 15,
  unit: 'min',
  progress: 0,
  accentColor: '#2B5CFA',
  backgroundColor: 'var(--color-goal-bg)',
  progressBackgroundColor: 'var(--color-goal-progress-bg)',
  titleColor: 'var(--color-primary-blue-dark)',
  valueColor: 'var(--color-primary-blue-dark)',
  subtitleColor: 'var(--color-text-secondary)',
  iconBackground: '#ffffff',
  blobColor: '#D1DCFA',
};
