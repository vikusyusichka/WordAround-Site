/* Free Speaking setup — /practice/speaking/free. Language/level/length; the
   topic is auto-generated when the session starts. */
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
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

const ACCENT = '#3CCF91';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const pill = (selected: boolean) =>
  `h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    selected
      ? 'border-[#3CCF91]/60 bg-[#3CCF91]/12 text-[#1F8F63]'
      : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
  }`;

const sectionTitle = 'text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)';

function FreeSpeakingSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [languageId, setLanguageId] = useState('english');
  const [level, setLevel] = useState('B1');
  const [length, setLength] = useState<ConversationLength>('short');

  return (
    <ContentContainer fluid>
      <PageHeader title={t('speaking.free.title')} subtitle={t('speaking.free.subtitle')} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={() => void navigate({ to: '/practice/speaking' })}
          className="w-fit text-[13px] font-semibold text-[#1F8F63] hover:underline focus-visible:outline-none"
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

        <div className="flex flex-col gap-1.5">
          <span className={sectionTitle}>{t('speaking.free.preview')}</span>
          <FreeSpeakingTopicCard
            title={t('speaking.free.autoTopic')}
            description={t('speaking.free.autoTopicHint', { language: findLanguage(languageId).title, level })}
            chips={[level, `${CONVERSATION_LENGTH_MINUTES[length]} ${t('speaking.conversation.min')}`, t('speaking.free.auto')]}
            accentColor={ACCENT}
          />
        </div>

        <button
          type="button"
          onClick={() => void navigate({ to: '/practice/speaking/free/session', search: { lang: languageId, level, length } })}
          className="h-12 w-full rounded-2xl bg-linear-to-r from-[#3CCF91] to-[#2FB87E] text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(60,207,145,0.28)] transition-transform hover:brightness-105 active:scale-[0.98]"
        >
          {t('speaking.free.start')}
        </button>
      </div>
    </ContentContainer>
  );
}
