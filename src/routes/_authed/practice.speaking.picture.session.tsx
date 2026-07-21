/* Describe Picture session — /practice/speaking/picture/session. Random photo +
   attribution + prompt chips, transcript chunks, mic/text input, countdown →
   End → result (speaking_feedback). "New photo" swaps the image and resets. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { SpeakingInputBar } from '@/components/speaking/SpeakingInputBar';
import { ConversationResultView } from '@/components/speaking/ConversationResultView';
import { DescribePictureImageCard } from '@/components/speaking/DescribePictureImageCard';
import { useDescribePicture } from '@/hooks/useDescribePicture';
import { findLanguage } from '@/lib/essayTypes';
import { type ConversationLength } from '@/lib/speakingTypes';

const ACCENT = '#F7A310';

export const Route = createFileRoute('/_authed/practice/speaking/picture/session')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { lang: string; level: string; length: ConversationLength } => ({
    lang: String(search.lang ?? 'english'),
    level: String(search.level ?? 'B1'),
    length: (['short', 'medium', 'long'].includes(String(search.length))
      ? String(search.length)
      : 'short') as ConversationLength,
  }),
  component: DescribePictureSessionScreen,
});

function DescribePictureSessionScreen() {
  const { lang, level, length } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <DescribePictureSession
      languageId={lang}
      level={level}
      length={length}
      onExit={() => void navigate({ to: '/practice/speaking' })}
    />
  );
}

function DescribePictureSession({
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
  const dp = useDescribePicture({ languageId, level, length });

  const mmss = (v: number) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;

  if (dp.finished) {
    return (
      <ContentContainer fluid>
        <PageHeader title={t('speaking.picture.title')} subtitle={t('speaking.picture.subtitle')} />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <button
            type="button"
            onClick={onExit}
            className="w-fit text-[13px] font-semibold text-[#A66A05] hover:underline focus-visible:outline-none"
          >
            ← {t('nav.speaking')}
          </button>
          {dp.isGeneratingFeedback || !dp.feedback ? (
            <p className="py-16 text-center text-[15px] font-medium text-(--color-text-secondary)">
              {t('speaking.result.generating')}
            </p>
          ) : (
            <ConversationResultView
              feedback={dp.feedback}
              subtitle={t('speaking.picture.title')}
              chips={[findLanguage(languageId).title, level, t('speaking.picture.title')]}
              accentColor={ACCENT}
              fallbackReason={dp.feedbackReason}
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
        title={t('speaking.picture.title')}
        subtitle={t('speaking.picture.subtitle')}
        actions={
          <span
            className={`rounded-2xl px-4 py-2 text-[14px] font-bold tabular-nums ${
              dp.remainingSeconds < 60
                ? 'bg-(--color-cs-red)/10 text-(--color-cs-red)'
                : 'bg-[#F7A310]/12 text-[#A66A05]'
            }`}
          >
            {mmss(dp.remainingSeconds)}
          </span>
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="text-[13px] font-semibold text-[#A66A05] hover:underline focus-visible:outline-none"
          >
            ← {t('nav.speaking')}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={dp.newImage}
              disabled={dp.isLoadingImage}
              className="flex h-9 items-center gap-1.5 rounded-2xl border border-[#F7A310]/40 bg-white px-4 text-[13px] font-semibold text-[#A66A05] transition-colors hover:bg-[#F7A310]/8 disabled:opacity-50"
            >
              <Icon name="arrow.clockwise" className="size-[13px]" />
              {t('speaking.picture.newPhoto')}
            </button>
            <button
              type="button"
              onClick={dp.endSession}
              className="h-9 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[13px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03]"
            >
              {t('speaking.conversation.end')}
            </button>
          </div>
        </div>

        <DescribePictureImageCard
          image={dp.image}
          isLoading={dp.isLoadingImage}
          error={dp.imageError}
          accentColor={ACCENT}
          onRetry={dp.retryImage}
        />

        {dp.errorBanner && (
          <div className="flex items-center justify-between rounded-2xl bg-[#F59E0B]/10 px-4 py-2">
            <span className="text-[13px] font-medium text-[#B45309]">{dp.errorBanner}</span>
            <button type="button" onClick={dp.clearError} aria-label={t('speaking.conversation.dismiss')}>
              <Icon name="xmark" className="size-[14px] text-[#B45309]" />
            </button>
          </div>
        )}

        {/* Transcript */}
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
            {t('speaking.free.transcript')}
          </span>
          {dp.transcript.chunks.length === 0 && !dp.partialTranscript ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/70 px-4 py-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
              <span className="grid size-12 place-items-center rounded-full bg-[#F7A310]/12">
                <Icon name="waveform" className="size-[22px] text-[#F7A310]" />
              </span>
              <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">
                {t('speaking.picture.startDescribing')}
              </span>
              <span className="text-[13px] font-medium text-(--color-text-secondary)">
                {t('speaking.free.transcriptHint')}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {dp.transcript.chunks.map((chunk, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white px-4 py-2.5 text-[14px] font-medium text-(--color-primary-blue-dark) shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
                >
                  {chunk}
                </div>
              ))}
              {dp.partialTranscript && (
                <div className="rounded-2xl border border-[#F7A310]/30 bg-[#F7A310]/5 px-4 py-2.5 text-[14px] font-medium text-(--color-text-secondary)">
                  {dp.partialTranscript}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-4">
          <SpeakingInputBar
            state={dp.state}
            partialTranscript={dp.partialTranscript}
            speechSupported={dp.speechSupported}
            accentColor={ACCENT}
            onToggleMic={dp.toggleMic}
            onSendText={dp.sendText}
          />
        </div>
      </div>
    </ContentContainer>
  );
}
