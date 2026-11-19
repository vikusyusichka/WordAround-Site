/* Modal to add or edit a card: word, translation, example and the picture.

   The picture used to be create-only — you could attach one in the new-set
   wizard and never afterwards, so a card added later could not have one at
   all. The control is the same one the wizard uses (pick, preview, remove),
   but the upload happens here rather than in the save mutation: this dialog
   hands back a finished Flashcard, so the file has to become a URL before it
   leaves. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ImageSquare, X } from '@phosphor-icons/react';

import { useUid } from '@/hooks/useFolders';
import { uploadCardImage } from '@/lib/setImageService';
import type { Flashcard } from '@/lib/models';

interface CardEditDialogProps {
  /** null = add a new card. */
  card: Flashcard | null;
  /** Where the picture is stored: users/{uid}/setImages/{setId}/{cardId}.jpg */
  setId: string;
  open: boolean;
  onSave: (card: Flashcard) => void;
  onClose: () => void;
}

export const CardEditDialog = ({ card, setId, open, onSave, onClose }: CardEditDialogProps) => {
  const { t } = useTranslation();
  const uid = useUid();
  const fileRef = useRef<HTMLInputElement>(null);

  const [word, setWord] = useState(card?.word ?? '');
  const [translation, setTranslation] = useState(card?.translation ?? '');
  const [example, setExample] = useState(card?.example ?? '');

  const [imageFile, setImageFile] = useState<File | null>(null);
  /* Distinct from "no file picked": the card may already have a picture that
     the reader has just taken off. */
  const [imageCleared, setImageCleared] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);

  const existingURL = imageCleared ? undefined : card?.imageURL;
  const preview = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : existingURL),
    [imageFile, existingURL],
  );
  useEffect(() => {
    return () => {
      if (imageFile && preview) URL.revokeObjectURL(preview);
    };
  }, [preview, imageFile]);

  const canSave = word.trim().length > 0 && translation.trim().length > 0 && !isUploading;

  const handleSave = async () => {
    if (!canSave) return;
    const id = card?.id ?? crypto.randomUUID();

    let imageURL = existingURL;
    if (imageFile) {
      if (!uid) return;
      setIsUploading(true);
      setUploadFailed(false);
      try {
        imageURL = await uploadCardImage(uid, setId, id, imageFile);
      } catch {
        /* Left open on purpose. The reader can try again — a dropped
           connection is the common cause — or take the picture off and save
           the text on its own. Closing would throw the edit away. */
        setIsUploading(false);
        setUploadFailed(true);
        return;
      }
      setIsUploading(false);
    }

    onSave({
      id,
      word: word.trim(),
      translation: translation.trim(),
      example: example.trim(),
      imageURL,
    });
  };

  const field =
    'h-11 rounded-xl border border-(--color-auth-field-border) bg-(--color-surface) px-3.5 text-[15px] font-medium text-(--color-cs-dark-text) outline-none focus-visible:border-(--color-home-brand)';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex w-full max-w-md flex-col gap-4 rounded-3xl bg-(--color-app-bg) p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[18px] font-bold text-(--color-cs-dark-text)">
              {card ? t('study.editCard') : t('study.addCard')}
            </h2>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder={t('createSet.word')}
              autoFocus
              className={field}
            />
            <input
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder={t('createSet.translation')}
              className={field}
            />
            <input
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder={t('createSet.example')}
              className={field}
            />

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  setImageCleared(false);
                  setUploadFailed(false);
                }
                e.target.value = '';
              }}
            />

            {preview ? (
              <div className="relative size-24 self-start">
                <img
                  src={preview}
                  alt=""
                  className="size-24 rounded-xl border border-(--color-auth-field-border) object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImageCleared(true);
                    setUploadFailed(false);
                  }}
                  disabled={isUploading}
                  aria-label={t('createSet.removeImage')}
                  className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-(--color-surface) text-(--color-primary-blue) shadow-[0_2px_6px_rgba(0,0,0,0.12)] disabled:opacity-60 focus-visible:outline-none"
                >
                  <X size={13} weight="bold" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-(--color-auth-field-border) bg-(--color-surface) text-[14px] font-semibold text-(--color-cs-text-muted) transition-colors hover:brightness-[0.98] disabled:opacity-60 focus-visible:outline-none"
              >
                <ImageSquare size={18} weight="bold" />
                {t('createSet.addImage')}
              </button>
            )}

            {uploadFailed && (
              <p role="alert" className="text-[13px] font-semibold text-(--color-cs-red)">
                {t('study.imageFailed')}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!canSave}
                className="h-11 flex-1 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none"
              >
                {isUploading ? t('study.imageUploading') : t('study.save')}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-(--color-surface) px-5 text-[15px] font-semibold text-(--color-cs-text-muted) disabled:opacity-60 focus-visible:outline-none"
              >
                {t('study.cancel')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
