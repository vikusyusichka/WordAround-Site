/* Gradient capsule button used for "Let's Start" / "Sign In" / "I Verified
   My Email" — ports the iOS primary auth button (auth-grad gradient, colored
   shadow, loading spinner + label swap). */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  /** Label shown while loading (e.g. "Signing In..."). */
  loadingLabel?: string;
}

export const PrimaryButton = ({
  children,
  isLoading = false,
  loadingLabel,
  className,
  disabled,
  ...rest
}: PrimaryButtonProps) => {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      className={[
        'flex items-center justify-center gap-2.5 rounded-full',
        'bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to)',
        'font-bold text-white',
        'shadow-[0_10px_14px_rgba(48,145,247,0.22)]',
        'transition-transform active:scale-[0.97] disabled:opacity-80',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {isLoading && (
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
          aria-hidden="true"
        />
      )}
      {isLoading && loadingLabel ? loadingLabel : children}
    </button>
  );
};
