/* Rename + delete dialogs for a library item, in the one place the three
   reading screens and the saved-listening screen can share.

   All four used to reach for window.prompt and window.confirm, in four
   slightly different ways. One component keeps the copy and the behaviour
   identical everywhere, and means a screen adds a rename by passing a target
   rather than by writing another pair of dialogs. */
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/shell/ConfirmDialog';
import { RenameDialog } from '@/components/shell/RenameDialog';

export interface NamedItem {
  id: string;
  title: string;
}

interface ItemActionDialogsProps {
  /** The item being renamed, or null. */
  renameTarget?: NamedItem | null;
  /** The item being deleted, or null. */
  deleteTarget?: NamedItem | null;
  /** i18n keys, so each screen keeps its own wording. */
  renameTitleKey?: string;
  deleteTitleKey: string;
  deleteBodyKey: string;
  isDeleting?: boolean;
  onRename?: (title: string) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export const ItemActionDialogs = ({
  renameTarget,
  deleteTarget,
  renameTitleKey = 'reading.card.renameTitle',
  deleteTitleKey,
  deleteBodyKey,
  isDeleting = false,
  onRename,
  onDelete,
  onCancel,
}: ItemActionDialogsProps) => {
  const { t } = useTranslation();

  return (
    <>
      {renameTarget && onRename && (
        <RenameDialog
          title={t(renameTitleKey)}
          initialValue={renameTarget.title}
          onSubmit={onRename}
          onCancel={onCancel}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title={t(deleteTitleKey)}
          body={t(deleteBodyKey, { title: deleteTarget.title })}
          isBusy={isDeleting}
          onConfirm={onDelete}
          onCancel={onCancel}
        />
      )}
    </>
  );
};
