/* Labeled input with a leading icon — ports the iOS AuthView field stack
   (label above a rounded white field with a colored SF-symbol slot). Password
   fields get a show/hide eye toggle (web nicety, not in iOS). */
import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Envelope, Eye, EyeSlash, Lock } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

type AuthFieldIcon = 'envelope' | 'lock';

const FIELD_ICONS: Record<AuthFieldIcon, ReactNode> = {
  envelope: <Envelope size={20} weight="fill" />,
  lock: <Lock size={20} weight="fill" />,
};

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  icon: AuthFieldIcon;
  /** Validation error (already translated); renders below the field. */
  error?: string;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, icon, error, type, id, ...rest }, ref) => {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputId = id ?? `auth-field-${icon}-${label.replace(/\s+/g, '-').toLowerCase()}`;

    return (
      <div className="flex flex-col gap-2.5">
        <label
          htmlFor={inputId}
          className="text-[15px] font-semibold text-(--color-auth-label)"
        >
          {label}
        </label>
        <div
          className={[
            'flex h-[58px] items-center gap-3 rounded-[20px] border bg-white/90 px-[18px]',
            error ? 'border-red-400' : 'border-(--color-auth-field-border)',
          ].join(' ')}
        >
          <span className="flex w-5 shrink-0 justify-center text-(--color-auth-field-icon)">
            {FIELD_ICONS[icon]}
          </span>
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            className="h-full w-full bg-transparent text-[16px] font-medium text-(--color-auth-title) outline-none placeholder:text-(--color-muted-text)"
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              className="shrink-0 text-(--color-auth-field-icon)"
            >
              {showPassword ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-[13px] font-medium text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  },
);

AuthField.displayName = 'AuthField';
