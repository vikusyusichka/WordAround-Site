/* Notes settings — /notes/settings. Web port of GrammarNotesSettingsView:
   five sections of switches plus the default note type, all persisted per
   device by the grammar settings store (iOS UserDefaults keys). Static
   segment, so it wins over /notes/$topicId. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { BackLink } from '@/components/shell/BackLink';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { NOTE_TYPES, NOTE_TYPE_META } from '@/lib/grammarMeta';
import {
  useGrammarSettings,
  type GrammarSettings,
} from '@/stores/grammarSettingsStore';

export const Route = createFileRoute('/_authed/notes/settings')({
  component: NotesSettings,
});

type ToggleKey = keyof Omit<GrammarSettings, 'defaultNoteType'>;

interface SectionDef {
  id: string;
  icon: string;
  tint: string;
  toggles: { key: ToggleKey; icon: string; tint: string }[];
}

const SECTIONS: SectionDef[] = [
  {
    id: 'quickCapture',
    icon: 'bolt.fill',
    tint: '#4F7CFF',
    toggles: [
      { key: 'opensEditorAfterQuickSave', icon: 'arrow.right.circle.fill', tint: '#4F7CFF' },
      { key: 'allowQuickQuizzes', icon: 'questionmark.circle.fill', tint: '#7C5CFF' },
      { key: 'showsMistakeHighlights', icon: 'exclamationmark.triangle.fill', tint: '#F4729A' },
    ],
  },
  {
    id: 'mistakeNotes',
    icon: 'exclamationmark.bubble.fill',
    tint: '#F4729A',
    toggles: [
      { key: 'includeOriginalSentence', icon: 'quote.opening', tint: '#F4729A' },
      { key: 'includeCorrectedSentence', icon: 'checkmark.circle.fill', tint: '#22C55E' },
      { key: 'createMistakeNotesWithExplanation', icon: 'lightbulb.fill', tint: '#F59E0B' },
      { key: 'groupMistakesByTopic', icon: 'folder.fill', tint: '#7C5CFF' },
    ],
  },
  {
    id: 'essays',
    icon: 'pencil.and.scribble',
    tint: '#38BDF8',
    toggles: [
      { key: 'saveGrammarMistakesAutomatically', icon: 'sparkles', tint: '#38BDF8' },
      { key: 'askBeforeSavingMistakes', icon: 'questionmark.circle.fill', tint: '#4F7CFF' },
    ],
  },
  {
    id: 'review',
    icon: 'brain.head.profile',
    tint: '#7C5CFF',
    toggles: [{ key: 'autoAddNotesToReview', icon: 'brain.head.profile', tint: '#7C5CFF' }],
  },
  {
    id: 'appearance',
    icon: 'list.bullet.rectangle.fill',
    tint: '#7C5CFF',
    toggles: [
      { key: 'groupsPinnedNotesFirst', icon: 'pin.fill', tint: '#7C5CFF' },
      { key: 'usesCompactCards', icon: 'list.bullet', tint: '#38BDF8' },
    ],
  },
  {
    id: 'helpers',
    icon: 'lightbulb.fill',
    tint: '#F59E0B',
    toggles: [{ key: 'showsHelperTips', icon: 'lightbulb.fill', tint: '#F59E0B' }],
  },
];

function NotesSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const settings = useGrammarSettings();

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('writing.grammar.settings.title')}
        subtitle={t('writing.grammar.settings.subtitle')}
        actions={
          <button
            type="button"
            onClick={() => settings.resetAll()}
            className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[14px] font-semibold text-(--color-text-secondary) transition-colors hover:bg-black/[0.03] focus-visible:outline-none md:text-[15px]"
          >
            {t('writing.grammar.settings.reset')}
          </button>
        }
      />

      <BackLink
        label={t('nav.notes')}
        onClick={() => void navigate({ to: '/notes' })}
        className="mb-4"
      />

      <div className="flex max-w-[760px] flex-col gap-5">
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            className="flex flex-col gap-3 rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)]"
          >
            <div className="flex items-center gap-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-2xl"
                style={{ background: `${section.tint}1F` }}
              >
                <Icon name={section.icon} className="size-5" style={{ color: section.tint }} />
              </span>
              <div className="flex min-w-0 flex-col">
                <h2 className="text-[16px] font-bold text-(--color-primary-blue-dark)">
                  {t(`writing.grammar.settings.${section.id}.title`)}
                </h2>
                <p className="text-[12px] font-semibold text-(--color-text-secondary)">
                  {t(`writing.grammar.settings.${section.id}.subtitle`)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {section.toggles.map(({ key, icon, tint }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-(--color-auth-field-border) px-4 py-3 transition-colors hover:bg-black/[0.02]"
                >
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-xl"
                    style={{ background: `${tint}1C` }}
                  >
                    <Icon name={icon} className="size-4" style={{ color: tint }} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[14px] font-bold text-(--color-primary-blue-dark)">
                      {t(`writing.grammar.settings.toggle.${key}.title`)}
                    </span>
                    <span className="text-[12px] font-semibold text-(--color-text-secondary)">
                      {t(`writing.grammar.settings.toggle.${key}.subtitle`)}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={() => settings.toggle(key)}
                    className="ml-auto size-5 shrink-0 accent-(--color-primary-blue)"
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        <section className="flex flex-col gap-3 rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
          <div className="flex items-center gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-2xl"
              style={{ background: `${NOTE_TYPE_META[settings.defaultNoteType].color}1F` }}
            >
              <Icon
                name={NOTE_TYPE_META[settings.defaultNoteType].icon}
                className="size-5"
                style={{ color: NOTE_TYPE_META[settings.defaultNoteType].color }}
              />
            </span>
            <div className="flex min-w-0 flex-col">
              <h2 className="text-[16px] font-bold text-(--color-primary-blue-dark)">
                {t('writing.grammar.settings.defaultType.title')}
              </h2>
              <p className="text-[12px] font-semibold text-(--color-text-secondary)">
                {t('writing.grammar.settings.defaultType.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {NOTE_TYPES.map((type) => {
              const meta = NOTE_TYPE_META[type];
              const isActive = settings.defaultNoteType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => settings.set('defaultNoteType', type)}
                  aria-pressed={isActive}
                  className="flex h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-bold transition-colors focus-visible:outline-none"
                  style={{
                    background: isActive ? `${meta.color}1C` : 'white',
                    borderColor: isActive ? meta.color : 'var(--color-auth-field-border)',
                    color: isActive ? meta.color : 'var(--color-text-secondary)',
                  }}
                >
                  <Icon name={meta.icon} className="size-[14px]" />
                  {t(`writing.grammar.noteType.${type}`)}
                </button>
              );
            })}
          </div>
        </section>

        {settings.showsHelperTips && (
          <p className="rounded-3xl bg-(--color-goal-bg) px-5 py-4 text-[13px] font-semibold text-(--color-text-secondary)">
            {t('writing.grammar.settings.tip')}
          </p>
        )}
      </div>
    </ContentContainer>
  );
}
