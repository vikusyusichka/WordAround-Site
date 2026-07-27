/* Describe Picture setup — /practice/speaking/picture. Language/level/length;
   the photo is fetched when the session starts. */
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { SetupSection } from '@/components/practice/SetupSection';
import { OptionPillGroup } from '@/components/practice/OptionPill';
import { StartButton } from '@/components/practice/StartButton';
import { ESSAY_LANGUAGES } from '@/lib/essayTypes';
import { PICTURE_PROMPT_HINTS } from '@/lib/describePicture';
import {
  CONVERSATION_LENGTHS,
  CONVERSATION_LENGTH_MINUTES,
  type ConversationLength,
} from '@/lib/speakingTypes';

export const Route = createFileRoute('/_authed/practice/speaking/picture/')({
  component: DescribePictureSetup,
});

// Describe Picture is the orange Speaking mode (AppColors.orangeAccent/Title).
const ACCENT = '#F7A310';
const ACCENT_DARK = '#AB6305';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

function DescribePictureSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [languageId, setLanguageId] = useState('english');
  const [level, setLevel] = useState('B1');
  const [length, setLength] = useState<ConversationLength>('short');

  return (
    <ContentContainer fluid>
      <PageHeader title={t('speaking.picture.title')} subtitle={t('speaking.picture.subtitle')} />

      <div className="flex w-full max-w-2xl flex-col gap-6">
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
          <div
            className="flex flex-col gap-2.5 rounded-2xl border p-4"
            style={{ background: `${ACCENT}12`, borderColor: `${ACCENT}2E` }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full"
                style={{ background: `${ACCENT}24`, color: ACCENT }}
              >
                <Icon name="photo.fill" className="size-[16px]" />
              </span>
              <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">
                {t('speaking.picture.prompt')}
              </span>
            </div>
            <span className="text-[13px] font-semibold text-(--color-text-secondary)">
              {t('speaking.picture.tryToMention')}
            </span>
            <div className="flex flex-wrap gap-2">
              {PICTURE_PROMPT_HINTS.map((hint) => (
                <span
                  key={hint.key}
                  className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 text-[12px] font-bold"
                  style={{ color: ACCENT }}
                >
                  <Icon name={hint.icon} className="size-[12px]" />
                  {t(`speaking.picture.hints.${hint.key}`)}
                </span>
              ))}
            </div>
          </div>
        </SetupSection>

        <StartButton
          label={t('speaking.picture.start')}
          icon="photo.fill"
          accent={ACCENT}
          accentDark={ACCENT_DARK}
          onClick={() => void navigate({ to: '/practice/speaking/picture/session', search: { lang: languageId, level, length } })}
        />
      </div>
    </ContentContainer>
  );
}
