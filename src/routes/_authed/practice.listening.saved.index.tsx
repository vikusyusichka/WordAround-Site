/* Saved Practice — /practice/listening/saved. Web port of SavedPracticeView:
   continue card for the most recent unfinished session, saved-session cards
   (Continue / Review / Delete), and inline result review. Resume:
   listen-from-text + import-audio reopen their session routes with ?sid=;
   import-video is review-only (iOS parity). */
import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { ListeningResultView } from '@/components/listening/ListeningResultView';
import { GrammarNotesEmptyState } from '@/components/grammar/GrammarNotesEmptyState';
import { findLanguage } from '@/lib/essayTypes';
import { deleteListeningSession, fetchListeningSessions } from '@/lib/listeningStore';
import { displayProgress, type ListeningPersistedSession } from '@/lib/listeningTypes';

export const Route = createFileRoute('/_authed/practice/listening/saved/')({
  component: SavedPracticeScreen,
});

const MODE_TITLE_KEY: Record<string, string> = {
  'listen-from-text': 'listening.menu.fromText.title',
  'import-audio': 'listening.menu.importAudio.title',
  'import-video': 'listening.menu.importVideo.title',
};

const chip =
  'rounded-full bg-(--color-goal-bg) px-2 py-0.5 text-[11px] font-bold text-(--color-text-secondary)';

function SavedPracticeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ListeningPersistedSession[] | null>(null);
  const [reviewSession, setReviewSession] = useState<ListeningPersistedSession | null>(null);

  const reload = () => void fetchListeningSessions().then(setSessions).catch(() => setSessions([]));
  useEffect(() => {
    reload();
  }, []);

  const continueSession = sessions?.find((s) => s.status !== 'completed' && !s.result);

  const openSession = (session: ListeningPersistedSession) => {
    if (session.result) {
      setReviewSession(session);
      return;
    }
    if (session.modeID === 'listen-from-text') {
      void navigate({ to: '/practice/listening/from-text/session', search: { sid: session.id } });
    } else if (session.modeID === 'import-audio') {
      void navigate({ to: '/practice/listening/import-audio', search: { sid: session.id } });
    } else {
      /* import-video sessions are not resumable (iOS parity). */
      setReviewSession(session);
    }
  };

  const handleDelete = (session: ListeningPersistedSession) => {
    if (window.confirm(t('listening.saved.deleteConfirm', { title: session.title }))) {
      void deleteListeningSession(session.id).then(reload);
    }
  };

  if (reviewSession?.result) {
    return (
      <ContentContainer fluid>
        <PageHeader title={reviewSession.title} subtitle={t('listening.saved.title')} />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <button
            type="button"
            onClick={() => setReviewSession(null)}
            className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
          >
            ← {t('listening.saved.title')}
          </button>
          <ListeningResultView
            result={reviewSession.result}
            subtitle={reviewSession.title}
            chips={[
              findLanguage(reviewSession.languageId).title,
              reviewSession.level,
              t(MODE_TITLE_KEY[reviewSession.modeID] ?? 'nav.listening'),
            ]}
            accentColor="#ED6699"
            onBack={() => setReviewSession(null)}
          />
        </div>
      </ContentContainer>
    );
  }

  return (
    <ContentContainer fluid>
      <PageHeader title={t('listening.saved.title')} subtitle={t('listening.saved.subtitle')} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={() => void navigate({ to: '/practice/listening' })}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {t('nav.listening')}
        </button>

        {sessions === null && (
          <p className="py-10 text-center text-[15px] font-medium text-(--color-text-secondary)">
            {t('reading.loading')}
          </p>
        )}

        {sessions !== null && sessions.length === 0 && (
          <GrammarNotesEmptyState
            title={t('listening.saved.emptyTitle')}
            body={t('listening.saved.emptyBody')}
          />
        )}

        {/* Continue card */}
        {continueSession && (
          <section className="flex flex-col gap-3 rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#ED6699]/12">
                <Icon name="headphones" className="size-[20px] text-[#ED6699]" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wide text-(--color-muted-text)">
                  {t('listening.saved.continueEyebrow')}
                </span>
                <h2 className="line-clamp-2 text-[16px] font-bold text-(--color-primary-blue-dark)">
                  {continueSession.title}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-[12px] font-semibold text-(--color-text-secondary)">
                {t('listening.saved.percentComplete', {
                  percent: Math.round(displayProgress(continueSession) * 100),
                })}
              </span>
              <div className="h-[6px] w-full overflow-hidden rounded-full bg-(--color-goal-bg)">
                <div
                  className="h-full rounded-full bg-[#ED6699]"
                  style={{ width: `${Math.max(displayProgress(continueSession) * 100, 4)}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => openSession(continueSession)}
              className="h-11 w-fit rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-6 text-[14px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)]"
            >
              {t('listening.saved.continue')} →
            </button>
          </section>
        )}

        {/* Saved cards */}
        {sessions !== null && sessions.length > 0 && (
          <section className="flex flex-col gap-3">
            {sessions.map((session) => {
              const isInProgress = session.status !== 'completed' && !session.result;
              return (
                <div
                  key={session.id}
                  className="group relative flex flex-col gap-2.5 rounded-2xl border border-white bg-white/95 p-4 shadow-[0_4px_10px_rgba(0,0,0,0.045)]"
                >
                  <span className="line-clamp-1 pr-8 text-[15px] font-bold text-(--color-primary-blue-dark)">
                    {session.title}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={chip}>
                      {t(MODE_TITLE_KEY[session.modeID] ?? 'nav.listening')}
                    </span>
                    <span className={chip}>{findLanguage(session.languageId).title}</span>
                    <span className={chip}>{session.level}</span>
                    <span className={chip}>
                      {session.result
                        ? `${session.result.comprehensionPercent}%`
                        : t(`listening.saved.status.${session.status}`)}
                    </span>
                  </div>
                  <span className="text-[12px] font-medium text-(--color-muted-text)">
                    {new Date(session.updatedAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => openSession(session)}
                    className="h-10 w-fit rounded-2xl border border-[#ED6699]/50 bg-white px-5 text-[13px] font-semibold text-[#9E2E6B] transition-colors hover:bg-[#ED6699]/5"
                  >
                    {isInProgress ? t('listening.saved.continue') : t('listening.saved.review')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(session)}
                    aria-label={t('listening.saved.delete')}
                    className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-(--color-cs-text-muted) opacity-0 transition-opacity hover:bg-black/[0.04] hover:text-(--color-cs-red) focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </ContentContainer>
  );
}
