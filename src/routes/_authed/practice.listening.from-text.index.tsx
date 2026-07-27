/* Listen from Text setup — /practice/listening/from-text. Web port of
   ListenFromTextSetupView: language/level, voice settings, question
   settings, title + text with iOS validation (40-5000 chars, 40 words for
   questions). Start creates a DRAFT session in the local store and opens the
   session route with ?sid=. */
import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { SetupSection } from '@/components/practice/SetupSection';
import { OptionPill, OptionPillGroup } from '@/components/practice/OptionPill';
import { StartButton } from '@/components/practice/StartButton';
import { ESSAY_LANGUAGES } from '@/lib/essayTypes';
import { saveListeningSession } from '@/lib/listeningStore';
import {
  LISTENING_MAX_CHARACTERS,
  LISTENING_MIN_CHARACTERS,
  LISTENING_MIN_WORDS_FOR_QUESTIONS,
  LISTENING_QUESTION_COUNTS,
  LISTENING_QUESTION_TYPES,
  LISTENING_VOICE_SPEEDS,
  LISTENING_VOICE_TYPES,
  listeningEstimatedMinutes,
  VOICE_SPEED_META,
  type ListeningPersistedSession,
  type ListeningQuestionType,
  type ListeningVoiceSpeed,
  type ListeningVoiceType,
} from '@/lib/listeningTypes';

export const Route = createFileRoute('/_authed/practice/listening/from-text/')({
  component: ListenFromTextSetup,
});

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

// Listen-from-Text mode accent (ListeningTheme.listenFromTextAccent / Dark).
const ACCENT = '#3394D1';
const ACCENT_DARK = '#1F6BA3';

const subLabel = 'text-[13px] font-bold';

function ListenFromTextSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [languageId, setLanguageId] = useState('english');
  const [level, setLevel] = useState('B1');
  const [voiceSpeed, setVoiceSpeed] = useState<ListeningVoiceSpeed>('normal');
  const [voiceType, setVoiceType] = useState<ListeningVoiceType>('default');
  const [showText, setShowText] = useState(false);
  const [addQuestions, setAddQuestions] = useState(true);
  const [questionCount, setQuestionCount] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<ListeningQuestionType[]>([
    ...LISTENING_QUESTION_TYPES,
  ]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const wordCount = useMemo(
    () => text.split(/\s+/).filter((w) => w.length > 0).length,
    [text],
  );

  const toggleType = (type: ListeningQuestionType) => {
    setQuestionTypes((prev) => {
      if (prev.includes(type)) {
        return prev.length > 1 ? prev.filter((qt) => qt !== type) : prev;
      }
      return [...prev, type];
    });
  };

  const startListening = async () => {
    const trimmed = text.trim();
    /* iOS validation order + messages. */
    if (trimmed.length === 0) return setValidation(t('listening.fromText.validation.empty'));
    if (trimmed.length < LISTENING_MIN_CHARACTERS) {
      return setValidation(t('listening.fromText.validation.tooShort'));
    }
    if (trimmed.length > LISTENING_MAX_CHARACTERS) {
      return setValidation(t('listening.fromText.validation.tooLong'));
    }
    if (addQuestions && wordCount < LISTENING_MIN_WORDS_FOR_QUESTIONS) {
      return setValidation(t('listening.fromText.validation.tooFewWords'));
    }
    setValidation(null);
    setIsStarting(true);

    const estimatedMinutes = listeningEstimatedMinutes(wordCount);
    const now = Date.now();
    const session: ListeningPersistedSession = {
      id: crypto.randomUUID(),
      modeID: 'listen-from-text',
      title: title.trim() || t('listening.fromText.defaultTitle'),
      languageId,
      level,
      createdAt: now,
      updatedAt: now,
      durationSeconds: Math.max(estimatedMinutes * 60, 8),
      elapsedSeconds: 0,
      progress: 0,
      playbackPosition: 0,
      text: trimmed,
      voiceSpeed,
      voiceType,
      showTextWhileListening: showText,
      addQuestions,
      questions: [],
      selectedAnswers: {},
      status: 'draft',
    };
    /* Question count/types travel via the draft — the session route
       generates questions on first open. */
    session.questions = [];
    await saveListeningSession(session);
    sessionStorage.setItem(
      `wa.listening.setup.${session.id}`,
      JSON.stringify({ questionCount, questionTypes }),
    );
    setIsStarting(false);
    void navigate({
      to: '/practice/listening/from-text/session',
      search: { sid: session.id },
    });
  };

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('listening.fromText.title')}
        subtitle={t('listening.fromText.subtitle')}
      />

      <div className="flex w-full flex-col gap-6">
        <SetupSection title={t('reading.addText.language')} accentDark={ACCENT_DARK}>
          <OptionPillGroup
            options={ESSAY_LANGUAGES.map((l) => ({ id: l.id, label: l.title }))}
            value={languageId}
            onChange={setLanguageId}
            accent={ACCENT}
            accentDark={ACCENT_DARK}
            columns={3}
          />
        </SetupSection>

        <SetupSection title={t('listening.fromText.level')} accentDark={ACCENT_DARK}>
          <OptionPillGroup
            options={LEVELS.map((l) => ({ id: l, label: l }))}
            value={level}
            onChange={setLevel}
            accent={ACCENT}
            accentDark={ACCENT_DARK}
          />
        </SetupSection>

        <SetupSection title={t('listening.fromText.voiceSettings')} accentDark={ACCENT_DARK}>
          <span className={subLabel} style={{ color: ACCENT_DARK }}>
            {t('listening.fromText.voiceSpeed')}
          </span>
          <OptionPillGroup
            options={LISTENING_VOICE_SPEEDS.map((speed) => ({ id: speed, label: VOICE_SPEED_META[speed].label }))}
            value={voiceSpeed}
            onChange={setVoiceSpeed}
            accent={ACCENT}
            accentDark={ACCENT_DARK}
          />
          <span className={`mt-1 ${subLabel}`} style={{ color: ACCENT_DARK }}>
            {t('listening.fromText.voiceType')}
          </span>
          <OptionPillGroup
            options={LISTENING_VOICE_TYPES.map((type) => ({ id: type, label: t(`listening.fromText.voice.${type}`) }))}
            value={voiceType}
            onChange={setVoiceType}
            accent={ACCENT}
            accentDark={ACCENT_DARK}
          />
          <label className="mt-1 flex cursor-pointer items-center justify-between">
            <span className="text-[14px] font-semibold text-(--color-primary-blue-dark)">
              {t('listening.fromText.showText')}
            </span>
            <input
              type="checkbox"
              checked={showText}
              onChange={(e) => setShowText(e.target.checked)}
              className="size-5"
              style={{ accentColor: ACCENT }}
            />
          </label>
        </SetupSection>

        <SetupSection title={t('listening.fromText.questions')} accentDark={ACCENT_DARK}>
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-[14px] font-semibold text-(--color-primary-blue-dark)">
              {t('listening.fromText.addQuestions')}
            </span>
            <input
              type="checkbox"
              checked={addQuestions}
              onChange={(e) => setAddQuestions(e.target.checked)}
              className="size-5"
              style={{ accentColor: ACCENT }}
            />
          </label>
          {addQuestions && (
            <>
              <span className={`mt-1 ${subLabel}`} style={{ color: ACCENT_DARK }}>
                {t('listening.fromText.questionCount')}
              </span>
              <OptionPillGroup
                options={LISTENING_QUESTION_COUNTS.map((count) => ({ id: String(count), label: String(count) }))}
                value={String(questionCount)}
                onChange={(v) => setQuestionCount(Number(v))}
                accent={ACCENT}
                accentDark={ACCENT_DARK}
              />
              <span className={`mt-1 ${subLabel}`} style={{ color: ACCENT_DARK }}>
                {t('listening.fromText.questionTypes')}
              </span>
              <div className="flex flex-wrap gap-2.5">
                {LISTENING_QUESTION_TYPES.map((type) => (
                  <div key={type}>
                    <OptionPill
                      label={t(`listening.questionType.${type}`)}
                      selected={questionTypes.includes(type)}
                      accent={ACCENT}
                      accentDark={ACCENT_DARK}
                      onClick={() => toggleType(type)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </SetupSection>

        <SetupSection title={t('listening.fromText.textInput')} accentDark={ACCENT_DARK}>
          <span className={subLabel} style={{ color: ACCENT_DARK }}>
            {t('listening.fromText.optionalTitle')}
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('listening.fromText.titlePlaceholder')}
            className="w-full rounded-2xl border bg-white px-4 py-3 text-[15px] font-semibold text-(--color-primary-blue-dark) outline-none transition-colors focus-visible:border-(--color-home-brand)"
            style={{ borderColor: `color-mix(in srgb, ${ACCENT} 24%, transparent)` }}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('listening.fromText.textPlaceholder')}
            rows={7}
            className="mt-1 w-full resize-y rounded-2xl border bg-white px-4 py-3 text-[15px] font-medium leading-relaxed text-(--color-primary-blue-dark) outline-none transition-colors focus-visible:border-(--color-home-brand)"
            style={{ borderColor: `color-mix(in srgb, ${ACCENT} 24%, transparent)` }}
          />
          <span className="text-[12px] font-medium text-(--color-muted-text)">
            {t('listening.fromText.recommended')} · {wordCount} {t('listening.fromText.words')}
          </span>
        </SetupSection>

        {validation && (
          <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
            {validation}
          </p>
        )}

        <StartButton
          label={t('listening.fromText.start')}
          icon="headphones"
          accent={ACCENT}
          accentDark={ACCENT_DARK}
          disabled={isStarting}
          onClick={() => void startListening()}
        />
      </div>
    </ContentContainer>
  );
}
