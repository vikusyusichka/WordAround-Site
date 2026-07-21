/* Free Speaking session — /practice/speaking/free/session. Auto-generated topic
   card + live transcript chunks + mic/text input + countdown timer → End →
   result (speaking_feedback). */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { SpeakingInputBar } from '@/components/speaking/SpeakingInputBar';
import { ConversationResultView } from '@/components/speaking/ConversationResultView';
import { FreeSpeakingTopicCard } from '@/components/speaking/FreeSpeakingTopicCard';
import { useFreeSpeaking } from '@/hooks/useFreeSpeaking';
import { findLanguage } from '@/lib/essayTypes';
import { type ConversationLength } from '@/lib/speakingTypes';

const ACCENT = '#3CCF91';

export const Route = createFileRoute('/_authed/practice/speaking/free/session')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { lang: string; level: string; length: ConversationLength } => ({
    lang: String(search.lang ?? 'english'),
    level: String(search.level ?? 'B1'),
    length: (['short', 'medium', 'long'].includes(String(search.length))
      ? String(search.length)
      : 'short') as ConversationLength,
  }),
  component: FreeSpeakingSessionScreen,
});

function FreeSpeakingSessionScreen() {
  const { lang, level, length } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <FreeSpeakingSession
      languageId={lang}
      level={level}
      length={length}
      onExit={() => void navigate({ to: '/practice/speaking' })}
    />
  );
}

function FreeSpeakingSession({
  languageId,
  level,
  length,
  onExit,
}: {
  languageId: string;
  level: string;
  length: ConversationLength;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const fs = useFreeSpeaking({ languageId, level, length });

  const mmss = (v: number) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;

  if (fs.finished) {
    return (
      <ContentContainer fluid>
        <PageHeader title={t('speaking.free.title')} subtitle={fs.topic?.title ?? ''} />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <button
            type="button"
            onClick={onExit}
            className="w-fit text-[13px] font-semibold text-[#1F8F63] hover:underline focus-visible:outline-none"
          >
            ← {t('nav.speaking')}
          </button>
          {fs.isGeneratingFeedback || !fs.feedback ? (
            <p className="py-16 text-center text-[15px] font-medium text-(--color-text-secondary)">
              {t('speaking.result.generating')}
            </p>
          ) : (
            <ConversationResultView
              feedback={fs.feedback}
              subtitle={fs.topic?.title ?? t('speaking.free.title')}
              chips={[findLanguage(languageId).title, level, t('speaking.free.title')]}
              accentColor={ACCENT}
              fallbackReason={fs.feedbackReason}
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
        title={t('speaking.free.title')}
        subtitle={t('speaking.free.subtitle')}
        actions={
          <span
            className={`rounded-2xl px-4 py-2 text-[14px] font-bold tabular-nums ${
              fs.remainingSeconds < 60
                ? 'bg-(--color-cs-red)/10 text-(--color-cs-red)'
                : 'bg-[#3CCF91]/12 text-[#1F8F63]'
            }`}
          >
            {mmss(fs.remainingSeconds)}
          </span>
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="text-[13px] font-semibold text-[#1F8F63] hover:underline focus-visible:outline-none"
          >
            ← {t('nav.speaking')}
          </button>
          <button
            type="button"
            onClick={fs.endSession}
            className="h-9 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[13px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03]"
          >
            {t('speaking.conversation.end')}
          </button>
        </div>

        <FreeSpeakingTopicCard
          title={fs.isGeneratingTopic ? t('speaking.free.generating') : fs.topic?.title ?? t('speaking.free.title')}
          description={fs.isGeneratingTopic ? t('speaking.free.generatingHint') : fs.topic?.description ?? ''}
          chips={fs.topic?.category ? [level, fs.topic.category] : [level]}
          accentColor={ACCENT}
          loading={fs.isGeneratingTopic}
        />

        {fs.usedFallbackTopic && (
          <p className="rounded-2xl bg-[#F59E0B]/10 px-4 py-2 text-[13px] font-medium text-[#B45309]">
            {t('speaking.free.fallbackTopic')}
          </p>
        )}

        {fs.errorBanner && (
          <div className="flex items-center justify-between rounded-2xl bg-[#F59E0B]/10 px-4 py-2">
            <span className="text-[13px] font-medium text-[#B45309]">{fs.errorBanner}</span>
            <button type="button" onClick={fs.clearError} aria-label={t('speaking.conversation.dismiss')}>
              <Icon name="xmark" className="size-[14px] text-[#B45309]" />
            </button>
          </div>
        )}

        {/* Transcript */}
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
            {t('speaking.free.transcript')}
          </span>
          {fs.transcript.chunks.length === 0 && !fs.partialTranscript ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/70 px-4 py-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
              <span className="grid size-12 place-items-center rounded-full bg-[#3CCF91]/12">
                <Icon name="waveform" className="size-[22px] text-[#3CCF91]" />
              </span>
              <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">
                {t('speaking.free.startSpeaking')}
              </span>
              <span className="text-[13px] font-medium text-(--color-text-secondary)">
                {t('speaking.free.transcriptHint')}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {fs.transcript.chunks.map((chunk, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white px-4 py-2.5 text-[14px] font-medium text-(--color-primary-blue-dark) shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
                >
                  {chunk}
                </div>
              ))}
              {fs.partialTranscript && (
                <div className="rounded-2xl border border-[#3CCF91]/30 bg-[#3CCF91]/5 px-4 py-2.5 text-[14px] font-medium text-(--color-text-secondary)">
                  {fs.partialTranscript}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-4">
          <SpeakingInputBar
            state={fs.state}
            partialTranscript={fs.partialTranscript}
            speechSupported={fs.speechSupported}
            accentColor={ACCENT}
            onToggleMic={fs.toggleMic}
            onSendText={fs.sendText}
          />
        </div>
      </div>
    </ContentContainer>
  );
}
