import { createFileRoute, redirect } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { PlaceholderPage } from '@/components/shell/PlaceholderPage';
import { CATEGORY_ICON } from '@/lib/homeTypes';
import { isPracticeMode, pageCopyForPath } from '@/lib/navigation';

export const Route = createFileRoute('/_authed/practice/$mode')({
  beforeLoad: ({ params }) => {
    if (!isPracticeMode(params.mode)) throw redirect({ to: '/home' });
  },
  component: PracticePage,
});

/* Placeholder for the 4 skill modules (Writing/Reading/Listening/Speaking land
   in Phases 4–7). Copy + icon come from the route. */
function PracticePage() {
  const { t } = useTranslation();
  const { mode } = Route.useParams();
  const copy = pageCopyForPath(`/practice/${mode}`);

  return (
    <PlaceholderPage
      title={t(copy.titleKey)}
      subtitle={copy.subtitleKey ? t(copy.subtitleKey) : undefined}
      icon={isPracticeMode(mode) ? CATEGORY_ICON[mode] : 'sparkles'}
    />
  );
}
