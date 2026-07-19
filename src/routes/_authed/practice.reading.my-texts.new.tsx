/* Add Text — /practice/reading/my-texts/new. Web port of ReadingAddTextView:
   five import sources (Paste / Photo OCR / PDF / AI Generate / Wikipedia
   Explore) + language/difficulty/focus/question/assistance setup. */
import { useMemo, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { useSaveReadingItem } from '@/hooks/useReadingItems';
import { useUid } from '@/hooks/useFolders';
import { ESSAY_LANGUAGES } from '@/lib/essayTypes';
import { extractTextFromImage, extractTextFromPDF } from '@/lib/readingImport';
import {
  exploreWikipedia,
  generateReadingText,
  READING_TEXT_LENGTHS,
  READING_TEXT_STYLES,
  type ReadingTextLength,
  type ReadingTextStyle,
} from '@/lib/readingGenerationService';
import {
  detectLevel,
  estimatedReadingMinutes,
  normalizeReadingText,
  readingPreview,
  readingWordCount,
} from '@/lib/readingTextAnalyzer';
import {
  assistanceToToggles,
  DEFAULT_ASSISTANCE,
  DEFAULT_QUESTION_TYPES,
  READING_ASSISTANCE_KEYS,
  READING_FOCUSES,
  READING_MANUAL_LEVELS,
  READING_QUESTION_TYPES,
  type ReadingAssistanceOptions,
} from '@/lib/readingTypes';
import type {
  ReadingDifficulty,
  ReadingFocus,
  ReadingLibraryItem,
  ReadingQuestionType,
  ReadingSourceType,
} from '@/lib/models';

type ImportSource = 'pasteText' | 'photo' | 'pdf' | 'generate' | 'explore';
const IMPORT_SOURCES: ImportSource[] = ['pasteText', 'photo', 'pdf', 'generate', 'explore'];

const SOURCE_TYPE_FOR: Record<ImportSource, ReadingSourceType> = {
  pasteText: 'pastedText',
  photo: 'photoImport',
  pdf: 'pdfImport',
  generate: 'aiGenerated',
  explore: 'exploredArticle',
};

export const Route = createFileRoute('/_authed/practice/reading/my-texts/new')({
  component: AddTextScreen,
});

/** iOS title suggestion: first non-empty line, ≤48 chars (else 45 + …). */
const suggestTitle = (content: string): string => {
  const firstLine = content.split('\n').find((l) => l.trim().length > 0)?.trim() ?? '';
  if (firstLine.length <= 48) return firstLine;
  return `${firstLine.slice(0, 45)}…`;
};

const sectionTitle =
  'text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)';

const pill = (selected: boolean) =>
  `h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    selected
      ? 'border-(--color-primary-blue)/35 bg-(--color-primary-blue)/8 text-(--color-primary-blue-dark)'
      : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
  }`;

function AddTextScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUid();
  const saveItem = useSaveReadingItem();

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [languageId, setLanguageId] = useState('english');
  const [source, setSource] = useState<ImportSource>('pasteText');
  /** Effective source of the CURRENT content (a generate/import fills this). */
  const [contentSource, setContentSource] = useState<ImportSource>('pasteText');
  const [sourceMeta, setSourceMeta] = useState<Record<string, string>>({});
  const [importBusy, setImportBusy] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [genTopic, setGenTopic] = useState('');
  const [genStyle, setGenStyle] = useState<ReadingTextStyle>('informative');
  const [genLength, setGenLength] = useState<ReadingTextLength>('medium');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [difficultyMode, setDifficultyMode] = useState<'autoDetect' | 'manual'>('autoDetect');
  const [manualLevel, setManualLevel] = useState<ReadingDifficulty>('B1');
  const [focus, setFocus] = useState<ReadingFocus>('mainIdea');
  const [questionTypes, setQuestionTypes] = useState<ReadingQuestionType[]>(DEFAULT_QUESTION_TYPES);
  const [assistance, setAssistance] = useState<ReadingAssistanceOptions>(DEFAULT_ASSISTANCE);
  const [validation, setValidation] = useState<'empty' | 'tooShort' | null>(null);

  const wordCount = useMemo(() => readingWordCount(content), [content]);
  const detected = useMemo(
    () => (content.trim().length > 0 ? detectLevel(content) : 'A1'),
    [content],
  );

  const toggleQuestionType = (type: ReadingQuestionType) => {
    setQuestionTypes((prev) => {
      if (prev.includes(type)) {
        return prev.length > 1 ? prev.filter((qt) => qt !== type) : prev;
      }
      return [...prev, type];
    });
  };

  const goBack = () => void navigate({ to: '/practice/reading/my-texts' });

  /* iOS applyImportedText: set editor content + remember its source. */
  const applyImported = (text: string, from: ImportSource, meta: Record<string, string>) => {
    setContent(text);
    setContentSource(from);
    setSourceMeta(meta);
    setImportError(null);
  };

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;
    setImportBusy(true);
    setImportProgress(0);
    setImportError(null);
    try {
      const text = await extractTextFromImage(file, (ratio) => setImportProgress(ratio));
      applyImported(text, 'photo', { 'source.fileName': file.name });
    } catch {
      setImportError(t('reading.addText.import.imageError'));
    } finally {
      setImportBusy(false);
      setImportProgress(null);
    }
  };

  const handlePDFFile = async (file: File | undefined) => {
    if (!file) return;
    setImportBusy(true);
    setImportError(null);
    try {
      const text = await extractTextFromPDF(file);
      applyImported(text, 'pdf', { 'source.fileName': file.name });
    } catch {
      setImportError(t('reading.addText.import.pdfError'));
    } finally {
      setImportBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (genTopic.trim().length === 0 || importBusy) return;
    setImportBusy(true);
    setImportError(null);
    try {
      const level: ReadingDifficulty = difficultyMode === 'manual' ? manualLevel : 'B1';
      const result = await generateReadingText({
        topic: genTopic,
        languageId,
        level,
        length: genLength,
        style: genStyle,
        focus,
      });
      applyImported(result.body, 'generate', {
        'source.topic': result.topic,
        'source.style': genStyle,
        'source.generatedByAI': 'true',
      });
      if (title.trim().length === 0) setTitle(result.title);
    } catch {
      setImportError(t('reading.addText.import.generateError'));
    } finally {
      setImportBusy(false);
    }
  };

  const handleExplore = async () => {
    if (genTopic.trim().length === 0 || importBusy) return;
    setImportBusy(true);
    setImportError(null);
    try {
      const result = await exploreWikipedia(genTopic, languageId);
      applyImported(result.body, 'explore', {
        'source.topic': result.topic,
        'source.originalSourceURL': result.sourceURL,
        'source.sourceLabel': 'Wikipedia',
      });
      if (title.trim().length === 0) setTitle(result.title);
    } catch {
      setImportError(t('reading.addText.import.exploreError'));
    } finally {
      setImportBusy(false);
    }
  };

  const handleSave = (start: boolean) => {
    if (content.trim().length === 0) {
      setValidation('empty');
      return;
    }
    if (wordCount < 20) {
      setValidation('tooShort');
      return;
    }
    setValidation(null);

    const normalized = normalizeReadingText(content);
    const finalWordCount = readingWordCount(normalized);
    const detectedLevel = detectLevel(normalized);
    const now = Date.now();
    const item: ReadingLibraryItem = {
      id: crypto.randomUUID(),
      ownerUID: uid as string,
      modeID: 'my-texts',
      title: title.trim() || suggestTitle(normalized) || t('reading.addText.untitled'),
      preview: readingPreview(normalized, 120),
      fullText: normalized,
      difficulty: difficultyMode === 'manual' ? manualLevel : detectedLevel,
      estimatedMinutes: estimatedReadingMinutes(finalWordCount),
      createdAt: now,
      updatedAt: now,
      progress: 0,
      tags: [],
      sourceType: SOURCE_TYPE_FOR[contentSource],
      status: start ? 'inProgress' : 'new',
      selections: {
        manualDifficulty: difficultyMode === 'manual' ? manualLevel : '',
        detectedDifficulty: detectedLevel,
        ...sourceMeta,
      },
      toggles: assistanceToToggles(assistance),
      languageCode: languageId,
      wordCount: finalWordCount,
      characterCount: normalized.length,
      detectedDifficulty: detectedLevel,
      readingFocus: focus,
      enabledQuestionTypes: [...questionTypes].sort(),
      lastReadCharacterIndex: 0,
    };
    saveItem.mutate(item, {
      onSuccess: () => {
        if (start) {
          void navigate({
            to: '/practice/reading/session/$itemId',
            params: { itemId: item.id },
          });
        } else {
          goBack();
        }
      },
    });
  };

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('reading.addText.title')}
        subtitle={t('reading.addText.subtitle')}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={goBack}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {t('reading.myTexts.title')}
        </button>

        {/* Import source */}
        <div className="flex flex-wrap gap-1.5">
          {IMPORT_SOURCES.map((s) => (
            <button key={s} type="button" onClick={() => setSource(s)} className={pill(source === s)}>
              {t(`reading.addText.source.${s}`)}
            </button>
          ))}
        </div>

        {source === 'photo' && (
          <div className="flex flex-col gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white p-4">
            <p className="text-[13px] font-medium text-(--color-text-secondary)">
              {t('reading.addText.import.photoHint')}
            </p>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleImageFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={importBusy}
              onClick={() => imageInputRef.current?.click()}
              className="h-11 w-fit rounded-2xl border border-(--color-primary-blue)/35 bg-white px-5 text-[14px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/5 disabled:opacity-60"
            >
              {importBusy
                ? t('reading.addText.import.recognizing', {
                    percent: Math.round((importProgress ?? 0) * 100),
                  })
                : t('reading.addText.import.chooseImage')}
            </button>
          </div>
        )}

        {source === 'pdf' && (
          <div className="flex flex-col gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white p-4">
            <p className="text-[13px] font-medium text-(--color-text-secondary)">
              {t('reading.addText.import.pdfHint')}
            </p>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => void handlePDFFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={importBusy}
              onClick={() => pdfInputRef.current?.click()}
              className="h-11 w-fit rounded-2xl border border-(--color-primary-blue)/35 bg-white px-5 text-[14px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/5 disabled:opacity-60"
            >
              {importBusy
                ? t('reading.addText.import.reading')
                : t('reading.addText.import.choosePDF')}
            </button>
          </div>
        )}

        {(source === 'generate' || source === 'explore') && (
          <div className="flex flex-col gap-3 rounded-2xl border border-(--color-auth-field-border) bg-white p-4">
            <input
              value={genTopic}
              onChange={(e) => setGenTopic(e.target.value)}
              placeholder={t(
                source === 'generate'
                  ? 'reading.addText.import.topicPlaceholder'
                  : 'reading.addText.import.explorePlaceholder',
              )}
              className="w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[14px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
            />
            {source === 'generate' && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {READING_TEXT_STYLES.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setGenStyle(style)}
                      className={pill(genStyle === style)}
                    >
                      {t(`reading.addText.style.${style}`)}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex flex-wrap gap-1.5">
              {READING_TEXT_LENGTHS.map((length) => (
                <button
                  key={length}
                  type="button"
                  onClick={() => setGenLength(length)}
                  className={pill(genLength === length)}
                >
                  {t(`reading.addText.length.${length}`)}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={importBusy || genTopic.trim().length === 0}
              onClick={() => void (source === 'generate' ? handleGenerate() : handleExplore())}
              className="h-11 w-fit rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-5 text-[14px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
            >
              {importBusy
                ? t('reading.addText.import.working')
                : t(
                    source === 'generate'
                      ? 'reading.addText.import.generateButton'
                      : 'reading.addText.import.exploreButton',
                  )}
            </button>
            {contentSource === 'explore' && sourceMeta['source.originalSourceURL'] && (
              <p className="text-[12px] font-medium text-[#15803D]">
                {t('reading.addText.import.exploredFrom')}{' '}
                <a
                  href={sourceMeta['source.originalSourceURL']}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Wikipedia
                </a>
              </p>
            )}
          </div>
        )}

        {importError && (
          <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
            {importError}
          </p>
        )}

        {/* Text */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('reading.addText.pastePlaceholder')}
          rows={8}
          className="w-full resize-y rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-medium leading-relaxed text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
        />

        {/* Stats chips */}
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-(--color-goal-bg) px-2.5 py-1 text-[12px] font-bold text-(--color-text-secondary)">
            {t('reading.addText.stats.words', { count: wordCount })}
          </span>
          <span className="rounded-full bg-(--color-goal-bg) px-2.5 py-1 text-[12px] font-bold text-(--color-text-secondary)">
            {t('reading.addText.stats.chars', { count: content.length })}
          </span>
          <span className="rounded-full bg-(--color-goal-bg) px-2.5 py-1 text-[12px] font-bold text-(--color-text-secondary)">
            ~{estimatedReadingMinutes(wordCount)} {t('reading.addText.stats.min')}
          </span>
          {content.trim().length > 0 && (
            <span className="rounded-full bg-[#21A8BD]/12 px-2.5 py-1 text-[12px] font-bold text-[#21A8BD]">
              {t('reading.addText.stats.detected', { level: detected })}
            </span>
          )}
        </div>

        {/* Title */}
        <label className="flex flex-col gap-1.5">
          <span className={sectionTitle}>{t('reading.addText.titleLabel')}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('reading.addText.titlePlaceholder')}
            className="w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-semibold text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
          />
        </label>

        {/* Language */}
        <div className="flex flex-col gap-1.5">
          <span className={sectionTitle}>{t('reading.addText.language')}</span>
          <div className="flex flex-wrap gap-1.5">
            {ESSAY_LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setLanguageId(lang.id)}
                className={pill(languageId === lang.id)}
              >
                {lang.title}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-1.5">
          <span className={sectionTitle}>{t('reading.addText.difficulty')}</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setDifficultyMode('autoDetect')}
              className={pill(difficultyMode === 'autoDetect')}
            >
              {t('reading.addText.autoDetect')}
            </button>
            <button
              type="button"
              onClick={() => setDifficultyMode('manual')}
              className={pill(difficultyMode === 'manual')}
            >
              {t('reading.addText.manual')}
            </button>
          </div>
          {difficultyMode === 'manual' && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {READING_MANUAL_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setManualLevel(level)}
                  className={pill(manualLevel === level)}
                >
                  {level}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reading focus */}
        <div className="flex flex-col gap-1.5">
          <span className={sectionTitle}>{t('reading.addText.focus')}</span>
          <div className="flex flex-wrap gap-1.5">
            {READING_FOCUSES.map((f) => (
              <button key={f} type="button" onClick={() => setFocus(f)} className={pill(focus === f)}>
                {t(`reading.focus.${f}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Question types */}
        <div className="flex flex-col gap-1.5">
          <span className={sectionTitle}>{t('reading.addText.questionTypes')}</span>
          <div className="flex flex-wrap gap-1.5">
            {READING_QUESTION_TYPES.map((qt) => (
              <button
                key={qt}
                type="button"
                onClick={() => toggleQuestionType(qt)}
                className={pill(questionTypes.includes(qt))}
              >
                {t(`reading.questionType.${qt}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Assistance */}
        <div className="flex flex-col gap-1.5">
          <span className={sectionTitle}>{t('reading.addText.assistance')}</span>
          <div className="flex flex-col gap-2">
            {READING_ASSISTANCE_KEYS.map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3"
              >
                <span className="text-[14px] font-semibold text-(--color-primary-blue-dark)">
                  {t(`reading.assistance.${key}`)}
                </span>
                <input
                  type="checkbox"
                  checked={assistance[key]}
                  onChange={(e) =>
                    setAssistance((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                  className="size-5 accent-(--color-primary-blue)"
                />
              </label>
            ))}
          </div>
        </div>

        {validation && (
          <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
            {t(`reading.addText.validation.${validation}`)}
          </p>
        )}

        <div className="flex flex-col gap-2 md:flex-row">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saveItem.isPending}
            className="h-12 flex-1 rounded-2xl border border-(--color-primary-blue)/35 bg-white text-[15px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/5 disabled:opacity-60"
          >
            {t('reading.addText.save')}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saveItem.isPending}
            className="h-12 flex-1 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
          >
            {saveItem.isPending ? t('reading.addText.saving') : t('reading.addText.saveAndStart')}
          </button>
        </div>

        {saveItem.isError && (
          <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
            {t('reading.addText.saveError')}
          </p>
        )}
      </div>
    </ContentContainer>
  );
}
