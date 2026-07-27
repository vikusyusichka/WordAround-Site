/* Debate setup — /practice/speaking/debate. Language/level/length + side pick
   (agree / disagree / surprise me); the topic is generated when the debate starts. */
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { SetupSection } from '@/components/practice/SetupSection';
import { OptionPillGroup } from '@/components/practice/OptionPill';
import { SetupScenarioCard } from '@/components/practice/SetupScenarioCard';
import { StartButton } from '@/components/practice/StartButton';
import { ESSAY_LANGUAGES } from '@/lib/essayTypes';
import { DEBATE_SIDES, type DebateSide } from '@/lib/speakingDebate';
import {
  CONVERSATION_LENGTHS,
  CONVERSATION_LENGTH_MINUTES,
  type ConversationLength,
} from '@/lib/speakingTypes';

export const Route = createFileRoute('/_authed/practice/speaking/debate/')({
  component: DebateSetup,
});

// Debate is the pink Speaking mode.
const ACCENT = '#ED6699';
const ACCENT_DARK = '#B23A6E';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

function DebateSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [languageId, setLanguageId] = useState('english');
  const [level, setLevel] = useState('B1');
  const [length, setLength] = useState<ConversationLength>('short');
  const [side, setSide] = useState<DebateSide>('agree');

  return (
    <ContentContainer fluid>
      <PageHeader title={t('speaking.debate.title')} subtitle={t('speaking.debate.subtitle')} />

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

        <SetupSection title={t('speaking.debate.pickSide')} accentDark={ACCENT_DARK}>
          <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {DEBATE_SIDES.map((s) => (
              <SetupScenarioCard
                key={s.id}
                icon={s.iconSystemName}
                title={t(s.titleKey)}
                description={t(s.subtitleKey)}
                selected={s.id === side}
                accent={ACCENT}
                accentDark={ACCENT_DARK}
                onClick={() => setSide(s.id)}
              />
            ))}
          </div>
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

        <StartButton
          label={t('speaking.debate.start')}
          icon="bubble.left.and.bubble.right.fill"
          accent={ACCENT}
          accentDark={ACCENT_DARK}
          onClick={() => void navigate({ to: '/practice/speaking/debate/session', search: { lang: languageId, level, length, side } })}
        />
      </div>
    </ContentContainer>
  );
}
