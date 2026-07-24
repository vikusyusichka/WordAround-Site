/* AI Conversation setup — /practice/speaking/conversation. Language/level,
   scenario (or auto-topic), length. Starts the session with the chosen
   context via router state. */
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { SetupSection } from '@/components/practice/SetupSection';
import { OptionPillGroup } from '@/components/practice/OptionPill';
import { SetupScenarioCard } from '@/components/practice/SetupScenarioCard';
import { StartButton } from '@/components/practice/StartButton';
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

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

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

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <SetupSection title={t('reading.addText.language')}>
          <OptionPillGroup
            options={ESSAY_LANGUAGES.map((l) => ({ id: l.id, label: l.title }))}
            value={languageId}
            onChange={setLanguageId}
            columns={3}
          />
        </SetupSection>

        <SetupSection title={t('listening.fromText.level')}>
          <OptionPillGroup
            options={LEVELS.map((l) => ({ id: l, label: l }))}
            value={level}
            onChange={setLevel}
          />
        </SetupSection>

        <SetupSection title={t('speaking.conversation.topic')}>
          <OptionPillGroup
            options={[
              { id: 'scenarios', label: t('speaking.conversation.scenarios') },
              { id: 'auto', label: t('speaking.conversation.autoTopic') },
            ]}
            value={useAutoTopic ? 'auto' : 'scenarios'}
            onChange={(id) => setUseAutoTopic(id === 'auto')}
          />
          {!useAutoTopic && (
            <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {SPEAKING_SCENARIOS.map((s) => (
                <SetupScenarioCard
                  key={s.id}
                  title={s.title}
                  description={s.description}
                  selected={s.id === scenarioId}
                  onClick={() => setScenarioId(s.id)}
                />
              ))}
            </div>
          )}
          {useAutoTopic && (
            <p className="mt-1 flex items-center gap-2 text-[13px] font-medium text-(--color-text-secondary)">
              <Icon name="sparkles" className="size-[15px] text-(--color-primary-blue)" />
              {t('speaking.conversation.autoTopicHint')}
            </p>
          )}
        </SetupSection>

        <SetupSection title={t('speaking.conversation.length')}>
          <OptionPillGroup
            options={CONVERSATION_LENGTHS.map((l) => ({
              id: l,
              label: `${CONVERSATION_LENGTH_MINUTES[l]} ${t('speaking.conversation.min')}`,
            }))}
            value={length}
            onChange={setLength}
          />
        </SetupSection>

        {error && (
          <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
            {error}
          </p>
        )}

        <StartButton
          label={isStarting ? t('speaking.conversation.starting') : t('speaking.conversation.start')}
          icon="bubble.left.and.bubble.right.fill"
          disabled={isStarting}
          onClick={() => void start()}
        />
      </div>
    </ContentContainer>
  );
}
