/* A speaking task: what the examiner gives you (instructions, cue card,
   material, a photo, the questions — each readable aloud), optional
   preparation time, then one recording of the answer. The recording is
   transcribed on the server (Whisper), which works in every browser, unlike
   the Web Speech API. Without a microphone the answer can be typed instead,
   and the result says so. */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { isAudioRecordingSupported, startAudioRecording, type AudioRecorder } from '@/lib/audioRecorder';
import { fetchRandomImage, type DescribePictureImage } from '@/lib/describePicture';
import { speakQuestion, stopScript } from '@/lib/exams/examAudio';
import type { GeneratedSpeakingTask } from '@/lib/exams/generation';
import type { SpeakingTaskSpec } from '@/lib/exams/types';
import { transcribeMedia } from '@/lib/listeningTranscribe';

import { useSecondsLeft } from '@/hooks/useSecondsLeft';
import { formatClock } from '@/lib/exams/display';

import { ExamTimer } from './ExamTimer';
import { BODY_TEXT, CARD, FIELD, PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from './ui';

export interface SpokenAnswer {
  transcript: string;
  seconds: number;
  typed: boolean;
}

interface SpeakingTaskViewProps {
  spec: SpeakingTaskSpec;
  generated: GeneratedSpeakingTask;
  languageId: string;
  level: string;
  answer: SpokenAnswer | null;
  onAnswer: (answer: SpokenAnswer) => void;
  /** Hide the "record again" control (the mock exam takes the first answer). */
  singleTake?: boolean;
}

type Phase = 'idle' | 'preparing' | 'recording' | 'transcribing' | 'error';

export const SpeakingTaskView = ({
  spec,
  generated,
  languageId,
  level,
  answer,
  onAnswer,
  singleTake,
}: SpeakingTaskViewProps) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [picture, setPicture] = useState<DescribePictureImage | null>(null);
  const [prepDeadline, setPrepDeadline] = useState<number | null>(null);
  const [recordStart, setRecordStart] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const recorder = useRef<AudioRecorder | null>(null);
  const lastBlob = useRef<{ blob: Blob; seconds: number } | null>(null);
  const canRecord = isAudioRecordingSupported();

  const prepLeft = useSecondsLeft(prepDeadline);
  const recordLimit = spec.speakSeconds + 30;
  const recordLeft = useSecondsLeft(recordStart === null ? null : recordStart + recordLimit * 1000);

  useEffect(() => {
    if (!generated.usesPicture) return undefined;
    const controller = new AbortController();
    fetchRandomImage(controller.signal)
      .then(setPicture)
      .catch(() => setPicture(null));
    return () => controller.abort();
  }, [generated.usesPicture]);

  useEffect(
    () => () => {
      recorder.current?.cancel();
      stopScript();
    },
    [],
  );

  const transcribe = async (blob: Blob, seconds: number) => {
    setPhase('transcribing');
    setError(null);
    try {
      const result = await transcribeMedia(blob, { fileName: 'answer.webm', languageId, level });
      onAnswer({ transcript: result.transcriptText, seconds, typed: false });
      setPhase('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('exams.speaking.transcribeFailed'));
      setPhase('error');
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      recorder.current = await startAudioRecording();
      setPrepDeadline(null);
      setRecordStart(Date.now());
      setPhase('recording');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('exams.speaking.micFailed'));
      setPhase('error');
    }
  };

  const stopRecording = async () => {
    const active = recorder.current;
    recorder.current = null;
    setRecordStart(null);
    if (!active) return;
    const recording = await active.stop();
    const seconds = Math.round(recording.durationMs / 1000);
    lastBlob.current = { blob: recording.blob, seconds };
    await transcribe(recording.blob, seconds);
  };

  /* Stop on its own when the generous limit runs out, like an examiner would. */
  useEffect(() => {
    if (phase === 'recording' && recordLeft !== null && recordLeft <= 0) void stopRecording();
    // stopRecording only reads refs and setters; re-running on its identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, recordLeft]);

  const spokenSoFar = recordStart === null || recordLeft === null ? 0 : recordLimit - recordLeft;

  return (
    <div className="flex flex-col gap-4">
      <section className={`${CARD} flex flex-col gap-4`}>
        <h2 className={SECTION_TITLE}>{generated.title}</h2>
        <p className={`${BODY_TEXT} whitespace-pre-line`}>{generated.instructions}</p>
        {generated.material && (
          <div className="rounded-2xl bg-(--color-hover-wash) p-4">
            <p className={`${BODY_TEXT} whitespace-pre-line`}>{generated.material}</p>
          </div>
        )}
        {generated.cueCard && (
          <div className="rounded-2xl border border-dashed border-(--color-surface-border) p-4">
            <p className="text-[16px] font-bold text-(--color-primary-blue-dark)">{generated.cueCard.topic}</p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
              {generated.cueCard.points.map((point) => (
                <li key={point} className={BODY_TEXT}>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}
        {generated.usesPicture && picture && (
          <figure className="flex flex-col gap-1.5">
            <img src={picture.imageURL} alt="" className="max-h-[360px] w-full rounded-2xl object-cover" />
            <figcaption className="text-[12px] font-medium text-(--color-muted-text)">
              {t('exams.speaking.photoBy')}{' '}
              <a href={picture.authorURL} target="_blank" rel="noreferrer" className="underline">
                {picture.authorName}
              </a>
            </figcaption>
          </figure>
        )}
        {generated.questions.length > 0 && (
          <ol className="flex flex-col gap-2">
            {generated.questions.map((question, i) => (
              <li key={i} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => speakQuestion(question, languageId)}
                  aria-label={t('exams.speaking.listenQuestion')}
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-(--color-hover-wash) text-(--color-primary-blue)"
                >
                  <Icon name="speaker.wave.2.fill" className="size-4" />
                </button>
                <span className={`${BODY_TEXT} pt-1`}>{question}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={`${CARD} flex flex-col items-start gap-4`}>
        {phase === 'preparing' && prepLeft !== null && spec.prepSeconds && (
          <ExamTimer secondsLeft={prepLeft} totalSeconds={spec.prepSeconds} label={t('exams.speaking.prepTime')} />
        )}
        {phase === 'recording' && recordLeft !== null && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2 text-[15px] font-bold text-(--color-profile-danger)">
              <span className="size-2.5 animate-pulse rounded-full bg-(--color-profile-danger)" />
              {t('exams.speaking.recording', { time: formatClock(spokenSoFar) })}
            </span>
            <span className="text-[13px] font-semibold text-(--color-muted-text)">
              {t('exams.speaking.aimFor', { time: formatClock(spec.speakSeconds) })}
            </span>
          </div>
        )}
        {phase === 'transcribing' && (
          <p className="text-[15px] font-semibold text-(--color-muted-text)">{t('exams.speaking.transcribing')}</p>
        )}
        {error && <p className="text-[14px] font-semibold text-(--color-profile-danger)">{error}</p>}

        {answer && phase === 'idle' && (
          <div className="flex w-full flex-col gap-1.5">
            <span className="text-[13px] font-bold text-(--color-muted-text)">
              {answer.typed ? t('exams.speaking.typedAnswer') : t('exams.speaking.transcript', { time: formatClock(answer.seconds) })}
            </span>
            <p className={`${BODY_TEXT} rounded-2xl bg-(--color-hover-wash) p-4`}>{answer.transcript}</p>
          </div>
        )}

        {canRecord ? (
          <div className="flex flex-wrap gap-3">
            {phase === 'idle' && !answer && spec.prepSeconds && prepDeadline === null && (
              <button
                type="button"
                className={SECONDARY_BUTTON}
                onClick={() => {
                  setPrepDeadline(Date.now() + (spec.prepSeconds ?? 0) * 1000);
                  setPhase('preparing');
                }}
              >
                {t('exams.speaking.startPrep', { time: formatClock(spec.prepSeconds) })}
              </button>
            )}
            {(phase === 'idle' || phase === 'preparing') && (!answer || !singleTake) && (
              <button type="button" className={PRIMARY_BUTTON} onClick={() => void startRecording()}>
                <Icon name="mic.fill" className="size-5" />
                {answer ? t('exams.speaking.recordAgain') : t('exams.speaking.startSpeaking')}
              </button>
            )}
            {phase === 'recording' && (
              <button type="button" className={PRIMARY_BUTTON} onClick={() => void stopRecording()}>
                {t('exams.speaking.finish')}
              </button>
            )}
            {phase === 'error' && lastBlob.current && (
              <button
                type="button"
                className={SECONDARY_BUTTON}
                onClick={() => lastBlob.current && void transcribe(lastBlob.current.blob, lastBlob.current.seconds)}
              >
                {t('exams.retry')}
              </button>
            )}
            {phase === 'error' && !lastBlob.current && (
              <button type="button" className={SECONDARY_BUTTON} onClick={() => setPhase('idle')}>
                {t('exams.retry')}
              </button>
            )}
          </div>
        ) : (
          !answer && (
            <div className="flex w-full flex-col gap-3">
              <p className="text-[14px] font-semibold text-(--color-muted-text)">{t('exams.speaking.noMic')}</p>
              <textarea value={typed} onChange={(e) => setTyped(e.target.value)} rows={6} className={FIELD} />
              <button
                type="button"
                className={PRIMARY_BUTTON}
                disabled={typed.trim().length === 0}
                onClick={() => onAnswer({ transcript: typed.trim(), seconds: 0, typed: true })}
              >
                {t('exams.speaking.useTyped')}
              </button>
            </div>
          )
        )}
      </section>
    </div>
  );
};
