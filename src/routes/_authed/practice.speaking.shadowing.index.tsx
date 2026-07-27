/* Shadowing — /practice/speaking/shadowing. Setup (language/level/category)
   then a phrase-by-phrase listen → record → play-yourself-back loop. */
import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { SetupSection } from '@/components/practice/SetupSection';
import { OptionPillGroup } from '@/components/practice/OptionPill';
import { StartButton } from '@/components/practice/StartButton';
import { PracticeRecorderBar } from '@/components/speaking/PracticeRecorderBar';
import { useShadowing } from '@/hooks/useShadowing';
import { ESSAY_LANGUAGES } from '@/lib/essayTypes';
import { SHADOWING_CATEGORIES, type ShadowingCategoryId } from '@/lib/shadowing';

export const Route = createFileRoute('/_authed/practice/speaking/shadowing/')({
  component: ShadowingScreen,
});

// Shadowing is the purple Speaking mode.
const ACCENT = '#8A5CE0';
const ACCENT_DARK = '#6438B8';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
const PHRASE_COUNT = 8;

function ShadowingScreen() {
  const [started, setStarted] = useState(false);
  const [languageId, setLanguageId] = useState('english');
  const [level, setLevel] = useState('B1');
  const [category, setCategory] = useState<ShadowingCategoryId>('daily');

  if (started) {
    return (
      <ShadowingSession
        languageId={languageId}
        level={level}
        category={category}
        onBackToSetup={() => setStarted(false)}
      />
    );
  }

  return (
    <ShadowingSetup
      languageId={languageId}
      level={level}
      category={category}
      onLanguage={setLanguageId}
      onLevel={setLevel}
      onCategory={setCategory}
      onStart={() => setStarted(true)}
    />
  );
}

function ShadowingSetup({
  languageId,
  level,
  category,
  onLanguage,
  onLevel,
  onCategory,
  onStart,
}: {
  languageId: string;
  level: string;
  category: ShadowingCategoryId;
  onLanguage: (v: string) => void;
  onLevel: (v: string) => void;
  onCategory: (v: ShadowingCategoryId) => void;
  onStart: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ContentContainer fluid>
      <PageHeader title={t('speaking.shadowing.title')} subtitle={t('speaking.shadowing.subtitle')} />

      <div className="flex w-full flex-col gap-6">
        <SetupSection title={t('reading.addText.language')} accentDark={ACCENT_DARK}>
          <OptionPillGroup
            options={ESSAY_LANGUAGES.map((l) => ({ id: l.id, label: l.title }))}
            value={languageId}
            onChange={onLanguage}
            accent={ACCENT}
            accentDark={ACCENT_DARK}
            columns={3}
          />
        </SetupSection>

        <SetupSection title={t('listening.fromText.level')} accentDark={ACCENT_DARK}>
          <OptionPillGroup
            options={LEVELS.map((l) => ({ id: l, label: l }))}
            value={level}
            onChange={onLevel}
            accent={ACCENT}
            accentDark={ACCENT_DARK}
          />
        </SetupSection>

        <SetupSection title={t('speaking.shadowing.category')} accentDark={ACCENT_DARK}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {SHADOWING_CATEGORIES.map((c) => {
              const selected = c.id === category;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onCategory(c.id)}
                  className="flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-all hover:brightness-[0.99] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  style={
                    selected
                      ? { background: ACCENT, borderColor: 'transparent' }
                      : {
                          background: `color-mix(in srgb, ${ACCENT} 8%, transparent)`,
                          borderColor: `color-mix(in srgb, ${ACCENT} 20%, transparent)`,
                        }
                  }
                >
                  <Icon
                    name={c.iconSystemName}
                    className="size-[16px]"
                    style={{ color: selected ? '#fff' : ACCENT }}
                  />
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: selected ? '#fff' : ACCENT_DARK }}
                  >
                    {c.title}
                  </span>
                </button>
              );
            })}
          </div>
        </SetupSection>

        <p
          className="flex items-start gap-2 rounded-2xl px-4 py-3 text-[13px] font-medium text-(--color-text-secondary)"
          style={{ background: `color-mix(in srgb, ${ACCENT} 8%, transparent)` }}
        >
          <Icon name="lightbulb" className="mt-0.5 size-[15px] shrink-0" style={{ color: ACCENT }} />
          {t('speaking.shadowing.howItWorks')}
        </p>

        <StartButton
          label={t('speaking.shadowing.start')}
          icon="waveform"
          accent={ACCENT}
          accentDark={ACCENT_DARK}
          onClick={onStart}
        />
      </div>
    </ContentContainer>
  );
}

