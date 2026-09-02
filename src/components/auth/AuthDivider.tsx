/* "or with email" rule between the Google button and the form fields. */
import { useTranslation } from 'react-i18next';

export const AuthDivider = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3.5">
      <div className="h-px flex-1 bg-(--color-auth-field-border)" />
      <span className="text-[13px] font-semibold text-(--color-muted-text)">
        {t('auth.orWithEmail')}
      </span>
      <div className="h-px flex-1 bg-(--color-auth-field-border)" />
    </div>
  );
};
