/* The constructor: a test's title, language and optional timer, then its
   sections — reading (a text and questions) or listening (a text the site
   reads aloud, or an uploaded recording, and questions). Questions use the
   same form as grammar quizzes. Nothing is checked until Save, and then every
   problem is listed at once instead of one at a time. */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CARD, FIELD, PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from '@/components/exams/ui';
import { ManualQuestionForm } from '@/components/grammar/ManualQuestionForm';
import { LanguagePicker } from '@/components/practice/LanguagePicker';
import { Icon } from '@/components/primitives/Icon';
import { useUid } from '@/hooks/useFolders';
import { AudioUploadError, uploadTestAudio } from '@/lib/customTests/customTestStorage';
import {
  MAX_TIME_LIMIT_MINUTES,
  newSection,
  SECTION_KINDS,
  testProblems,
  type CustomQuestion,
  type CustomSection,
  type CustomTest,
  type ListeningSection,
  type TestProblem,
} from '@/lib/customTests/model';

import { answerLabel, SECTION_ICONS } from './display';
import { ListeningPlayer } from './ListeningPlayer';

interface TestEditorProps {
  initial: CustomTest;
  isSaving: boolean;
  saveFailed: boolean;
  onSave: (test: CustomTest) => void;
  onCancel: () => void;
}

const LABEL = 'text-[13px] font-semibold text-(--color-muted-text)';
const ICON_BUTTON =
  'grid size-9 place-items-center rounded-full text-(--color-text-secondary) transition-colors hover:bg-(--color-hover-wash) disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none';

