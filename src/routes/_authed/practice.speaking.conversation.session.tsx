/* AI Conversation session — /practice/speaking/conversation/session. Chat
   bubbles + mic/text input + hint + countdown timer → End → result. */
import { useEffect, useRef } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { SpeakingInputBar } from '@/components/speaking/SpeakingInputBar';
import { ConversationResultView } from '@/components/speaking/ConversationResultView';
import { useSpeakingConversation } from '@/hooks/useSpeakingConversation';
import { findLanguage } from '@/lib/essayTypes';
import { contextTitle, type ConversationLength, type SpeakingContext } from '@/lib/speakingTypes';

const ACCENT = '#2B5CFA';

export const Route = createFileRoute('/_authed/practice/speaking/conversation/session')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { lang: string; level: string; length: ConversationLength; ctx: string } => ({
    lang: String(search.lang ?? 'english'),
    level: String(search.level ?? 'B1'),
    length: (['short', 'medium', 'long'].includes(String(search.length))
      ? String(search.length)
      : 'short') as ConversationLength,
    ctx: String(search.ctx ?? ''),
  }),
  component: ConversationSessionScreen,
});

function ConversationSessionScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang, level, length, ctx } = Route.useSearch();

  let context: SpeakingContext | null = null;
  try {
    context = ctx ? (JSON.parse(ctx) as SpeakingContext) : null;
  } catch {
    context = null;
  }

  if (!context) {
    return (
      <ContentContainer fluid>
        <p role="alert" className="py-16 text-center text-[15px] font-medium text-(--color-cs-red)">
          {t('speaking.conversation.startError')}
        </p>
      </ContentContainer>
    );
  }

  return (
    <ConversationSession
      languageId={lang}
      level={level}
      length={length}
      context={context}
      onExit={() => void navigate({ to: '/practice/speaking' })}
    />
  );
}

function ConversationSession({
  languageId,
  level,
  length,
  context,
  onExit,
}: {
  languageId: string;
  level: string;
  length: ConversationLength;
  context: SpeakingContext;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const convo = useSpeakingConversation({ languageId, level, length, context });
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convo.messages.length, convo.partialTranscript]);

  const mmss = (v: number) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;

  if (convo.finished) {
    return (
      <ContentContainer fluid>
        <PageHeader title={contextTitle(context)} subtitle={t('speaking.conversation.title')} />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <button
            type="button"
            onClick={onExit}
            className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
          >
            ← {t('nav.speaking')}
          </button>
          {convo.isGeneratingFeedback || !convo.feedback ? (
            <p className="py-16 text-center text-[15px] font-medium text-(--color-text-secondary)">
              {t('speaking.result.generating')}
            </p>
          ) : (
            <ConversationResultView
              feedback={convo.feedback}
              subtitle={contextTitle(context)}
              chips={[findLanguage(languageId).title, level, t('speaking.conversation.title')]}
              accentColor={ACCENT}
              fallbackReason={convo.feedbackReason}
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
        title={contextTitle(context)}
        subtitle={t('speaking.conversation.title')}
        actions={
          <span
            className={`rounded-2xl px-4 py-2 text-[14px] font-bold tabular-nums ${
              convo.remainingSeconds < 60
                ? 'bg-(--color-cs-red)/10 text-(--color-cs-red)'
                : 'bg-(--color-goal-bg) text-(--color-primary-blue-dark)'
            }`}
          >
            {mmss(convo.remainingSeconds)}
          </span>
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
          >
            ← {t('nav.speaking')}
          </button>
          <button
            type="button"
            onClick={convo.endConversation}
            className="h-9 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[13px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03]"
          >
            {t('speaking.conversation.end')}
          </button>
        </div>

        {convo.errorBanner && (
          <div className="flex items-center justify-between rounded-2xl bg-[#F59E0B]/10 px-4 py-2">
            <span className="text-[13px] font-medium text-[#B45309]">{convo.errorBanner}</span>
            <button type="button" onClick={convo.clearError} aria-label={t('speaking.conversation.dismiss')}>
              <Icon name="xmark" className="size-[14px] text-[#B45309]" />
            </button>
          </div>
        )}

        {/* Chat */}
        <div className="flex flex-col gap-2.5">
          {convo.messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] font-medium ${
                m.role === 'ai'
                  ? 'self-start bg-white text-(--color-primary-blue-dark) shadow-[0_2px_6px_rgba(0,0,0,0.05)]'
                  : 'self-end bg-[#2B5CFA] text-white'
              }`}
            >
              {m.text}
            </div>
          ))}
          {convo.state === 'processing' && (
            <div className="self-start rounded-2xl bg-white px-4 py-2.5 text-[14px] font-medium text-(--color-muted-text) shadow-[0_2px_6px_rgba(0,0,0,0.05)]">
              …
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Hint */}
        {convo.hint && (
          <div className="rounded-2xl border border-[#2B5CFA]/30 bg-[#2B5CFA]/5 px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#2B5CFA]">
              {t('speaking.conversation.hint')}
            </span>
            <p className="text-[14px] font-medium text-(--color-primary-blue-dark)">{convo.hint}</p>
          </div>
        )}

        <div className="sticky bottom-4 flex flex-col gap-2">
          <SpeakingInputBar
            state={convo.state}
            partialTranscript={convo.partialTranscript}
            speechSupported={convo.speechSupported}
            accentColor={ACCENT}
            onToggleMic={convo.toggleMic}
            onSendText={convo.sendMessage}
          />
          <button
            type="button"
            onClick={() => void convo.requestHint()}
            disabled={convo.isRequestingHint}
            className="h-10 w-fit rounded-2xl border border-[#2B5CFA]/35 bg-white px-4 text-[13px] font-semibold text-[#2B5CFA] transition-colors hover:bg-[#2B5CFA]/5 disabled:opacity-60"
          >
            {convo.isRequestingHint ? t('speaking.conversation.hintLoading') : t('speaking.conversation.getHint')}
          </button>
        </div>
      </div>
    </ContentContainer>
  );
}
