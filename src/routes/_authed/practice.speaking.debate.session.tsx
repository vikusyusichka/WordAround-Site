/* Debate session — /practice/speaking/debate/session. Round progress + topic +
   chat bubbles with the AI opponent + hint + mic/text input + countdown → End →
   result (debate_feedback, 7 metric cards). */
import { useEffect, useRef } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { SpeakingInputBar } from '@/components/speaking/SpeakingInputBar';
import { ConversationResultView } from '@/components/speaking/ConversationResultView';
import { useDebate } from '@/hooks/useDebate';
import { findLanguage } from '@/lib/essayTypes';
import { ROUND_LABEL, ROUND_LEARNER_PROMPT, type DebateSide } from '@/lib/speakingDebate';
import { type ConversationLength } from '@/lib/speakingTypes';

const ACCENT = '#ED6699';

const isSide = (v: string): v is DebateSide => ['agree', 'disagree', 'surpriseMe'].includes(v);

export const Route = createFileRoute('/_authed/practice/speaking/debate/session')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { lang: string; level: string; length: ConversationLength; side: DebateSide } => ({
    lang: String(search.lang ?? 'english'),
    level: String(search.level ?? 'B1'),
    length: (['short', 'medium', 'long'].includes(String(search.length))
      ? String(search.length)
      : 'short') as ConversationLength,
    side: isSide(String(search.side)) ? (String(search.side) as DebateSide) : 'agree',
  }),
  component: DebateSessionScreen,
});

function DebateSessionScreen() {
  const { lang, level, length, side } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <DebateSession
      languageId={lang}
      level={level}
      length={length}
      side={side}
      onExit={() => void navigate({ to: '/practice/speaking' })}
    />
  );
}

function DebateSession({
  languageId,
  level,
  length,
  side,
  onExit,
}: {
  languageId: string;
  level: string;
  length: ConversationLength;
  side: DebateSide;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const debate = useDebate({ languageId, level, length, side });
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [debate.messages.length, debate.partialTranscript]);

  const mmss = (v: number) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
  const round = debate.rounds[debate.currentRoundIndex];

  if (debate.finished) {
    return (
      <ContentContainer fluid>
        <PageHeader title={t('speaking.debate.title')} subtitle={debate.session?.topic.title ?? ''} />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <button
            type="button"
            onClick={onExit}
            className="w-fit text-[13px] font-semibold text-[#B23A6E] hover:underline focus-visible:outline-none"
          >
            ← {t('nav.speaking')}
          </button>
          {debate.isGeneratingFeedback || !debate.feedback ? (
            <p className="py-16 text-center text-[15px] font-medium text-(--color-text-secondary)">
              {t('speaking.result.generating')}
            </p>
          ) : (
            <ConversationResultView
              feedback={debate.feedback}
              subtitle={debate.session?.topic.title ?? t('speaking.debate.title')}
              chips={[findLanguage(languageId).title, level, t('speaking.debate.title')]}
              accentColor={ACCENT}
              fallbackReason={debate.feedbackReason}
              onBack={onExit}
            />
          )}
        </div>
      </ContentContainer>
    );
  }

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('speaking.debate.title')}
        subtitle={debate.session?.topic.title ?? t('speaking.debate.subtitle')}
        actions={
          <span
            className={`rounded-2xl px-4 py-2 text-[14px] font-bold tabular-nums ${
              debate.remainingSeconds < 60
                ? 'bg-(--color-cs-red)/10 text-(--color-cs-red)'
                : 'bg-[#ED6699]/12 text-[#B23A6E]'
            }`}
          >
            {mmss(debate.remainingSeconds)}
          </span>
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="text-[13px] font-semibold text-[#B23A6E] hover:underline focus-visible:outline-none"
          >
            ← {t('nav.speaking')}
          </button>
          <button
            type="button"
            onClick={debate.endDebate}
            className="h-9 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[13px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03]"
          >
            {t('speaking.conversation.end')}
          </button>
        </div>

        {/* Round progress */}
        {debate.rounds.length > 0 && (
          <div className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-1.5">
              {debate.rounds.map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 flex-1 rounded-full"
                  style={{ background: i <= debate.currentRoundIndex ? ACCENT : `${ACCENT}26` }}
                />
              ))}
            </div>
            {round && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-bold text-[#B23A6E]">
                  {t('speaking.debate.roundOf', {
                    current: debate.currentRoundIndex + 1,
                    total: debate.rounds.length,
                    label: ROUND_LABEL[round.kind],
                  })}
                </span>
                <span className="text-[12px] font-medium text-(--color-text-secondary)">
                  {ROUND_LEARNER_PROMPT[round.kind]}
                </span>
              </div>
            )}
          </div>
        )}

        {debate.errorBanner && (
          <div className="flex items-center justify-between rounded-2xl bg-[#F59E0B]/10 px-4 py-2">
            <span className="text-[13px] font-medium text-[#B45309]">{debate.errorBanner}</span>
            <button type="button" onClick={debate.clearError} aria-label={t('speaking.conversation.dismiss')}>
              <Icon name="xmark" className="size-[14px] text-[#B45309]" />
            </button>
          </div>
        )}

        {debate.isGeneratingTopic && (
          <p className="rounded-2xl bg-white/70 px-4 py-8 text-center text-[15px] font-medium text-(--color-text-secondary) shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            {t('speaking.debate.preparing')}
          </p>
        )}

        {/* Chat */}
        <div className="flex flex-col gap-2.5">
          {debate.messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] font-medium ${
                m.role === 'ai'
                  ? 'self-start bg-white text-(--color-primary-blue-dark) shadow-[0_2px_6px_rgba(0,0,0,0.05)]'
                  : 'self-end bg-[#ED6699] text-white'
              }`}
            >
              {m.text}
            </div>
          ))}
          {debate.state === 'processing' && !debate.isGeneratingTopic && (
            <div className="self-start rounded-2xl bg-white px-4 py-2.5 text-[14px] font-medium text-(--color-muted-text) shadow-[0_2px_6px_rgba(0,0,0,0.05)]">
              …
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {debate.hint && (
          <div className="rounded-2xl border border-[#ED6699]/30 bg-[#ED6699]/5 px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#B23A6E]">
              {t('speaking.conversation.hint')}
            </span>
            <p className="text-[14px] font-medium text-(--color-primary-blue-dark)">{debate.hint}</p>
          </div>
        )}

        <div className="sticky bottom-4 flex flex-col gap-2">
          <SpeakingInputBar
            state={debate.state}
            partialTranscript={debate.partialTranscript}
            speechSupported={debate.speechSupported}
            accentColor={ACCENT}
            disabled={debate.isGeneratingTopic}
            onToggleMic={debate.toggleMic}
            onSendText={debate.sendMessage}
          />
          <button
            type="button"
            onClick={debate.requestHint}
            className="h-10 w-fit rounded-2xl border border-[#ED6699]/35 bg-white px-4 text-[13px] font-semibold text-[#B23A6E] transition-colors hover:bg-[#ED6699]/5"
          >
            {t('speaking.conversation.getHint')}
          </button>
        </div>
      </div>
    </ContentContainer>
  );
}
