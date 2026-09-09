/* Step two of deleting an account — port of
   DeleteAccountConfirmationSheet.swift. Step one is a plain ConfirmDialog on
   the profile page; this is the one that actually deletes, and it stays locked
   until the word DELETE is typed.

   DELETE is NOT translated, in any language. It is the same literal iOS asks
   for, and a confirmation word that changes with the interface language is a
   confirmation word you can get wrong by having switched languages. */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import {
  AccountDeletionError,
  deleteCurrentUserAccount,
} from '@/lib/accountDeletionService';
import { usePreferences } from '@/stores/preferencesStore';
import { useSessionStore } from '@/stores/sessionStore';

export const DELETE_CONFIRMATION_WORD = 'DELETE';

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
}

export const DeleteAccountDialog = ({ open, onClose }: DeleteAccountDialogProps) => {
  const { t } = useTranslation();
  const [typed, setTyped] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTyped('');
    setErrorKey(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, isDeleting, onClose]);

  const matches = typed.trim().toUpperCase() === DELETE_CONFIRMATION_WORD;

  const handleDelete = async () => {
    if (!matches || isDeleting) return;
    setIsDeleting(true);
    setErrorKey(null);

    try {
      await deleteCurrentUserAccount();
      /* Same cleanup iOS does after a successful deletion. */
      usePreferences.getState().resetToDefaults();
      await useSessionStore.getState().refreshAuthState();
    } catch (error) {
      setIsDeleting(false);
      if (error instanceof AccountDeletionError && error.reason === 'requires-recent-login') {
        /* iOS behaviour: Firebase wants a fresh sign-in before it will delete
           an account, so sign out and ask for one. The layout route sends the
           reader to the sign-in screen once the session clears. */
        setErrorKey('profile.delete.reauthNeeded');
        usePreferences.getState().resetToDefaults();
        await useSessionStore.getState().signOut();
        return;
      }
      setErrorKey('profile.delete.failed');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isDeleting && onClose()}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={t('profile.delete.title')}
            className="flex w-full max-w-[460px] flex-col gap-5 rounded-3xl bg-(--color-app-bg) p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-3.5">
              <span
                aria-hidden
                className="grid size-[72px] place-items-center rounded-full bg-(--color-profile-danger-soft)"
              >
                <Icon name="trash.fill" className="size-[30px] text-(--color-profile-danger)" />
              </span>
              <h2 className="text-center text-[22px] font-black text-(--color-primary-blue-dark)">
                {t('profile.delete.title')}
              </h2>
            </div>

            <p className="rounded-[18px] border border-(--color-profile-danger-border)/50 bg-(--color-profile-danger-bg) p-4 text-center text-[14px] leading-[1.55] font-semibold text-(--color-text-secondary)">
              {t('profile.delete.secondMessage')}
            </p>

            <label className="flex flex-col gap-2">
              <span className="px-1 text-[13px] font-semibold text-(--color-text-secondary)">
                {t('profile.delete.confirmField', { word: DELETE_CONFIRMATION_WORD })}
              </span>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={DELETE_CONFIRMATION_WORD}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="h-13 rounded-2xl border bg-(--color-surface) px-4 text-[17px] font-bold text-(--color-primary-blue-dark) outline-none"
                style={{
                  borderColor: matches
                    ? 'color-mix(in srgb, var(--color-profile-danger) 50%, transparent)'
                    : 'color-mix(in srgb, var(--color-primary-blue) 10%, transparent)',
                }}
              />
            </label>

            {errorKey && (
              <p className="flex items-start gap-2.5 rounded-[14px] bg-(--color-profile-danger-bg) p-3 text-[13px] font-semibold text-(--color-primary-blue-dark)">
                <Icon
                  name="exclamationmark.triangle.fill"
                  aria-hidden
                  className="mt-px size-[13px] shrink-0 text-(--color-profile-danger)"
                />
                {t(errorKey)}
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={!matches || isDeleting}
                className="h-13 rounded-2xl bg-(--color-profile-danger) text-[16px] font-bold text-white transition-transform hover:brightness-105 active:scale-[0.99] disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {isDeleting ? t('profile.delete.deleting') : t('profile.delete.confirmButton')}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="h-12 rounded-2xl text-[15px] font-bold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/[0.06] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
              >
                {t('common.cancel')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
