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

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const pill = (selected: boolean) =>
  `h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    selected
      ? 'border-[#3394D1]/50 bg-[#3394D1]/10 text-(--color-primary-blue-dark)'
      : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
  }`;

const sectionTitle =
  'text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)';

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

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={() => void navigate({ to: '/practice/listening' })}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {t('nav.listening')}
        </button>

        {/* Language + level */}
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

        {/* Voice settings */}
        <div className="flex flex-col gap-3 rounded-2xl border border-(--color-auth-field-border) bg-white p-4">
          <div className="flex flex-col gap-1.5">
            <span className={sectionTitle}>{t('listening.fromText.voiceSpeed')}</span>
            <div className="flex gap-1.5">
              {LISTENING_VOICE_SPEEDS.map((speed) => (
                <button key={speed} type="button" onClick={() => setVoiceSpeed(speed)} className={pill(voiceSpeed === speed)}>
                  {VOICE_SPEED_META[speed].label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={sectionTitle}>{t('listening.fromText.voiceType')}</span>
            <div className="flex gap-1.5">
              {LISTENING_VOICE_TYPES.map((type) => (
                <button key={type} type="button" onClick={() => setVoiceType(type)} className={pill(voiceType === type)}>
                  {t(`listening.fromText.voice.${type}`)}
                </button>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-between border-t border-(--color-auth-field-border) pt-3">
            <span className="text-[14px] font-semibold text-(--color-primary-blue-dark)">
              {t('listening.fromText.showText')}
            </span>
            <input
              type="checkbox"
              checked={showText}
              onChange={(e) => setShowText(e.target.checked)}
              className="size-5 accent-[#3394D1]"
            />
          </label>
        </div>

        {/* Question settings */}
        <div className="flex flex-col gap-3 rounded-2xl border border-(--color-auth-field-border) bg-white p-4">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-[14px] font-semibold text-(--color-primary-blue-dark)">
              {t('listening.fromText.addQuestions')}
            </span>
            <input
              type="checkbox"
              checked={addQuestions}
              onChange={(e) => setAddQuestions(e.target.checked)}
              className="size-5 accent-[#3394D1]"
            />
          </label>
          {addQuestions && (
            <>
              <div className="flex flex-col gap-1.5">
                <span className={sectionTitle}>{t('listening.fromText.questionCount')}</span>
                <div className="flex gap-1.5">
                  {LISTENING_QUESTION_COUNTS.map((count) => (
                    <button key={count} type="button" onClick={() => setQuestionCount(count)} className={pill(questionCount === count)}>
                      {count}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={sectionTitle}>{t('listening.fromText.questionTypes')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {LISTENING_QUESTION_TYPES.map((type) => (
                    <button key={type} type="button" onClick={() => toggleType(type)} className={pill(questionTypes.includes(type))}>
                      {t(`listening.questionType.${type}`)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Text input */}
        <label className="flex flex-col gap-1.5">
          <span className={sectionTitle}>{t('listening.fromText.optionalTitle')}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('listening.fromText.titlePlaceholder')}
            className="w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-semibold text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('listening.fromText.textPlaceholder')}
            rows={7}
            className="w-full resize-y rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-medium leading-relaxed text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
          />
          <span className="text-[12px] font-medium text-(--color-muted-text)">
            {t('listening.fromText.recommended')} · {wordCount}{' '}
            {t('listening.fromText.words')}
          </span>
        </div>

        {validation && (
          <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
            {validation}
          </p>
        )}

        <button
          type="button"
          onClick={() => void startListening()}
          disabled={isStarting}
          className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
        >
          {t('listening.fromText.start')}
        </button>
      </div>
    </ContentContainer>
  );
}
