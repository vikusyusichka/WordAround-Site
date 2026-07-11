/* Optional folder assignment for a set — a native select over the user's
   folders (reuses useFoldersQuery). "No folder" clears the assignment. */
import { useTranslation } from 'react-i18next';

import { useFoldersQuery } from '@/hooks/useFolders';

interface FolderPickerProps {
  value: string | null;
  onChange: (folderID: string | null, folderName: string | null) => void;
}

export const FolderPicker = ({ value, onChange }: FolderPickerProps) => {
  const { t } = useTranslation();
  const { data: folders } = useFoldersQuery();

  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        const id = e.target.value || null;
        const folder = folders?.find((f) => f.id === id) ?? null;
        onChange(id, folder?.title ?? null);
      }}
      className="h-12 w-full max-w-xs rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[15px] font-medium text-(--color-cs-dark-text) outline-none focus-visible:border-(--color-home-brand)"
    >
      <option value="">{t('createSet.noFolder')}</option>
      {folders?.map((folder) => (
        <option key={folder.id} value={folder.id}>
          {folder.title}
        </option>
      ))}
    </select>
  );
};
