/* Debate setup — /practice/speaking/debate. Language/level/length + side pick
   (agree / disagree / surprise me); the topic is generated when the debate starts. */
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
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

const ACCENT = '#ED6699';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const pill = (selected: boolean) =>
  `h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    selected
      ? 'border-[#ED6699]/60 bg-[#ED6699]/12 text-[#B23A6E]'
      : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
  }`;

const sectionTitle = 'text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)';

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

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={() => void navigate({ to: '/practice/speaking' })}
          className="w-fit text-[13px] font-semibold text-[#B23A6E] hover:underline focus-visible:outline-none"
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
          <span className={sectionTitle}>{t('speaking.debate.pickSide')}</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {DEBATE_SIDES.map((s) => {
              const selected = s.id === side;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSide(s.id)}
                  className={`flex flex-col gap-1 rounded-2xl border p-3.5 text-left transition-colors ${
                    selected ? 'border-[#ED6699]/60 bg-[#ED6699]/8' : 'border-(--color-auth-field-border) bg-white hover:border-[#ED6699]/30'
                  }`}
                >
                  <span
                    className="grid size-8 place-items-center rounded-full"
                    style={{ background: `${ACCENT}1F`, color: ACCENT }}
                  >
                    <Icon name={s.iconSystemName} className="size-[16px]" />
                  </span>
                  <span className="text-[14px] font-bold text-(--color-primary-blue-dark)">{t(s.titleKey)}</span>
                  <span className="text-[11px] font-medium text-(--color-text-secondary)">{t(s.subtitleKey)}</span>
                </button>
              );
            })}
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

        <button
          type="button"
          onClick={() => void navigate({ to: '/practice/speaking/debate/session', search: { lang: languageId, level, length, side } })}
          className="h-12 w-full rounded-2xl bg-linear-to-r from-[#ED6699] to-[#D94E85] text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(237,102,153,0.28)] transition-transform hover:brightness-105 active:scale-[0.98]"
        >
          {t('speaking.debate.start')}
        </button>
      </div>
    </ContentContainer>
  );
}
