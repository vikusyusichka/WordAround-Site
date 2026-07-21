/* Web Speech API speech-to-text — web substitute for iOS
   SpeechRecognitionService (on-device SFSpeechRecognizer). Continuous with
   interim results, per-locale. Only Chromium/Edge implement it; callers must
   feature-detect (isSpeechRecognitionSupported) and offer a text fallback. */

/* The Web Speech types aren't in lib.dom for all TS configs — declare the
   minimal surface we use. */
interface WASpeechRecognitionAlternative {
  transcript: string;
}
interface WASpeechRecognitionResult {
  0: WASpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}
interface WASpeechRecognitionResultList {
  length: number;
  [index: number]: WASpeechRecognitionResult;
}
interface WASpeechRecognitionEvent {
  resultIndex: number;
  results: WASpeechRecognitionResultList;
}
interface WASpeechRecognitionErrorEvent {
  error: string;
}
interface WASpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: WASpeechRecognitionEvent) => void) | null;
  onerror: ((e: WASpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => WASpeechRecognition;

const getCtor = (): SpeechRecognitionCtor | undefined => {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const isSpeechRecognitionSupported = (): boolean => getCtor() !== undefined;

export type SpeechRecognitionErrorKind = 'permission' | 'unavailable' | 'failed';

export interface SpeechRecognizerCallbacks {
  locale: string;
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (kind: SpeechRecognitionErrorKind) => void;
}

export interface SpeechRecognizer {
  start: () => void;
  /** Stop and deliver the accumulated final transcript via onFinal. */
  stop: () => void;
  /** Abort without delivering a final transcript. */
  cancel: () => void;
  readonly isSupported: boolean;
}

export const createSpeechRecognizer = (
  callbacks: SpeechRecognizerCallbacks,
): SpeechRecognizer => {
  const Ctor = getCtor();
  if (!Ctor) {
    return {
      start: () => callbacks.onError('unavailable'),
      stop: () => {},
      cancel: () => {},
      isSupported: false,
    };
  }

  const recognition = new Ctor();
  recognition.lang = callbacks.locale;
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalText = '';
  let running = false;
  let delivered = false;

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? '';
      if (result.isFinal) finalText = `${finalText} ${transcript}`.trim();
      else interim += transcript;
    }
    callbacks.onPartial(`${finalText} ${interim}`.trim());
  };

  recognition.onerror = (event) => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      callbacks.onError('permission');
    } else if (event.error === 'no-speech' || event.error === 'aborted') {
      /* benign — ignore */
    } else if (event.error === 'network' || event.error === 'audio-capture') {
      callbacks.onError('unavailable');
    } else {
      callbacks.onError('failed');
    }
  };

  recognition.onend = () => {
    running = false;
    if (!delivered) {
      delivered = true;
      callbacks.onFinal(finalText.trim());
    }
  };

  return {
    start: () => {
      if (running) return;
      finalText = '';
      delivered = false;
      running = true;
      try {
        recognition.start();
      } catch {
        running = false;
        callbacks.onError('failed');
      }
    },
    stop: () => {
      if (!running) {
        callbacks.onFinal(finalText.trim());
        return;
      }
      /* onend fires the final delivery. */
      recognition.stop();
    },
    cancel: () => {
      delivered = true;
      running = false;
      recognition.abort();
    },
    isSupported: true,
  };
};
