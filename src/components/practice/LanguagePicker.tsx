/* Language chooser for the practice-setup screens. Thirty languages as pills
   took six rows and pushed everything else off the first screen, so this is a
   dropdown — a custom listbox rather than a native <select>, because a native
   popup is drawn by the OS and keeps the system highlight whatever the page
   asks for.

   It also tells the truth about speech: asking for cs-CZ does not mean the
   browser can speak it, and a session that silently switches to an English
   voice is worse than a line of warning. */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretDown, Check, MagnifyingGlass, Warning } from '@phosphor-icons/react';

import { ESSAY_LANGUAGES } from '@/lib/essayTypes';
import { hasVoiceForLanguage } from '@/lib/speakingTypes';

interface LanguagePickerProps {
  value: string;
  onChange: (id: string) => void;
  accent?: string;
  accentDark?: string;
  /** Set on screens that speak aloud, so a missing voice is surfaced. */
  warnMissingVoice?: boolean;
}

const withAlpha = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/* Chrome fills the voice list asynchronously and fires voiceschanged when it
   does; without listening, the first render always looks voice-less. */
const useVoiceAvailable = (languageId: string, enabled: boolean): boolean | null => {
  const [available, setAvailable] = useState<boolean | null>(() =>
    enabled ? hasVoiceForLanguage(languageId) : true,
  );

  useEffect(() => {
    if (!enabled) {
      setAvailable(true);
      return;
    }
    const check = () => setAvailable(hasVoiceForLanguage(languageId));
    check();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.addEventListener('voiceschanged', check);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', check);
  }, [languageId, enabled]);

  return available;
};

export const LanguagePicker = ({
  value,
  onChange,
  accent,
  accentDark,
  warnMissingVoice = false,
}: LanguagePickerProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const a = accent ?? 'var(--color-primary-blue)';
  const aDark = accentDark ?? 'var(--color-primary-blue-dark)';

  const selected = ESSAY_LANGUAGES.find((l) => l.id === value) ?? ESSAY_LANGUAGES[0];
  const voiceAvailable = useVoiceAvailable(value, warnMissingVoice);

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? ESSAY_LANGUAGES.filter((l) => l.title.toLowerCase().includes(needle))
    : ESSAY_LANGUAGES;

  useEffect(() => {
    if (!isOpen) return;
    searchRef.current?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const pick = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <div ref={rootRef} className="relative w-full max-w-[320px]">
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={t('practice.language.label')}
          onClick={() => setIsOpen((open) => !open)}
          className="flex h-11 w-full items-center justify-between gap-3 rounded-full border px-5 text-[14px] font-bold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            background: withAlpha(a, 10),
            borderColor: isOpen ? a : withAlpha(a, 22),
            color: aDark,
          }}
        >
          <span className="truncate">{selected.title}</span>
          <CaretDown
            size={14}
            weight="bold"
            className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div
            className="absolute top-[calc(100%+6px)] right-0 left-0 z-30 flex max-h-[320px] flex-col overflow-hidden rounded-2xl border bg-white"
            style={{ borderColor: withAlpha(a, 22), boxShadow: `0 12px 28px ${withAlpha(a, 22)}` }}
          >
            <div
              className="flex items-center gap-2 border-b px-3.5 py-2.5"
              style={{ borderColor: withAlpha(a, 14) }}
            >
              <MagnifyingGlass size={14} weight="bold" style={{ color: a }} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('practice.language.search')}
                autoComplete="off"
                spellCheck={false}
                className="w-full min-w-0 bg-transparent text-[14px] font-medium outline-none"
                style={{ color: aDark }}
              />
            </div>

            <ul role="listbox" aria-label={t('practice.language.label')} className="overflow-y-auto p-1.5">
              {matches.length === 0 && (
                <li className="px-3 py-3 text-[14px] font-medium text-(--color-text-secondary)">
                  {t('practice.language.noMatch')}
                </li>
              )}
              {matches.map((language) => {
                const isSelected = language.id === value;
                return (
                  <li key={language.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => pick(language.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] transition-colors ${
                        isSelected ? 'font-bold' : 'font-medium hover:bg-black/[0.03]'
                      }`}
                      style={
                        isSelected
                          ? { background: withAlpha(a, 12), color: aDark }
                          : { color: 'var(--color-cs-dark-text)' }
                      }
                    >
                      <span className="truncate">{language.title}</span>
                      {isSelected && <Check size={14} weight="bold" style={{ color: a }} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {warnMissingVoice && voiceAvailable === false && (
        <p className="flex items-start gap-1.5 text-[12px] font-medium text-(--color-text-secondary)">
          <Warning size={14} weight="fill" className="mt-px shrink-0 text-(--color-orange-accent)" />
          <span>{t('practice.language.noVoice', { language: selected.title })}</span>
        </p>
      )}
    </div>
  );
};