export const TestEditor = ({ initial, isSaving, saveFailed, onSave, onCancel }: TestEditorProps) => {
  const { t } = useTranslation();
  const [test, setTest] = useState<CustomTest>(initial);
  const [timerOn, setTimerOn] = useState(initial.timeLimitMinutes !== null);
  const [minutes, setMinutes] = useState(String(initial.timeLimitMinutes ?? 60));
  const [problems, setProblems] = useState<TestProblem[]>([]);
  const [uploading, setUploading] = useState(0);

  const patch = (values: Partial<CustomTest>) => setTest((prev) => ({ ...prev, ...values }));
  const patchSection = (id: string, update: (s: CustomSection) => CustomSection) =>
    setTest((prev) => ({ ...prev, sections: prev.sections.map((s) => (s.id === id ? update(s) : s)) }));
  const moveSection = (index: number, by: -1 | 1) =>
    setTest((prev) => {
      const sections = [...prev.sections];
      const [moved] = sections.splice(index, 1);
      sections.splice(index + by, 0, moved);
      return { ...prev, sections };
    });

  const save = () => {
    const parsed = Number(minutes);
    const candidate: CustomTest = {
      ...test,
      title: test.title.trim(),
      description: test.description.trim(),
      timeLimitMinutes: timerOn ? (Number.isFinite(parsed) ? parsed : 0) : null,
    };
    const found = testProblems(candidate);
    setProblems(found);
    if (found.length === 0) onSave(candidate);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className={`${CARD} flex flex-col gap-4`}>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t('exams.custom.editor.title')}</span>
          <input
            value={test.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder={t('exams.custom.editor.titlePlaceholder')}
            maxLength={120}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t('exams.custom.editor.description')}</span>
          <textarea
            value={test.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder={t('exams.custom.editor.descriptionPlaceholder')}
            rows={2}
            maxLength={1000}
            className={`${FIELD} resize-y`}
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>{t('exams.custom.editor.language')}</span>
          <LanguagePicker value={test.languageId} onChange={(languageId) => patch({ languageId })} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={timerOn}
              onChange={(e) => setTimerOn(e.target.checked)}
              className="size-5 accent-(--color-primary-blue)"
            />
            <span className="text-[15px] font-semibold text-(--color-primary-blue-dark)">
              {t('exams.custom.editor.timer')}
            </span>
          </label>
          {timerOn && (
            <label className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={MAX_TIME_LIMIT_MINUTES}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                aria-label={t('exams.custom.editor.minutes')}
                className={`${FIELD} w-24 py-2`}
              />
              <span className="text-[14px] font-semibold text-(--color-text-secondary)">
                {t('exams.custom.editor.minutes')}
              </span>
            </label>
          )}
        </div>
      </section>

      {test.sections.map((section, index) => (
        <SectionEditor
          key={section.id}
          testId={test.id}
          section={section}
          number={index + 1}
          languageId={test.languageId}
          isFirst={index === 0}
          isLast={index === test.sections.length - 1}
          onChange={(update) => patchSection(section.id, update)}
          onMove={(by) => moveSection(index, by)}
          onRemove={() => patch({ sections: test.sections.filter((s) => s.id !== section.id) })}
          onUploading={(busy) => setUploading((n) => n + (busy ? 1 : -1))}
        />
      ))}

      <section className={`${CARD} flex flex-col gap-3`}>
        <h2 className={SECTION_TITLE}>{t('exams.custom.editor.addSection')}</h2>
        <div className="flex flex-wrap gap-2.5">
          {SECTION_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className={SECONDARY_BUTTON}
              onClick={() => patch({ sections: [...test.sections, newSection(kind)] })}
            >
              <Icon name={SECTION_ICONS[kind]} className="size-5 text-(--color-primary-blue)" />
              {t(`exams.custom.kind.${kind}`)}
            </button>
          ))}
        </div>
        <p className="text-[13px] font-medium text-(--color-muted-text)">{t('exams.custom.editor.moreKindsSoon')}</p>
      </section>

      {problems.length > 0 && (
        <div role="alert" className="rounded-2xl border border-(--color-cs-red)/40 bg-(--color-cs-red)/8 px-4 py-3">
          <p className="text-[15px] font-bold text-(--color-cs-red)">{t('exams.custom.editor.fixFirst')}</p>
          <ul className="mt-1 list-disc pl-5 text-[14px] font-medium text-(--color-primary-blue-dark)">
            {problems.map((p, i) => (
              <li key={i}>{t(`exams.custom.problem.${p.code}`, 'section' in p ? { n: p.section } : {})}</li>
            ))}
          </ul>
        </div>
      )}
      {saveFailed && (
        <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
          {t('exams.custom.editor.saveFailed')}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className={PRIMARY_BUTTON} onClick={save} disabled={isSaving || uploading > 0}>
          {isSaving ? t('exams.custom.editor.saving') : t('common.save')}
        </button>
        <button type="button" className={SECONDARY_BUTTON} onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
};

interface SectionEditorProps {
  testId: string;
  section: CustomSection;
  number: number;
  languageId: string;
  isFirst: boolean;
  isLast: boolean;
  onChange: (update: (s: CustomSection) => CustomSection) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  onUploading: (busy: boolean) => void;
}

const SectionEditor = ({
  testId,
  section,
  number,
  languageId,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
  onUploading,
}: SectionEditorProps) => {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);

  const setQuestions = (update: (qs: CustomQuestion[]) => CustomQuestion[]) =>
    onChange((s) => ({ ...s, questions: update(s.questions).map((q, i) => ({ ...q, order: i })) }));

  return (
    <section className={`${CARD} flex flex-col gap-4`} aria-label={t('exams.custom.editor.sectionN', { n: number })}>
      <header className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-(--color-primary-blue)/12">
          <Icon name={SECTION_ICONS[section.kind]} className="size-5 text-(--color-primary-blue)" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={LABEL}>{t('exams.custom.editor.sectionN', { n: number })}</span>
          <span className={SECTION_TITLE}>{t(`exams.custom.kind.${section.kind}`)}</span>
        </div>
        <button type="button" className={ICON_BUTTON} disabled={isFirst} onClick={() => onMove(-1)} aria-label={t('exams.custom.editor.moveUp')}>
          <Icon name="arrow.up" className="size-4" />
        </button>
        <button type="button" className={ICON_BUTTON} disabled={isLast} onClick={() => onMove(1)} aria-label={t('exams.custom.editor.moveDown')}>
          <Icon name="arrow.down" className="size-4" />
        </button>
        <button type="button" className={ICON_BUTTON} onClick={onRemove} aria-label={t('exams.custom.editor.removeSection')}>
          <Icon name="trash.fill" className="size-4 text-(--color-cs-red)" />
        </button>
      </header>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>{t('exams.custom.editor.sectionTitle')}</span>
        <input
          value={section.title}
          onChange={(e) => onChange((s) => ({ ...s, title: e.target.value }))}
          placeholder={t('exams.custom.editor.sectionTitlePlaceholder')}
          maxLength={120}
          className={FIELD}
        />
      </label>

      {section.kind === 'reading' ? (
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t('exams.custom.editor.readingText')}</span>
          <textarea
            value={section.text}
            onChange={(e) => onChange((s) => (s.kind === 'reading' ? { ...s, text: e.target.value } : s))}
            placeholder={t('exams.custom.editor.readingTextPlaceholder')}
            rows={8}
            maxLength={20000}
            className={`${FIELD} resize-y leading-relaxed`}
          />
        </label>
      ) : (
        <ListeningSource
          testId={testId}
          section={section}
          languageId={languageId}
          onChange={(update) => onChange((s) => (s.kind === 'listening' ? update(s) : s))}
          onUploading={onUploading}
        />
      )}

      <div className="flex flex-col gap-2.5">
        <h3 className="text-[15px] font-bold text-(--color-primary-blue-dark)">
          {t('exams.custom.editor.questions', { count: section.questions.length })}
        </h3>
        {section.questions.map((question, i) =>
          editingId === question.id ? (
            <ManualQuestionForm
              key={question.id}
              order={i}
              initial={question}
              submitLabel={t('common.save')}
              onCancel={() => setEditingId(null)}
              onAdd={(updated) => {
                setQuestions((qs) => qs.map((q) => (q.id === updated.id ? updated : q)));
                setEditingId(null);
              }}
            />
          ) : (
            <div
              key={question.id}
              className="flex items-start gap-3 rounded-2xl border border-(--color-surface-border) bg-(--color-surface) px-4 py-3"
            >
              <span className="pt-0.5 text-[14px] font-bold text-(--color-muted-text)">{i + 1}.</span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-semibold break-words text-(--color-primary-blue-dark)">
                  {question.questionText}
                </span>
                <span className="text-[13px] font-medium text-(--color-text-secondary)">
                  {t(`writing.grammar.quiz.type.${question.type}`)} ·{' '}
                  {t('exams.custom.editor.answerIs', { answer: answerLabel(question, t) })}
                </span>
              </div>
              <button type="button" className={ICON_BUTTON} onClick={() => setEditingId(question.id)} aria-label={t('exams.custom.editor.editQuestion')}>
                <Icon name="square.and.pencil" className="size-4" />
              </button>
              <button
                type="button"
                className={ICON_BUTTON}
                onClick={() => setQuestions((qs) => qs.filter((q) => q.id !== question.id))}
                aria-label={t('exams.custom.editor.removeQuestion')}
              >
                <Icon name="trash.fill" className="size-4 text-(--color-cs-red)" />
              </button>
            </div>
          ),
        )}
        <ManualQuestionForm order={section.questions.length} onAdd={(q) => setQuestions((qs) => [...qs, q])} />
      </div>
    </section>
  );
};

