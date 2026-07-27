/* Pronunciation Trainer — /practice/speaking/pronunciation. Focus-sound drills:
   listen → record → play yourself back. Automatic scoring needs Azure on the
   Worker; when that is unavailable the screen says so and stays fully usable. */
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
import { usePronunciationTrainer } from '@/hooks/usePronunciationTrainer';
import { ESSAY_LANGUAGES } from '@/lib/essayTypes';
import {
  ITEM_TYPE_ICON,
  ITEM_TYPE_LABEL,
  PRONUNCIATION_DIFFICULTIES,
  PRONUNCIATION_FOCUSES,
  type PronunciationDifficulty,
  type PronunciationFocus,
} from '@/lib/pronunciationTrainer';

export const Route = createFileRoute('/_authed/practice/speaking/pronunciation/')({
  component: PronunciationScreen,
});

// Pronunciation Trainer is the cyan Speaking mode.
const ACCENT = '#2EB8CC';
const ACCENT_DARK = '#1B7C8C';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
const ITEM_COUNT = 8;

function PronunciationScreen() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [languageId, setLanguageId] = useState('english');
  const [level, setLevel] = useState('B1');
  const [focus, setFocus] = useState<PronunciationFocus>('mixed');
  const [difficulty, setDifficulty] = useState<PronunciationDifficulty>('balanced');

  if (started) {
    return (
      <PronunciationSession
        languageId={languageId}
        level={level}
        focus={focus}
        difficulty={difficulty}
        onBackToSetup={() => setStarted(false)}
      />
    );
  }

  return (
    <ContentContainer fluid>
      <PageHeader title={t('speaking.pronunciation.title')} subtitle={t('speaking.pronunciation.subtitle')} />
      <PronunciationSetup
        languageId={languageId}
        level={level}
        focus={focus}
        difficulty={difficulty}
        onLanguage={setLanguageId}
        onLevel={setLevel}
        onFocus={setFocus}
        onDifficulty={setDifficulty}
        onStart={() => setStarted(true)}
      />
    </ContentContainer>
  );
}

function PronunciationSetup({
  languageId,
  level,
  focus,
  difficulty,
  onLanguage,
  onLevel,
  onFocus,
  onDifficulty,
  onStart,
}: {
  languageId: string;
  level: string;
  focus: PronunciationFocus;
  difficulty: PronunciationDifficulty;
  onLanguage: (v: string) => void;
  onLevel: (v: string) => void;
  onFocus: (v: PronunciationFocus) => void;
  onDifficulty: (v: PronunciationDifficulty) => void;
  onStart: () => void;
}) {
  const { t } = useTranslation();

  return (
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

      <SetupSection title={t('speaking.pronunciation.focus')} accentDark={ACCENT_DARK}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {PRONUNCIATION_FOCUSES.map((f) => {
            const selected = f.id === focus;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onFocus(f.id)}
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
                  name={f.iconSystemName}
                  className="size-[16px]"
                  style={{ color: selected ? '#fff' : ACCENT }}
                />
                <span
                  className="text-[13px] font-bold"
                  style={{ color: selected ? '#fff' : ACCENT_DARK }}
                >
                  {f.title}
                </span>
              </button>
            );
          })}
        </div>
      </SetupSection>

      <SetupSection title={t('speaking.pronunciation.difficulty')} accentDark={ACCENT_DARK}>
        <OptionPillGroup
          options={PRONUNCIATION_DIFFICULTIES.map((d) => ({
            id: d,
            label: t(`speaking.pronunciation.level.${d}`),
          }))}
          value={difficulty}
          onChange={onDifficulty}
          accent={ACCENT}
          accentDark={ACCENT_DARK}
        />
      </SetupSection>

      <StartButton
        label={t('speaking.pronunciation.start')}
        icon="waveform"
        accent={ACCENT}
        accentDark={ACCENT_DARK}
        onClick={onStart}
      />
    </div>
  );
}

