/* Import Video — /practice/listening/import-video. Setup (video upload) →
   processing (transcribe the video via the Whisper worker — web deviation:
   no client-side audio extraction, the video uploads directly under the
   80 MB cap) → session: <video> player + a synced subtitle card whose
   active-cue words are tappable (translate → save to a flashcard set),
   questions locked until the video ends → result. */
import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { ListeningQuestionList } from '@/components/listening/ListeningQuestionList';
import { ListeningResultView } from '@/components/listening/ListeningResultView';
import { ListeningWordSheet } from '@/components/listening/ListeningWordSheet';
import { useUid } from '@/hooks/useFolders';
import { useSessionStore } from '@/stores/sessionStore';
import { ESSAY_LANGUAGES, findLanguage } from '@/lib/essayTypes';
import {
  formatDuration,
  formatFileSize,
  importListeningVideo,
  type ImportedListeningMedia,
} from '@/lib/listeningImport';
import { generateListeningQuestions } from '@/lib/listeningQuestionGenerator';
import { makeListeningResult } from '@/lib/listeningScoring';
import {
  deleteListeningMedia,
  getListeningMedia,
  saveListeningSession,
} from '@/lib/listeningStore';
import {
  activeCueAt,
  estimatedCues,
  sentenceCues,
  transcribeMedia,
  type ListeningSubtitleCue,
} from '@/lib/listeningTranscribe';
import {
  LISTENING_QUESTION_COUNTS,
  LISTENING_QUESTION_TYPES,
  type ListeningPersistedSession,
  type ListeningQuestion,
  type ListeningQuestionType,
} from '@/lib/listeningTypes';

export const Route = createFileRoute('/_authed/practice/listening/import-video/')({
  component: ImportVideoScreen,
});

const ACCENT = '#29A89E';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const pill = (selected: boolean) =>
  `h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    selected
      ? 'border-[#29A89E]/50 bg-[#29A89E]/10 text-(--color-primary-blue-dark)'
      : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
  }`;

const sectionTitle =
  'text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)';

type Screen = 'setup' | 'processing' | 'session' | 'result';

function ImportVideoScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUid();
  const email = useSessionStore((s) => s.currentEmail) ?? '';

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
  const [processingStep, setProcessingStep] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const [cues, setCues] = useState<ListeningSubtitleCue[]>([]);
  const [transcript, setTranscript] = useState<string | undefined>(undefined);
  const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [subtitlesOn, setSubtitlesOn] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [hasChecked, setHasChecked] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof makeListeningResult> | null>(null);
  const [sheetWord, setSheetWord] = useState<string | null>(null);
  const [sheetContext, setSheetContext] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setElapsedSeconds((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    try {
      if (media) await deleteListeningMedia(media.mediaKey).catch(() => {});
      setMedia(await importListeningVideo(file));
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
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
      modeID: 'import-video',
      title: media.originalName,
      languageId,
      level,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      durationSeconds: Math.round(media.durationSeconds),
      elapsedSeconds,
      progress: videoEnded ? 1 : 0.5,
      playbackPosition: currentTime,
      mediaKey: media.mediaKey,
      transcript,
      voiceSpeed: 'normal',
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
      const blob = await getListeningMedia(media.mediaKey);
      if (!blob) throw new Error(t('listening.importAudio.processError'));
      setProcessingStep(1);
      const transcription = await transcribeMedia(blob, {
        fileName: media.originalName,
        languageId,
        level,
      });
      setProcessingStep(2);
      const merged = sentenceCues(transcription.subtitles);
      const finalCues =
        merged.length > 0
          ? merged
          : estimatedCues(transcription.transcriptText, media.durationSeconds);
      const generated = addQuestions
        ? generateListeningQuestions({
            text: transcription.transcriptText,
            types: questionTypes,
            count: questionCount,
          })
        : [];
      setCues(finalCues);
      setTranscript(transcription.transcriptText);
      setQuestions(generated);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setScreen('session');
      persist({
        status: 'inProgress',
        transcript: transcription.transcriptText,
        questions: generated,
      });
    } catch (e) {
      setProcessingError(e instanceof Error ? e.message : t('listening.importAudio.processError'));
    }
  };

  const activeCue = activeCueAt(cues, currentTime);

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
    const finalResult = makeListeningResult({
      questions,
      selectedAnswers,
      listeningTimeSeconds: elapsedSeconds,
      speedLabel: '1.0x',
    });
    setResult(finalResult);
    persist({ status: 'completed', result: finalResult, progress: 1 });
    setScreen('result');
  };

  const goBack = () => void navigate({ to: '/practice/listening' });

  const steps = [
    t('listening.importVideo.step1'),
    t('listening.importVideo.step2'),
    t('listening.importVideo.step3'),
  ];

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('listening.importVideo.title')}
        subtitle={t('listening.importVideo.subtitle')}
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
            <div
              className={`flex flex-col gap-3 rounded-2xl border-2 p-5 ${
                media
                  ? 'border-(--color-auth-field-border) bg-white'
                  : 'border-dashed border-[#29A89E]/40 bg-[#29A89E]/5'
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
                    onClick={() => {
                      void deleteListeningMedia(media.mediaKey).catch(() => {});
                      setMedia(null);
                    }}
                    aria-label={t('listening.importAudio.clearFile')}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-(--color-cs-text-muted) hover:bg-black/[0.04]"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Icon name="film.stack" className="size-[28px] text-[#29A89E]" />
                  <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">
                    {t('listening.importVideo.uploadTitle')}
                  </span>
                  <span className="text-[13px] font-medium text-(--color-text-secondary)">
                    {t('listening.importVideo.uploadFormats')}
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 h-10 rounded-2xl bg-[#29A89E] px-5 text-[14px] font-semibold text-white"
                  >
                    {t('listening.importAudio.chooseFile')}
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,.m4v,video/*"
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
            </div>
            {importError && (
              <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                {importError}
              </p>
            )}

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

            <div className="flex flex-col gap-3 rounded-2xl border border-(--color-auth-field-border) bg-white p-4">
              <label className="flex cursor-pointer items-center justify-between">
                <span className="text-[14px] font-semibold text-(--color-primary-blue-dark)">
                  {t('listening.fromText.addQuestions')}
                </span>
                <input
                  type="checkbox"
                  checked={addQuestions}
                  onChange={(e) => setAddQuestions(e.target.checked)}
                  className="size-5 accent-[#29A89E]"
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
                          ? 'bg-[#29A89E] text-white'
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
                    className="h-11 flex-1 rounded-2xl bg-[#29A89E] text-[14px] font-semibold text-white"
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

        {screen === 'session' && videoUrl && (
          <>
            <video
              src={videoUrl}
              controls
              className="aspect-video w-full rounded-2xl bg-black"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                setVideoEnded(true);
                persist({ progress: 1 });
              }}
            />

            {/* Synced subtitles */}
            <div className="flex flex-col gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white p-4">
              <div className="flex items-center justify-between">
                <span className={sectionTitle}>{t('listening.importVideo.subtitles')}</span>
                <button
                  type="button"
                  onClick={() => setSubtitlesOn((v) => !v)}
                  className={`h-8 rounded-full px-3 text-[12px] font-bold ${
                    subtitlesOn
                      ? 'bg-[#29A89E]/12 text-[#14736E]'
                      : 'bg-(--color-goal-bg) text-(--color-text-secondary)'
                  }`}
                >
                  {subtitlesOn
                    ? t('listening.importVideo.subtitlesOn')
                    : t('listening.importVideo.subtitlesOff')}
                </button>
              </div>
              {subtitlesOn &&
                (cues.length === 0 ? (
                  <p className="text-[13px] font-medium text-(--color-muted-text)">
                    {t('listening.importVideo.noSubtitles')}
                  </p>
                ) : activeCue ? (
                  <>
                    <p className="text-[16px] font-medium leading-relaxed text-(--color-primary-blue-dark)">
                      {activeCue.text.split(/\s+/).map((rawWord, i) => {
                        const cleaned = rawWord.replace(/[^\p{L}\p{N}'-]/gu, '');
                        if (cleaned.length === 0) return <span key={i}>{rawWord} </span>;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setSheetWord(cleaned);
                              setSheetContext(activeCue.text);
                            }}
                            className="cursor-pointer border-0 bg-transparent p-0 font-medium text-inherit hover:underline"
                          >
                            {rawWord}{' '}
                          </button>
                        );
                      })}
                    </p>
                    <p className="text-[11px] font-medium text-(--color-muted-text)">
                      {t('listening.importVideo.tapWord')}
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] font-medium text-(--color-muted-text)">…</p>
                ))}
            </div>

            {/* Questions (locked until the video finishes) */}
            {addQuestions && questions.length > 0 && (
              <>
                {videoEnded ? (
                  <ListeningQuestionList
                    questions={questions}
                    selectedAnswers={selectedAnswers}
                    hasChecked={hasChecked}
                    accentColor={ACCENT}
                    onSelect={(qid, oi) => setSelectedAnswers((prev) => ({ ...prev, [qid]: oi }))}
                  />
                ) : (
                  <p className="rounded-2xl bg-(--color-goal-bg) px-4 py-3 text-center text-[13px] font-semibold text-(--color-text-secondary)">
                    {t('listening.importVideo.questionsLocked')}
                  </p>
                )}
              </>
            )}

            {checkError && (
              <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                {t('listening.session.answerFirst')}
              </p>
            )}

            <button
              type="button"
              disabled={!videoEnded}
              onClick={() =>
                questions.length > 0 && !hasChecked ? checkAnswers() : finishPractice()
              }
              className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
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
            chips={[findLanguage(languageId).title, level, t('listening.importVideo.title')]}
            accentColor={ACCENT}
            onBack={goBack}
          />
        )}
      </div>

      {sheetWord && uid && (
        <ListeningWordSheet
          open={sheetWord !== null}
          word={sheetWord}
          contextSentence={sheetContext}
          sourceLanguageId={languageId}
          videoTitle={media?.originalName ?? ''}
          uid={uid}
          email={email}
          onClose={() => setSheetWord(null)}
        />
      )}
    </ContentContainer>
  );
}
