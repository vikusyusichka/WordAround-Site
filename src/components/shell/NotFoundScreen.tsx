/* The screen for a URL that matches no route — a typo, a stale bookmark, a
   link from before a rename.

   It has to stand on its own. An unmatched URL never enters the `_authed`
   layout, so there is no sidebar and no mobile drawer around it: without a way
   back on the page itself, the browser's Back button is the only exit. It also
   renders for signed-out readers, so it points at `/` and lets the root route
   decide where that person belongs. */
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';

export const NotFoundScreen = () => {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-(--color-app-bg) px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-(--color-goal-bg)">
        <Icon name="questionmark.circle.fill" className="h-8 w-8 text-(--color-primary-blue)" />
      </span>

      <h1 className="text-[26px] font-bold text-(--color-primary-blue-dark)">
        {t('notFound.title')}
      </h1>
      <p className="max-w-sm text-[15px] font-medium text-(--color-text-secondary)">
        {t('notFound.body')}
      </p>

      <Link
        to="/"
        className="mt-2 flex h-11 items-center rounded-2xl bg-(--color-primary-blue-solid) px-6 text-[15px] font-semibold text-white"
      >
        {t('notFound.backHome')}
      </Link>
    </main>
  );
};