function PronunciationSession({
  languageId,
  level,
  focus,
  difficulty,
  onBackToSetup,
}: {
  languageId: string;
  level: string;
  focus: PronunciationFocus;
  difficulty: PronunciationDifficulty;
  onBackToSetup: () => void;
}) {
  const { t } = useTranslation();
  const p = usePronunciationTrainer({ languageId, level, focus, difficulty, count: ITEM_COUNT });

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('speaking.pronunciation.title')}
        subtitle={t('speaking.pronunciation.subtitle')}
        actions={
          p.total > 0 ? (
            <span className="rounded-2xl bg-[#2EB8CC]/12 px-4 py-2 text-[14px] font-bold text-[#1B7C8C] tabular-nums">
              {p.index + 1} / {p.total}
            </span>
          ) : undefined
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <button
          type="button"
          onClick={onBackToSetup}
          className="w-fit text-[13px] font-semibold text-[#1B7C8C] hover:underline focus-visible:outline-none"
        >
          ← {t('speaking.shadowing.changeSettings')}
        </button>

        {/* Azure-dependent scoring: say plainly when it is unavailable. */}
        {p.scoringAvailable === false && (
          <p className="flex items-start gap-2 rounded-2xl bg-[#F59E0B]/10 px-4 py-3 text-[13px] font-medium text-[#B45309]">
            <Icon name="exclamationmark.circle.fill" className="mt-0.5 size-[15px] shrink-0" />
            {t('speaking.pronunciation.scoringUnavailable')}
          </p>
        )}

        {p.isLoading && (
          <p className="rounded-2xl bg-white/70 px-4 py-10 text-center text-[15px] font-medium text-(--color-text-secondary) shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            {t('speaking.pronunciation.loading')}
          </p>
        )}

        {!p.isLoading && p.error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-4 py-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <Icon name="exclamationmark.triangle.fill" className="size-[22px] text-[#B45309]" />
            <span className="text-[14px] font-medium text-(--color-primary-blue-dark)">{p.error}</span>
            <button
              type="button"
              onClick={p.reload}
              className="h-9 rounded-2xl px-4 text-[13px] font-semibold text-white"
              style={{ background: ACCENT }}
            >
              {t('speaking.picture.retry')}
            </button>
          </div>
        )}

        {!p.isLoading && !p.error && p.current && (
          <>
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: `${ACCENT}14`, color: ACCENT }}
                >
                  <Icon name={ITEM_TYPE_ICON[p.current.type]} className="size-[12px]" />
                  {ITEM_TYPE_LABEL[p.current.type]}
                </span>
                {p.current.focusSound && (
                  <span className="rounded-full bg-(--color-goal-bg) px-2.5 py-1 text-[11px] font-bold text-(--color-text-secondary)">
                    {t('speaking.pronunciation.sound')}: {p.current.focusSound}
                  </span>
                )}
              </div>

              <p className="text-[26px] font-bold leading-snug text-(--color-primary-blue-dark)">
                {p.current.text}
              </p>
              {p.current.translation && (
                <p className="text-[14px] font-medium text-(--color-text-secondary)">{p.current.translation}</p>
              )}
              {p.current.tip && (
                <p className="flex items-start gap-2 rounded-xl bg-[#2EB8CC]/8 px-3 py-2 text-[13px] font-medium text-(--color-text-secondary)">
                  <Icon name="lightbulb" className="mt-0.5 size-[14px] shrink-0" style={{ color: ACCENT }} />
                  {p.current.tip}
                </p>
              )}
              {p.current.example && (
                <button
                  type="button"
                  onClick={() => p.listen(p.current?.example ?? undefined)}
                  className="flex items-start gap-2 rounded-xl border border-(--color-auth-field-border) px-3 py-2 text-left text-[13px] font-medium text-(--color-text-secondary) transition-colors hover:bg-black/[0.02]"
                >
                  <Icon name="play.fill" className="mt-0.5 size-[12px] shrink-0" style={{ color: ACCENT }} />
                  {p.current.example}
                </button>
              )}
            </div>

            {p.recorder.error && (
              <div className="flex items-center justify-between rounded-2xl bg-[#F59E0B]/10 px-4 py-2">
                <span className="text-[13px] font-medium text-[#B45309]">{p.recorder.error}</span>
                <button type="button" onClick={p.recorder.clearError} aria-label={t('speaking.conversation.dismiss')}>
                  <Icon name="xmark" className="size-[14px] text-[#B45309]" />
                </button>
              </div>
            )}

            <PracticeRecorderBar
              accentColor={ACCENT}
              isSpeaking={p.isSpeaking}
              isRecording={p.recorder.isRecording}
              hasRecording={p.recorder.hasRecording}
              recordingSupported={p.recorder.supported}
              onListen={() => p.listen()}
              onToggleRecord={p.recorder.toggle}
              onPlayBack={p.recorder.play}
            />

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={p.previous}
                disabled={p.index === 0}
                className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[14px] font-semibold text-(--color-primary-blue-dark) transition-colors hover:bg-black/[0.03] disabled:opacity-40"
              >
                ← {t('speaking.shadowing.previous')}
              </button>
              <button
                type="button"
                onClick={p.markPractised}
                className="h-11 flex-1 rounded-2xl text-[14px] font-semibold text-white shadow-[0_6px_12px_rgba(46,184,204,0.25)] transition-transform active:scale-[0.98]"
                style={{ background: ACCENT }}
              >
                {p.index === p.total - 1 ? t('speaking.shadowing.finish') : t('speaking.shadowing.nextPhrase')}
              </button>
            </div>
          </>
        )}
      </div>
    </ContentContainer>
  );
}
