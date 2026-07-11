/* Folder form validation — ports CreateFolderViewModel rules. Returns an
   i18next key for the first violation, or null when valid. */

export const FOLDER_TITLE_MAX = 80;
export const FOLDER_DESC_MAX = 120;

export interface FolderFormValues {
  title: string;
  description: string;
}

export const validateFolder = ({ title, description }: FolderFormValues): string | null => {
  const cleanTitle = title.trim();
  if (cleanTitle.length === 0) return 'folders.error.nameRequired';
  if (cleanTitle.length > FOLDER_TITLE_MAX) return 'folders.error.nameTooLong';
  if (description.trim().length > FOLDER_DESC_MAX) return 'folders.error.descTooLong';
  return null;
};
