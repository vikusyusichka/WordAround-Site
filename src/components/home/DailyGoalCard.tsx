/* "What do you want to do today?" — the learner picks one skill and a target,
   and that becomes the goal the matching progress card counts against for the
   rest of the day. Reset at midnight by design (see lib/dailyGoal). */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import {
  GOAL_OPTIONS,
  clearTodayGoal,
  readTodayGoal,
  setTodayGoal,
  type DailyGoal,
} from '@/lib/dailyGoal';
import type { DailyPracticeSkill } from '@/lib/dailyPracticeStats';
import { CATEGORY_ICON } from '@/lib/homeTypes';

const SKILLS: DailyPracticeSkill[] = ['speaking', 'listening', 'reading', 'writing'];

const SKILL_LABEL: Record<DailyPracticeSkill, string> = {
  speaking: 'nav.speaking',
  listening: 'nav.listening',
  reading: 'nav.reading',
  writing: 'nav.writing',
};

interface DailyGoalCardProps {
  /** Lets the parent re-read the progress cards once the goal changes. */
  onChange?: () => void;
}

export const DailyGoalCard = ({ onChange }: DailyGoalCardProps) => {
  const { t } = useTranslation();
  const [goal, setGoal] = useState<DailyGoal | null>(() => readTodayGoal());
  /* Picking a skill shows its targets before anything is committed. */
  const [pending, setPending] = useState<DailyPracticeSkill | null>(null);

  const commit = (next: DailyGoal) => {
    setTodayGoal(next);
    setGoal(next);
    setPending(null);
    onChange?.();
  };

  const reset = () => {
    clearTodayGoal();
    setGoal(null);
    setPending(null);
    onChange?.();
  };

  return (
    <section className="flex w-full flex-col gap-4 rounded-[22px] border border-white/95 bg-white/85 p-5 shadow-[0_6px_10px_rgba(0,0,0,0.035)] md:rounded-[30px] md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-bold text-(--color-primary-blue-dark) md:text-[21px]">
            {t('home.dailyGoal.title')}
          </h2>
          <p className="text-[14px] font-medium text-(--color-text-secondary) md:text-[15px]">
            {goal ? t('home.dailyGoal.chosenBody') : t('home.dailyGoal.body')}
          </p>
        </div>

        {goal && (
          <button
            type="button"
            onClick={reset}
            className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-home-nav-sel-bg) focus-visible:outline-none md:text-[14px]"
          >
            {t('home.dailyGoal.change')}
          </button>
        )}
      </div>

      {goal ? (
        <ChosenGoal goal={goal} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {SKILLS.map((skill) => {
              const isOpen = pending === skill;
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setPending(skill)}
                  aria-pressed={isOpen}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-[14px] font-semibold transition-colors focus-visible:outline-none ${
                    isOpen
                      ? 'border-(--color-primary-blue) bg-(--color-home-nav-sel-bg) text-(--color-primary-blue)'
                      : 'border-(--color-auth-field-border) bg-white text-(--color-cs-text-muted) hover:bg-black/[0.02]'
                  }`}
                >
                  <Icon name={CATEGORY_ICON[skill]} className="size-[18px] shrink-0" />
                  <span className="truncate">{t(SKILL_LABEL[skill])}</span>
                </button>
              );
            })}
          </div>

          {pending && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold text-(--color-text-secondary)">
                {t('home.dailyGoal.howMuch')}
              </span>
              {GOAL_OPTIONS[pending].map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => commit({ skill: pending, target })}
                  className="rounded-full bg-(--color-primary-blue) px-4 py-2 text-[14px] font-semibold text-white transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:outline-none"
                >
                  {target} {t(pending === 'writing' ? 'units.words' : 'units.min')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const ChosenGoal = ({ goal }: { goal: DailyGoal }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-(--color-home-nav-sel-bg) px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
        <Icon
          name={CATEGORY_ICON[goal.skill]}
          className="size-[18px] text-(--color-primary-blue)"
        />
      </span>
      <span className="text-[15px] font-bold text-(--color-primary-blue-dark) md:text-[17px]">
        {t(SKILL_LABEL[goal.skill])} · {goal.target}{' '}
        {t(goal.skill === 'writing' ? 'units.words' : 'units.min')}
      </span>
    </div>
  );
};
