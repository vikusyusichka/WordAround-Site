/* Describe Picture setup — /practice/speaking/picture. Language/level/length;
   the photo is fetched when the session starts. */
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
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

const ACCENT = '#F7A310';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const pill = (selected: boolean) =>
  `h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    selected
      ? 'border-[#F7A310]/60 bg-[#F7A310]/12 text-[#A66A05]'
      : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
  }`;

const sectionTitle = 'text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)';

function DescribePictureSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [languageId, setLanguageId] = useState('english');
  const [level, setLevel] = useState('B1');
  const [length, setLength] = useState<ConversationLength>('short');

  return (
    <ContentContainer fluid>
      <PageHeader title={t('speaking.picture.title')} subtitle={t('speaking.picture.subtitle')} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={() => void navigate({ to: '/practice/speaking' })}
          className="w-fit text-[13px] font-semibold text-[#A66A05] hover:underline focus-visible:outline-none"
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
        </div>

        <button
          type="button"
          onClick={() => void navigate({ to: '/practice/speaking/picture/session', search: { lang: languageId, level, length } })}
          className="h-12 w-full rounded-2xl bg-linear-to-r from-[#F7A310] to-[#E08B00] text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(247,163,16,0.28)] transition-transform hover:brightness-105 active:scale-[0.98]"
        >
          {t('speaking.picture.start')}
        </button>
      </div>
    </ContentContainer>
  );
}