function ShadowingSession({
  languageId,
  level,
  category,
  onBackToSetup,
}: {
  languageId: string;
  level: string;
  category: ShadowingCategoryId;
  onBackToSetup: () => void;
}) {
  const { t } = useTranslation();
  const s = useShadowing({ languageId, level, category, count: PHRASE_COUNT });

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('speaking.shadowing.title')}
        subtitle={t('speaking.shadowing.subtitle')}
        actions={
          s.total > 0 ? (
            <span className="rounded-2xl bg-[#8A5CE0]/12 px-4 py-2 text-[14px] font-bold text-[#6438B8] tabular-nums">
              {s.index + 1} / {s.total}
            </span>
          ) : undefined
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToSetup}
            className="text-[13px] font-semibold text-[#6438B8] hover:underline focus-visible:outline-none"
          >
            ← {t('speaking.shadowing.changeSettings')}
          </button>
          {s.completedCount > 0 && (
            <span className="text-[13px] font-semibold text-(--color-text-secondary)">
              {t('speaking.shadowing.done', { count: s.completedCount })}
            </span>
          )}
        </div>

        {s.isLoading && (
          <p className="rounded-2xl bg-white/70 px-4 py-10 text-center text-[15px] font-medium text-(--color-text-secondary) shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            {t('speaking.shadowing.loading')}
          </p>
        )}

        {!s.isLoading && s.error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-4 py-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <Icon name="exclamationmark.triangle.fill" className="size-[22px] text-[#B45309]" />
            <span className="text-[14px] font-medium text-(--color-primary-blue-dark)">{s.error}</span>
            <button
              type="button"
              onClick={s.reload}
              className="h-9 rounded-2xl px-4 text-[13px] font-semibold text-white"
              style={{ background: ACCENT }}
            >
              {t('speaking.picture.retry')}
            </button>
          </div>
        )}

        {!s.isLoading && !s.error && s.current && (
          <>
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
              <span className="w-fit rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: `${ACCENT}14`, color: ACCENT }}>
                {t('speaking.shadowing.phrase')}
              </span>
              <p className="text-[22px] font-bold leading-snug text-(--color-primary-blue-dark)">
                {s.current.text}
              </p>
              {s.current.translation && (
                <p className="text-[14px] font-medium text-(--color-text-secondary)">{s.current.translation}</p>
              )}
              {s.current.tip && (
                <p className="flex items-start gap-2 rounded-xl bg-[#8A5CE0]/8 px-3 py-2 text-[13px] font-medium text-(--color-text-secondary)">
                  <Icon name="lightbulb" className="mt-0.5 size-[14px] shrink-0" style={{ color: ACCENT }} />
                  {s.current.tip}
                </p>
              )}
            </div>

            {s.recorder.error && (
              <div className="flex items-center justify-between rounded-2xl bg-[#F59E0B]/10 px-4 py-2">
                <span className="text-[13px] font-medium text-[#B45309]">{s.recorder.error}</span>
                <button type="button" onClick={s.recorder.clearError} aria-label={t('speaking.conversation.dismiss')}>
                  <Icon name="xmark" className="size-[14px] text-[#B45309]" />
                </button>
              </div>
            )}

            <PracticeRecorderBar
              accentColor={ACCENT}
              isSpeaking={s.isSpeaking}
              isRecording={s.recorder.isRecording}
              hasRecording={s.recorder.hasRecording}
              recordingSupported={s.recorder.supported}
              onListen={s.listen}
              onToggleRecord={s.recorder.toggle}
              onPlayBack={s.recorder.play}
            />

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={s.previous}
                disabled={s.index === 0}
                className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[14px] font-semibold text-(--color-primary-blue-dark) transition-colors hover:bg-black/[0.03] disabled:opacity-40"
              >
                ← {t('speaking.shadowing.previous')}
              </button>
              <button
                type="button"
                onClick={s.markDone}
                className="h-11 flex-1 rounded-2xl text-[14px] font-semibold text-white shadow-[0_6px_12px_rgba(138,92,224,0.25)] transition-transform active:scale-[0.98]"
                style={{ background: ACCENT }}
              >
                {s.index === s.total - 1 ? t('speaking.shadowing.finish') : t('speaking.shadowing.nextPhrase')}
              </button>
            </div>
          </>
        )}

        {!s.isLoading && !s.error && s.total > 0 && s.completedCount === s.total && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-4 py-6 text-center shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <Icon name="checkmark.seal.fill" className="size-[26px]" style={{ color: ACCENT }} />
            <span className="text-[16px] font-bold text-(--color-primary-blue-dark)">
              {t('speaking.shadowing.allDone')}
            </span>
            <button
              type="button"
              onClick={s.reload}
              className="h-10 rounded-2xl px-4 text-[13px] font-semibold text-white"
              style={{ background: ACCENT }}
            >
              {t('speaking.shadowing.newSet')}
            </button>
          </div>
        )}
      </div>
    </ContentContainer>
  );
}
