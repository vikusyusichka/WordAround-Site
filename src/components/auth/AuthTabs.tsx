/* Sign in / Sign up switcher. The two screens are real routes, so these are
   links rather than local state — the back button, bookmarks and a shared URL
   all keep working. */
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

const BASE =
  'flex h-[46px] flex-1 items-center justify-center rounded-full text-[15px] transition-colors';
const ACTIVE = 'bg-white font-extrabold text-(--color-auth-title) shadow-[0_3px_8px_rgba(61,82,153,0.10)]';
const IDLE = 'font-bold text-(--color-auth-subtitle) hover:text-(--color-auth-title)';

interface AuthTabsProps {
  active: 'signIn' | 'signUp';
}

export const AuthTabs = ({ active }: AuthTabsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1.5 rounded-full bg-[#F2F5FC]/95 p-1.5">
      <Link
        to="/auth/sign-in"
        className={`${BASE} ${active === 'signIn' ? ACTIVE : IDLE}`}
        aria-current={active === 'signIn' ? 'page' : undefined}
      >
        {t('auth.signIn')}
      </Link>
      <Link
        to="/auth/sign-up"
        className={`${BASE} ${active === 'signUp' ? ACTIVE : IDLE}`}
        aria-current={active === 'signUp' ? 'page' : undefined}
      >
        {t('auth.signUp')}
      </Link>
    </div>
  );
};
