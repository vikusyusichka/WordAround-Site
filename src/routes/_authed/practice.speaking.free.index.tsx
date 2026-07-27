/* Free Speaking setup — /practice/speaking/free. Language/level/length; the
   topic is auto-generated when the session starts. */
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { SetupSection } from '@/components/practice/SetupSection';
import { OptionPillGroup } from '@/components/practice/OptionPill';
import { StartButton } from '@/components/practice/StartButton';
import { FreeSpeakingTopicCard } from '@/components/speaking/FreeSpeakingTopicCard';
import { ESSAY_LANGUAGES, findLanguage } from '@/lib/essayTypes';
import {
  CONVERSATION_LENGTHS,
  CONVERSATION_LENGTH_MINUTES,
  type ConversationLength,
} from '@/lib/speakingTypes';

export const Route = createFileRoute('/_authed/practice/speaking/free/')({
  component: FreeSpeakingSetup,
});

// Free Speaking is the green Speaking mode (AppColors.greenAccent / greenTitle).
const ACCENT = '#29ba66';
const ACCENT_DARK = '#128c47';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

function FreeSpeakingSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [languageId, setLanguageId] = useState('english');
  const [level, setLevel] = useState('B1');
  const [length, setLength] = useState<ConversationLength>('short');

  return (
    <ContentContainer fluid>
      <PageHeader title={t('speaking.free.title')} subtitle={t('speaking.free.subtitle')} />

      <div className="flex w-full flex-col gap-6">
        <SetupSection title={t('reading.addText.language')} accentDark={ACCENT_DARK}>
          <OptionPillGroup
            options={ESSAY_LANGUAGES.map((l) => ({ id: l.id, label: l.title }))}
            value={languageId}
            onChange={setLanguageId}
            accent={ACCENT}
            accentDark={ACCENT_DARK}
            columns={3}
          />
        </SetupSection>

        <SetupSection title={t('listening.fromText.level')} accentDark={ACCENT_DARK}>
          <OptionPillGroup
            options={LEVELS.map((l) => ({ id: l, label: l }))}
            value={level}
            onChange={setLevel}
            accent={ACCENT}
            accentDark={ACCENT_DARK}
          />
        </SetupSection>

        <SetupSection title={t('speaking.conversation.length')} accentDark={ACCENT_DARK}>
          <OptionPillGroup
            options={CONVERSATION_LENGTHS.map((l) => ({
              id: l,
              label: `${CONVERSATION_LENGTH_MINUTES[l]} ${t('speaking.conversation.min')}`,
            }))}
            value={length}
            onChange={setLength}
            accent={ACCENT}
            accentDark={ACCENT_DARK}
          />
        </SetupSection>

        <SetupSection title={t('speaking.free.preview')} accentDark={ACCENT_DARK}>
          <FreeSpeakingTopicCard
            title={t('speaking.free.autoTopic')}
            description={t('speaking.free.autoTopicHint', { language: findLanguage(languageId).title, level })}
            chips={[level, `${CONVERSATION_LENGTH_MINUTES[length]} ${t('speaking.conversation.min')}`, t('speaking.free.auto')]}
            accentColor={ACCENT}
          />
        </SetupSection>

        <StartButton
          label={t('speaking.free.start')}
          icon="mic.fill"
          accent={ACCENT}
          accentDark={ACCENT_DARK}
          onClick={() => void navigate({ to: '/practice/speaking/free/session', search: { lang: languageId, level, length } })}
        />
      </div>
    </ContentContainer>
  );
}
