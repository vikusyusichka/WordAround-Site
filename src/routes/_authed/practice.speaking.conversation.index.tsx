/* AI Conversation setup — /practice/speaking/conversation. Language/level,
   scenario (or auto-topic), length. Starts the session with the chosen
   context via router state. */
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { ESSAY_LANGUAGES } from '@/lib/essayTypes';
import { generateConversationTopic, recentTopicTitles } from '@/lib/speakingTopics';
import {
  CONVERSATION_LENGTHS,
  CONVERSATION_LENGTH_MINUTES,
  SPEAKING_SCENARIOS,
  type ConversationLength,
} from '@/lib/speakingTypes';

export const Route = createFileRoute('/_authed/practice/speaking/conversation/')({
  component: ConversationSetup,
});

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const pill = (selected: boolean) =>
  `h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    selected
      ? 'border-[#2B5CFA]/50 bg-[#2B5CFA]/10 text-(--color-primary-blue-dark)'
      : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
  }`;

const sectionTitle = 'text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)';

function ConversationSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [languageId, setLanguageId] = useState('english');
  const [level, setLevel] = useState('B1');
  const [scenarioId, setScenarioId] = useState<string>('cafe');
  const [useAutoTopic, setUseAutoTopic] = useState(false);
  const [length, setLength] = useState<ConversationLength>('short');
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setIsStarting(true);
    setError(null);
    try {
      let contextParam: string;
      if (useAutoTopic) {
        const { topic } = await generateConversationTopic({
          languageId,
          level,
          length,
          avoidTitles: recentTopicTitles(languageId, level),
          forceRefresh: true,
        });
        contextParam = JSON.stringify({ kind: 'topic', topic });
      } else {
        const scenario = SPEAKING_SCENARIOS.find((s) => s.id === scenarioId) ?? SPEAKING_SCENARIOS[0];
        contextParam = JSON.stringify({ kind: 'scenario', scenario });
      }
      void navigate({
        to: '/practice/speaking/conversation/session',
        search: { lang: languageId, level, length, ctx: contextParam },
      });
    } catch {
      setError(t('speaking.conversation.startError'));
      setIsStarting(false);
    }
  };

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('speaking.conversation.title')}
        subtitle={t('speaking.conversation.subtitle')}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={() => void navigate({ to: '/practice/speaking' })}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {t('nav.speaking')}
        </button>

        <div className="flex flex-col gap-1.5">
          <span className={sectionTitle}>{t('reading.addText.language')}</span>
          <div className="flex flex-wrap gap-1.5">
            {ESSAY_LANGUAGES.map((lang) => (
              <button key={lang.id} type="button" onClick={() => setLanguageId(lang.id)} className={pill(languageId === lang.id)}>
                {lang.title}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={sectionTitle}>{t('listening.fromText.level')}</span>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((l) => (
              <button key={l} type="button" onClick={() => setLevel(l)} className={pill(level === l)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Topic: scenario or auto */}
        <div className="flex flex-col gap-1.5">
          <span className={sectionTitle}>{t('speaking.conversation.topic')}</span>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setUseAutoTopic(false)} className={pill(!useAutoTopic)}>
              {t('speaking.conversation.scenarios')}
            </button>
            <button type="button" onClick={() => setUseAutoTopic(true)} className={pill(useAutoTopic)}>
              {t('speaking.conversation.autoTopic')}
            </button>
          </div>
          {!useAutoTopic && (
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SPEAKING_SCENARIOS.map((s) => {
                const selected = s.id === scenarioId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScenarioId(s.id)}
                    className={`flex flex-col gap-0.5 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? 'border-[#2B5CFA]/50 bg-[#2B5CFA]/8'
                        : 'border-(--color-auth-field-border) bg-white hover:border-[#2B5CFA]/30'
                    }`}
                  >
                    <span className="text-[14px] font-bold text-(--color-primary-blue-dark)">{s.title}</span>
                    <span className="text-[11px] font-medium text-(--color-text-secondary)">{s.description}</span>
                  </button>
                );
              })}
            </div>
          )}
          {useAutoTopic && (
            <p className="mt-1 flex items-center gap-2 text-[13px] font-medium text-(--color-text-secondary)">
              <Icon name="sparkles" className="size-[15px] text-[#2B5CFA]" />
              {t('speaking.conversation.autoTopicHint')}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={sectionTitle}>{t('speaking.conversation.length')}</span>
          <div className="flex gap-1.5">
            {CONVERSATION_LENGTHS.map((l) => (
              <button key={l} type="button" onClick={() => setLength(l)} className={pill(length === l)}>
                {CONVERSATION_LENGTH_MINUTES[l]} {t('speaking.conversation.min')}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void start()}
          disabled={isStarting}
          className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
        >
          {isStarting ? t('speaking.conversation.starting') : t('speaking.conversation.start')}
        </button>
      </div>
    </ContentContainer>
  );
}
