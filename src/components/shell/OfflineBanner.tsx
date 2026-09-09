/* A quiet strip that appears while the browser is offline.

   It says what still works rather than only what is wrong: the whole library is
   readable from the cache and edits are kept, which is true and is the thing a
   reader needs to know before deciding whether to keep working. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const OfflineBanner = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-(--color-profile-warn-border)/40 bg-(--color-profile-warn-bg) px-4 py-2 text-center text-[13px] font-semibold text-(--color-primary-blue-dark)"
    >
      <Icon
        name="wifi.slash"
        aria-hidden
        className="size-[14px] shrink-0 text-(--color-profile-warn-icon)"
      />
      {t('offline.banner')}
    </div>
  );
};
