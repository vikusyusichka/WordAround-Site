/* Plays a listening section: either the site's voice reading the author's
   text, or the author's uploaded recording. When the author limited the
   plays (once / twice, as in real exams), only Play is offered and the
   counter shows what is left; otherwise the learner can pause and replay. */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SECONDARY_BUTTON } from '@/components/exams/ui';
import { Icon } from '@/components/primitives/Icon';
import type { ListeningAudio } from '@/lib/customTests/model';
import {
  isSpeechSupported,
  pauseListeningSpeech,
  resumeListeningSpeech,
  speakListening,
  stopListeningSpeech,
} from '@/lib/speech';
import { voiceLocaleFor } from '@/lib/voiceLocales';

interface ListeningPlayerProps {
  audio: ListeningAudio;
  languageId: string;
  maxPlays: number | null;
}

type Status = 'idle' | 'playing' | 'paused';

export const ListeningPlayer = ({ audio, languageId, maxPlays }: ListeningPlayerProps) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('idle');
  const [plays, setPlays] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  /* Leaving the section (or the page) must silence the voice. */
  useEffect(() => () => stopListeningSpeech(), []);

  const playsLeft = maxPlays === null ? null : Math.max(0, maxPlays - plays);
  const exhausted = playsLeft === 0 && status === 'idle';
  const limited = maxPlays !== null;

  if (audio.source === 'tts' && !isSpeechSupported()) {
    return <p className="text-[14px] font-semibold text-(--color-cs-red)">{t('exams.custom.player.noVoice')}</p>;
  }

  const play = () => {
    if (status === 'paused') {
      if (audio.source === 'tts') resumeListeningSpeech();
      else void audioRef.current?.play();
      setStatus('playing');
      return;
    }
    if (exhausted) return;
    setPlays((n) => n + 1);
    setStatus('playing');
    if (audio.source === 'tts') {
      speakListening(audio.text, {
        locale: voiceLocaleFor(languageId),
        rate: 1,
        voiceType: 'default',
        onEnd: () => setStatus('idle'),
      });
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => setStatus('idle'));
    }
  };

  const pause = () => {
    if (audio.source === 'tts') pauseListeningSpeech();
    else audioRef.current?.pause();
    setStatus('paused');
  };

  /* Unlimited recording: the browser's own controls are the best player. */
  if (audio.source === 'file' && !limited) {
    return <audio controls preload="metadata" src={audio.url} className="w-full max-w-[520px]" />;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-(--color-surface-border) bg-(--color-surface) p-3">
      {audio.source === 'file' && (
        <audio ref={audioRef} src={audio.url} preload="auto" onEnded={() => setStatus('idle')} className="hidden" />
      )}
      {status === 'playing' && !limited ? (
        <button type="button" className={SECONDARY_BUTTON} onClick={pause}>
          <Icon name="pause.fill" className="size-5 text-(--color-primary-blue)" />
          {t('exams.custom.player.pause')}
        </button>
      ) : (
        <button
          type="button"
          className={SECONDARY_BUTTON}
          onClick={play}
          disabled={exhausted || (limited && status === 'playing')}
        >
          <Icon name="play.fill" className="size-5 text-(--color-primary-blue)" />
          {status === 'paused'
            ? t('exams.custom.player.resume')
            : status === 'playing'
              ? t('exams.custom.player.playing')
              : plays > 0
                ? t('exams.custom.player.again')
                : t('exams.custom.player.play')}
        </button>
      )}
      {playsLeft !== null && (
        <span className="text-[14px] font-semibold text-(--color-text-secondary)">
          {t('exams.custom.player.playsLeft', { count: playsLeft })}
        </span>
      )}
    </div>
  );
};
