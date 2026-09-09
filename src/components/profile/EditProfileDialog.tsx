/* Edit name + avatar — port of EditProfileSheet.swift, as a modal rather than
   a sheet (the pattern from src/components/study/CardEditDialog.tsx:
   AnimatePresence, backdrop blur, Escape and click-outside close).

   One deliberate difference in behaviour: the photo upload is allowed to fail
   on its own. It writes to `users/{uid}/profile/avatar.jpg`, which needs a
   Storage rule that may not be published yet — so the name and the colour are
   saved regardless and the photo reports its own error underneath the avatar.
   Losing a renamed profile because a picture didn't upload would be the wrong
   trade. */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { updateProfile } from 'firebase/auth';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { auth } from '@/lib/firebase';
import { initialsFrom } from '@/lib/profileStats';
import { PROFILE_AVATAR_COLORS, type ProfileAvatarColorId } from '@/lib/profileAvatarColor';
import { saveProfile, uploadAvatar } from '@/lib/userProfileService';
import { usePreferences } from '@/stores/preferencesStore';
import { useSessionStore } from '@/stores/sessionStore';

interface EditProfileDialogProps {
  open: boolean;
  email: string;
  displayName: string;
  photoURL: string | null;
  onClose: () => void;
}

export const EditProfileDialog = ({
  open,
  email,
  displayName,
  photoURL,
  onClose,
}: EditProfileDialogProps) => {
  const { t } = useTranslation();
  const avatarColor = usePreferences((s) => s.avatarColor);
  const setAvatarColor = usePreferences((s) => s.setAvatarColor);

  const [draftName, setDraftName] = useState(displayName);
  const [draftColor, setDraftColor] = useState<ProfileAvatarColorId>(avatarColor);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [photoErrorKey, setPhotoErrorKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Opening starts from the live values — iOS beginEditing(). */
  useEffect(() => {
    if (!open) return;
    setDraftName(displayName);
    setDraftColor(avatarColor);
    setPickedFile(null);
    setPreviewURL(null);
    setPhotoErrorKey(null);
    setErrorKey(null);
  }, [open, displayName, avatarColor]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, isSaving, onClose]);

  /* A blob URL that outlives its picker leaks; revoke it with the preview. */
  useEffect(() => {
    if (!previewURL) return;
    return () => URL.revokeObjectURL(previewURL);
  }, [previewURL]);

  const trimmedName = draftName.trim();
  const hasChanges =
    trimmedName !== displayName.trim() || draftColor !== avatarColor || pickedFile !== null;

  const handlePick = (file: File | undefined) => {
    if (!file) return;
    setPhotoErrorKey(null);
    setPickedFile(file);
    setPreviewURL(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !hasChanges || isSaving) return;

    setIsSaving(true);
    setErrorKey(null);
    setPhotoErrorKey(null);

    let uploadedURL: string | null = null;
    if (pickedFile) {
      try {
        uploadedURL = await uploadAvatar(user.uid, pickedFile);
      } catch (error) {
        setPhotoErrorKey(
          error instanceof Error && error.message === 'profile.edit.photoTimeout'
            ? 'profile.edit.photoTimeout'
            : 'profile.edit.photoFailed',
        );
      }
    }

    try {
      const changes: { displayName?: string; photoURL?: string } = {};
      if (trimmedName !== displayName.trim()) changes.displayName = trimmedName;
      if (uploadedURL) changes.photoURL = uploadedURL;
      if (Object.keys(changes).length > 0) await updateProfile(user, changes);

      await saveProfile(user.uid, {
        displayName: trimmedName,
        email: user.email,
        photoURL: uploadedURL ?? user.photoURL,
        avatarColor: draftColor,
      });

      setAvatarColor(draftColor);
      await useSessionStore.getState().refreshAuthState();
      setIsSaving(false);
      /* A failed photo keeps the dialog open so the message is readable; the
         name and colour are already saved either way. */
      if (!pickedFile || uploadedURL) onClose();
      else setPickedFile(null);
    } catch (error) {
      setIsSaving(false);
      setErrorKey('profile.edit.saveFailed');
      if (import.meta.env.DEV) console.error(error);
    }
  };

  const initials = initialsFrom(trimmedName, email);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isSaving && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('profile.edit.title')}
            className="flex max-h-[90dvh] w-full max-w-[520px] flex-col gap-5 overflow-y-auto rounded-3xl bg-(--color-app-bg) p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[19px] font-bold text-(--color-primary-blue-dark)">
              {t('profile.edit.title')}
            </h2>

            <div className="flex flex-col items-center gap-3.5">
              <ProfileAvatar
                size={112}
                color={draftColor}
                initials={initials}
                photoURL={previewURL ?? photoURL}
                ringWidth={4}
                className="shadow-[0_6px_12px_rgba(0,0,0,0.08)]"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePick(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[15px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/[0.07] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
              >
                <Icon name="photo.fill" className="size-[15px]" />
                {pickedFile ? t('profile.edit.chooseAnother') : t('profile.edit.changePhoto')}
              </button>

              {photoErrorKey && (
                <p className="text-center text-[13px] font-semibold text-(--color-profile-danger)">
                  {t(photoErrorKey)}
                </p>
              )}
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 px-1 text-[13px] font-semibold text-(--color-text-secondary)">
                {t('profile.edit.avatarColor')}
              </legend>
              <div className="flex flex-wrap gap-3">
                {PROFILE_AVATAR_COLORS.map((color) => {
                  const isSelected = draftColor === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={t(`profile.color.${color.id}`)}
                      onClick={() => setDraftColor(color.id)}
                      className="grid size-[46px] place-items-center rounded-full transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
                      style={{
                        boxShadow: isSelected ? `inset 0 0 0 3px ${color.accent}` : undefined,
                      }}
                    >
                      <span
                        className="size-9 rounded-full"
                        style={{
                          background: color.fill,
                          boxShadow: `inset 0 0 0 1px ${color.accent}59`,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="flex flex-col gap-2">
              <span className="px-1 text-[13px] font-semibold text-(--color-text-secondary)">
                {t('profile.edit.nameLabel')}
              </span>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder={t('profile.edit.namePlaceholder')}
                autoComplete="name"
                maxLength={60}
                className="h-13 rounded-2xl border border-(--color-primary-blue)/10 bg-white px-4 text-[17px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
              />
            </label>

            {errorKey && (
              <p className="text-[13px] font-semibold text-(--color-profile-danger)">
                {t(errorKey)}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-text-secondary) transition-colors hover:bg-black/[0.03] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!hasChanges || isSaving}
                className="h-11 rounded-2xl bg-(--color-primary-blue) px-5 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {isSaving ? t('profile.edit.saving') : t('common.save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