const ListeningSource = ({
  testId,
  section,
  languageId,
  onChange,
  onUploading,
}: {
  testId: string;
  section: ListeningSection;
  languageId: string;
  onChange: (update: (s: ListeningSection) => ListeningSection) => void;
  onUploading: (busy: boolean) => void;
}) => {
  const { t } = useTranslation();
  const uid = useUid();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /* Remember the typed text while a file is chosen, so switching back is not a loss. */
  const [ttsText, setTtsText] = useState(section.audio.source === 'tts' ? section.audio.text : '');
  const { audio } = section;

  const upload = async (file: File) => {
    if (!uid) return;
    setUploadError(null);
    setBusy(true);
    onUploading(true);
    try {
      const uploaded = await uploadTestAudio(uid, testId, section.id, file);
      onChange((s) => ({ ...s, audio: uploaded }));
    } catch (error) {
      const code = error instanceof AudioUploadError ? error.code : 'failed';
      setUploadError(t(`exams.custom.editor.upload.${code}`));
    } finally {
      setBusy(false);
      onUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('exams.custom.editor.audioSource')}>
        {(['tts', 'file'] as const).map((source) => {
          const selected = audio.source === source;
          return (
            <button
              key={source}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                if (source === 'tts') onChange((s) => ({ ...s, audio: { source: 'tts', text: ttsText } }));
                else if (audio.source === 'tts') onChange((s) => ({ ...s, audio: { source: 'file', url: '', path: '', name: '' } }));
              }}
              className={`rounded-full border px-4 py-2 text-[14px] font-bold transition-colors ${
                selected
                  ? 'border-(--color-primary-blue) bg-(--color-primary-blue)/10 text-(--color-primary-blue-dark)'
                  : 'border-(--color-surface-border) text-(--color-text-secondary) hover:bg-(--color-hover-wash)'
              }`}
            >
              {t(`exams.custom.editor.source.${source}`)}
            </button>
          );
        })}
      </div>

      {audio.source === 'tts' ? (
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t('exams.custom.editor.ttsText')}</span>
          <textarea
            value={audio.text}
            onChange={(e) => {
              setTtsText(e.target.value);
              onChange((s) => ({ ...s, audio: { source: 'tts', text: e.target.value } }));
            }}
            placeholder={t('exams.custom.editor.ttsPlaceholder')}
            rows={6}
            maxLength={10000}
            className={`${FIELD} resize-y leading-relaxed`}
          />
          <span className="text-[13px] font-medium text-(--color-muted-text)">{t('exams.custom.editor.ttsHint')}</span>
        </label>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void upload(file);
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={SECONDARY_BUTTON} disabled={busy} onClick={() => fileRef.current?.click()}>
              <Icon name="waveform.badge.plus" className="size-5 text-(--color-primary-blue)" />
              {busy
                ? t('exams.custom.editor.uploading')
                : audio.url
                  ? t('exams.custom.editor.replaceFile')
                  : t('exams.custom.editor.chooseFile')}
            </button>
            {audio.name && !busy && (
              <span className="text-[14px] font-semibold break-all text-(--color-primary-blue-dark)">{audio.name}</span>
            )}
          </div>
          <span className="text-[13px] font-medium text-(--color-muted-text)">{t('exams.custom.editor.fileHint')}</span>
          {uploadError && (
            <p role="alert" className="text-[13px] font-semibold text-(--color-cs-red)">
              {uploadError}
            </p>
          )}
        </div>
      )}

      {(audio.source === 'tts' ? audio.text.trim().length > 0 : audio.url.length > 0) && (
        <ListeningPlayer audio={audio} languageId={languageId} maxPlays={null} />
      )}

      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>{t('exams.custom.editor.plays')}</span>
        <select
          value={section.maxPlays === null ? '' : String(section.maxPlays)}
          onChange={(e) => onChange((s) => ({ ...s, maxPlays: e.target.value === '' ? null : Number(e.target.value) }))}
          className={`${FIELD} max-w-[320px]`}
        >
          <option value="">{t('exams.custom.editor.playsUnlimited')}</option>
          <option value="1">{t('exams.custom.editor.playsOnce')}</option>
          <option value="2">{t('exams.custom.editor.playsTwice')}</option>
        </select>
      </label>
    </div>
  );
};
