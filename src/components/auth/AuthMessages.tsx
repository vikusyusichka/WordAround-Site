/* The one centered error / info slot every auth screen shares. Both messages
   arrive as i18next keys from the auth store and are translated here. */
import { useTranslation } from 'react-i18next';

interface AuthMessagesProps {
  errorKey?: string | null;
  infoKey?: string | null;
  /** Interpolation values for the info copy (e.g. the address a link went to). */
  infoValues?: Record<string, string>;
}

export const AuthMessages = ({ errorKey, infoKey, infoValues }: AuthMessagesProps) => {
  const { t } = useTranslation();

  if (!errorKey && !infoKey) return null;

  return (
    <div className="flex flex-col gap-2">
      {errorKey && (
        <p role="alert" className="text-center text-[14px] font-medium text-[#FF3B30]">
          {t(errorKey)}
        </p>
      )}
      {infoKey && (
        <p className="text-center text-[14px] font-medium text-[#34C759]">
          {t(infoKey, infoValues)}
        </p>
      )}
    </div>
  );
};
