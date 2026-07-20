/* Import Audio — /practice/listening/import-audio. Setup (upload + language/
   level/questions) → processing (transcribe via the worker, then local
   question generation) → session (audio player with rate control, transcript
   deliberately hidden — iOS parity) → result. Web port of the ImportAudio
   submodule; web deviation: transcription goes through the Whisper worker
   (iOS uses on-device speech, which has no browser equivalent). */
import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { ListeningQuestionList } from '@/components/listening/ListeningQuestionList';
import { ListeningResultView } from '@/components/listening/ListeningResultView';
import { ESSAY_LANGUAGES, findLanguage } from '@/lib/essayTypes';
import {
  formatDuration,
  formatFileSize,
  importListeningAudio,
  type ImportedListeningMedia,
} from '@/lib/listeningImport';
import { generateListeningQuestions } from '@/lib/listeningQuestionGenerator';
import { makeListeningResult } from '@/lib/listeningScoring';
import {
  deleteListeningMedia,
  getListeningMedia,
  saveListeningSession,
} from '@/lib/listeningStore';
import { transcribeMedia } from '@/lib/listeningTranscribe';
import {
  LISTENING_QUESTION_COUNTS,
  LISTENING_QUESTION_TYPES,
  VOICE_SPEED_META,
  type ListeningPersistedSession,
  type ListeningQuestion,
  type ListeningQuestionType,
  type ListeningVoiceSpeed,
} from '@/lib/listeningTypes';

export const Route = createFileRoute('/_authed/practice/listening/import-audio/')({
  component: ImportAudioScreen,
});

const ACCENT = '#8C66EB';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const pill = (selected: boolean) =>
  `h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    selected
      ? 'border-[#8C66EB]/50 bg-[#8C66EB]/10 text-(--color-primary-blue-dark)'
      : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
  }`;

const sectionTitle =
  'text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)';

type Screen = 'setup' | 'processing' | 'session' | 'result';
type ProcessingStep = 0 | 1 | 2;

function ImportAudioScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [screen, setScreen] = useState<Screen>('setup');
  const [media, setMedia] = useState<ImportedListeningMedia | null>(null);
  const [languageId, setLanguageId] = useState('english');
  const [level, setLevel] = useState('B1');
  const [addQuestions, setAddQuestions] = useState(true);
  const [questionCount, setQuestionCount] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<ListeningQuestionType[]>([
    ...LISTENING_QUESTION_TYPES,
  ]);
  const [importError, setImportError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>(0);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
  const [transcript, setTranscript] = useState<string | undefined>(undefined);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [hasChecked, setHasChecked] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [rate, setRate] = useState<ListeningVoiceSpeed>('normal');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<ReturnType<typeof makeListeningResult> | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef(crypto.randomUUID());

  /* Listening-time ticker while playing. */
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setElapsedSeconds((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    try {
      if (media) await deleteListeningMedia(media.mediaKey).catch(() => {});
      const imported = await importListeningAudio(file);
      setMedia(imported);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  };

  const clearFile = async () => {
    if (media) await deleteListeningMedia(media.mediaKey).catch(() => {});
    setMedia(null);
  };

  const toggleType = (type: ListeningQuestionType) => {
    setQuestionTypes((prev) => {
      if (prev.includes(type)) return prev.length > 1 ? prev.filter((qt) => qt !== type) : prev;
      return [...prev, type];
    });
  };

  const persist = (patch: Partial<ListeningPersistedSession>) => {
    if (!media) return;
    const session: ListeningPersistedSession = {
      id: sessionIdRef.current,
      modeID: 'import-audio',
      title: media.originalName,
      languageId,
      level,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      durationSeconds: Math.round(media.durationSeconds),
      elapsedSeconds,
      progress: duration > 0 ? Math.min(currentTime / duration, 1) : 0,
      playbackPosition: currentTime,
      mediaKey: media.mediaKey,
      transcript,
      voiceSpeed: rate,
      voiceType: 'default',
      showTextWhileListening: false,
      addQuestions,
      questions,
      selectedAnswers,
      status: 'inProgress',
      ...patch,
    };
    void saveListeningSession(session);
  };

  const startProcessing = async () => {
    if (!media) return;
    setScreen('processing');
    setProcessingError(null);
    setProcessingStep(0);
    try {
      let generated: ListeningQuestion[] = [];
      let transcriptText: string | undefined;
      if (addQuestions) {
        const blob = await getListeningMedia(media.mediaKey);
        if (!blob) throw new Error('missing media');
        setProcessingStep(1);
        const transcription = await transcribeMedia(blob, {
          fileName: media.originalName,
          languageId,
          level,
        });
        transcriptText = transcription.transcriptText;
        setProcessingStep(2);
        generated = generateListeningQuestions({
          text: transcription.transcriptText,
          types: questionTypes,
          count: questionCount,
        });
      }
      setTranscript(transcriptText);
      setQuestions(generated);
      /* Prepare the player. */
      const blob = await getListeningMedia(media.mediaKey);
      if (!blob) throw new Error('missing media');
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => setDuration(audio.duration || media.durationSeconds);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);
      audioRef.current = audio;
      setScreen('session');
      persist({ status: 'inProgress', questions: generated, transcript: transcriptText });
    } catch (e) {
      setProcessingError(
        e instanceof Error && e.message !== 'missing media'
          ? e.message
          : t('listening.importAudio.processError'),
      );
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.playbackRate = VOICE_SPEED_META[rate].playbackRate;
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const replay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.playbackRate = VOICE_SPEED_META[rate].playbackRate;
    void audio.play();
  };

  const selectRate = (speed: ListeningVoiceSpeed) => {
    setRate(speed);
    if (audioRef.current) audioRef.current.playbackRate = VOICE_SPEED_META[speed].playbackRate;
  };

  const checkAnswers = () => {
    if (Object.keys(selectedAnswers).length === 0) {
      setCheckError(true);
      return;
    }
    setCheckError(false);
    setHasChecked(true);
    persist({});
  };

  const finishPractice = () => {
    audioRef.current?.pause();
    const finalResult = makeListeningResult({
      questions,
      selectedAnswers,
      listeningTimeSeconds: elapsedSeconds,
      speedLabel: VOICE_SPEED_META[rate].label,
    });
    setResult(finalResult);
    persist({ status: 'completed', result: finalResult, progress: 1 });
    setScreen('result');
  };

  const goBack = () => void navigate({ to: '/practice/listening' });

  const steps = [
    t('listening.importAudio.step1'),
    t('listening.importAudio.step2'),
    t('listening.importAudio.step3'),
  ];

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('listening.importAudio.title')}
        subtitle={t('listening.importAudio.subtitle')}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={goBack}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {t('nav.listening')}
        </button>

        {screen === 'setup' && (
          <>
            {/* Upload card */}
            <div
              className={`flex flex-col gap-3 rounded-2xl border-2 p-5 ${
                media
                  ? 'border-(--color-auth-field-border) bg-white'
                  : 'border-dashed border-[#8C66EB]/40 bg-[#8C66EB]/5'
              }`}
            >
              {media ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[14px] font-bold text-(--color-primary-blue-dark)">
                      {media.originalName}
                    </span>
                    <span className="text-[12px] font-medium text-(--color-text-secondary)">
                      {formatDuration(media.durationSeconds)} · {formatFileSize(media.fileSizeBytes)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void clearFile()}
                    aria-label={t('listening.importAudio.clearFile')}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-(--color-cs-text-muted) hover:bg-black/[0.04]"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Icon name="waveform.badge.plus" className="size-[28px] text-[#8C66EB]" />
                  <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">
                    {t('listening.importAudio.uploadTitle')}
                  </span>
                  <span className="text-[13px] font-medium text-(--color-text-secondary)">
                    {t('listening.importAudio.uploadFormats')}
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 h-10 rounded-2xl bg-[#8C66EB] px-5 text-[14px] font-semibold text-white"
                  >
                    {t('listening.importAudio.chooseFile')}
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.m4a,.wav,.aac,audio/*"
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
            </div>
            {importError && (
              <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                {importError}
              </p>
            )}

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
                  className="size-5 accent-[#8C66EB]"
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

            <p className="text-[13px] font-medium text-(--color-muted-text)">
              {t('listening.importAudio.infoNote')}
            </p>

            <button
              type="button"
              onClick={() => void startProcessing()}
              disabled={!media}
              className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              {t('listening.importAudio.continue')}
            </button>
          </>
        )}

        {screen === 'processing' && (
          <div className="flex flex-col gap-4 rounded-3xl border border-white bg-white/95 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
            <h3 className="text-[17px] font-bold text-(--color-primary-blue-dark)">
              {t('listening.importAudio.processingTitle')}
            </h3>
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <span
                  className={`grid size-8 place-items-center rounded-full text-[13px] font-bold ${
                    processingError && i === processingStep
                      ? 'bg-(--color-cs-red)/10 text-(--color-cs-red)'
                      : i < processingStep
                        ? 'bg-[#22C55E] text-white'
                        : i === processingStep
                          ? 'bg-[#8C66EB] text-white'
                          : 'bg-(--color-goal-bg) text-(--color-text-secondary)'
                  }`}
                >
                  {i < processingStep ? '✓' : i + 1}
                </span>
                <span
                  className={`text-[14px] font-semibold ${
                    i <= processingStep ? 'text-(--color-primary-blue-dark)' : 'text-(--color-muted-text)'
                  }`}
                >
                  {step}
                  {i === processingStep && !processingError ? '…' : ''}
                </span>
              </div>
            ))}
            {processingError && (
              <>
                <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                  {processingError}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void startProcessing()}
                    className="h-11 flex-1 rounded-2xl bg-[#8C66EB] text-[14px] font-semibold text-white"
                  >
                    {t('listening.importAudio.tryAgain')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen('setup')}
                    className="h-11 flex-1 rounded-2xl border border-(--color-auth-field-border) bg-white text-[14px] font-semibold text-(--color-cs-text-muted)"
                  >
                    {t('listening.importAudio.chooseAnother')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {screen === 'session' && (
          <>
            {/* Player card */}
            <div className="flex flex-col gap-3 rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
              <div className="h-[6px] w-full overflow-hidden rounded-full bg-(--color-goal-bg)">
                <div
                  className="h-full rounded-full bg-[#8C66EB] transition-[width]"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[12px] font-semibold tabular-nums text-(--color-text-secondary)">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={replay}
                  aria-label={t('listening.session.replay')}
                  className="grid size-11 place-items-center rounded-full border border-(--color-auth-field-border) bg-white"
                >
                  <Icon name="arrow.uturn.backward" className="size-[16px] text-(--color-text-secondary)" />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="grid size-14 place-items-center rounded-full bg-[#8C66EB] text-white shadow-[0_8px_14px_rgba(140,102,235,0.35)]"
                >
                  {isPlaying ? (
                    <span className="text-[18px] font-bold">❚❚</span>
                  ) : (
                    <Icon name="play.fill" className="size-[20px]" />
                  )}
                </button>
                <div className="flex gap-1">
                  {(['slow', 'normal', 'fast'] as ListeningVoiceSpeed[]).map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => selectRate(speed)}
                      className={`h-8 rounded-full px-2.5 text-[11px] font-bold ${
                        rate === speed
                          ? 'bg-[#8C66EB] text-white'
                          : 'bg-(--color-goal-bg) text-(--color-text-secondary)'
                      }`}
                    >
                      {VOICE_SPEED_META[speed].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hidden-transcript note (iOS parity) */}
            <p className="text-center text-[13px] font-medium text-(--color-muted-text)">
              {t('listening.importAudio.transcriptHidden')}
            </p>

            {questions.length > 0 && (
              <ListeningQuestionList
                questions={questions}
                selectedAnswers={selectedAnswers}
                hasChecked={hasChecked}
                accentColor={ACCENT}
                onSelect={(qid, oi) => setSelectedAnswers((prev) => ({ ...prev, [qid]: oi }))}
              />
            )}

            {checkError && (
              <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                {t('listening.session.answerFirst')}
              </p>
            )}

            <button
              type="button"
              onClick={() => (questions.length > 0 && !hasChecked ? checkAnswers() : finishPractice())}
              className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
            >
              {questions.length > 0 && !hasChecked
                ? t('listening.session.checkAnswers')
                : t('listening.session.finish')}
            </button>
          </>
        )}

        {screen === 'result' && result && (
          <ListeningResultView
            result={result}
            subtitle={media?.originalName ?? ''}
            chips={[findLanguage(languageId).title, level, t('listening.importAudio.title')]}
            accentColor={ACCENT}
            onBack={goBack}
          />
        )}
      </div>
    </ContentContainer>
  );
}
