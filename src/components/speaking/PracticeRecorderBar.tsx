/* Listen → Record → Play-yourself-back controls, shared by Shadowing and the
   Pronunciation Trainer. Scoring lives elsewhere (and needs Azure); this bar is
   the part that always works. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';

interface PracticeRecorderBarProps {
  accentColor: string;
  isSpeaking: boolean;
  isRecording: boolean;
  hasRecording: boolean;
  recordingSupported: boolean;
  onListen: () => void;
  onToggleRecord: () => void;
  onPlayBack: () => void;
}

export const PracticeRecorderBar = ({
  accentColor,
  isSpeaking,
  isRecording,
  hasRecording,
  recordingSupported,
  onListen,
  onToggleRecord,
  onPlayBack,
}: PracticeRecorderBarProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onListen}
          disabled={isRecording}
          className="flex h-11 items-center gap-2 rounded-2xl px-4 text-[14px] font-semibold text-white shadow-[0_6px_12px_rgba(0,0,0,0.12)] transition-transform active:scale-[0.98] disabled:opacity-40"
          style={{ background: accentColor }}
        >
          <Icon name={isSpeaking ? 'speaker.wave.2.fill' : 'play.fill'} className="size-[16px]" />
          {isSpeaking ? t('speaking.practice.playing') : t('speaking.practice.listen')}
        </button>

        {recordingSupported && (
          <button
            type="button"
            onClick={onToggleRecord}
            className={`flex h-11 items-center gap-2 rounded-2xl border px-4 text-[14px] font-semibold transition-colors ${
              isRecording
                ? 'animate-pulse border-(--color-cs-red)/50 bg-(--color-cs-red)/10 text-(--color-cs-red)'
                : 'border-(--color-auth-field-border) bg-white text-(--color-primary-blue-dark) hover:bg-black/[0.03]'
            }`}
          >
            <Icon name={isRecording ? 'stop.fill' : 'mic.fill'} className="size-[16px]" />
            {isRecording ? t('speaking.practice.stop') : t('speaking.practice.record')}
          </button>
        )}

        {hasRecording && !isRecording && (
          <button
            type="button"
            onClick={onPlayBack}
            className="flex h-11 items-center gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[14px] font-semibold text-(--color-primary-blue-dark) transition-colors hover:bg-black/[0.03]"
          >
            <Icon name="play.fill" className="size-[16px]" />
            {t('speaking.practice.playMine')}
          </button>
        )}
      </div>

      {!recordingSupported && (
        <p className="text-[12px] font-medium text-(--color-muted-text)">
          {t('speaking.practice.noRecording')}
        </p>
      )}
    </div>
  );
};
