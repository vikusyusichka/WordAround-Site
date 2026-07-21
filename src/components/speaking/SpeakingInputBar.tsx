/* Mic + text input bar — the dual input path used by all conversation modes.
   The mic button drives Web Speech STT (where supported); the text field is
   always available (accessibility + browsers without STT + verification). */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { SpeakingState } from '@/lib/speakingTypes';

interface SpeakingInputBarProps {
  state: SpeakingState;
  partialTranscript: string;
  speechSupported: boolean;
  accentColor: string;
  disabled?: boolean;
  onToggleMic: () => void;
  onSendText: (text: string) => void;
}

export const SpeakingInputBar = ({
  state,
  partialTranscript,
  speechSupported,
  accentColor,
  disabled,
  onToggleMic,
  onSendText,
}: SpeakingInputBarProps) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const isListening = state === 'listening';
  const isBusy = state === 'processing' || state === 'speaking';

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSendText(trimmed);
    setText('');
  };

  return (
    <div className="flex flex-col gap-2">
      {isListening && (
        <p className="rounded-2xl bg-(--color-goal-bg) px-4 py-2 text-[14px] font-medium text-(--color-primary-blue-dark)">
          {partialTranscript || t('speaking.input.listening')}
        </p>
      )}

      <div className="flex items-center gap-2">
        {speechSupported && (
          <button
            type="button"
            onClick={onToggleMic}
            disabled={disabled || isBusy}
            aria-label={isListening ? t('speaking.input.stop') : t('speaking.input.speak')}
            className={`grid size-12 shrink-0 place-items-center rounded-full text-white shadow-[0_8px_14px_rgba(0,0,0,0.15)] transition-transform active:scale-95 disabled:opacity-40 ${
              isListening ? 'animate-pulse' : ''
            }`}
            style={{ background: accentColor }}
          >
            <Icon name="mic.fill" className="size-[20px]" />
          </button>
        )}

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          disabled={disabled || isListening}
          placeholder={t('speaking.input.placeholder')}
          className="h-12 flex-1 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[15px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand) disabled:opacity-60"
        />

        <button
          type="button"
          onClick={submit}
          disabled={disabled || isListening || text.trim().length === 0}
          className="grid size-12 shrink-0 place-items-center rounded-full text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform active:scale-95 disabled:opacity-40"
          style={{ background: accentColor }}
        >
          <Icon name="arrow.right" className="size-[18px]" />
        </button>
      </div>

      {!speechSupported && (
        <p className="text-[12px] font-medium text-(--color-muted-text)">
          {t('speaking.input.noVoice')}
        </p>
      )}
    </div>
  );
};
