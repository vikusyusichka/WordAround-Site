/* Shared surface classes for the exam screens — theme tokens only, so every
   exam surface follows light and dark. */
export const CARD =
  'rounded-(--radius-mode-card) border border-(--color-surface-border) bg-(--color-surface-card) p-5 shadow-[0_4px_10px_var(--shadow-color-fc)]';

export const SECTION_TITLE = 'text-[17px] font-bold text-(--color-primary-blue-dark)';

export const BODY_TEXT = 'text-[15px] font-medium leading-relaxed text-(--color-text-secondary)';

export const PRIMARY_BUTTON =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-(--color-primary-blue-solid) px-7 text-[15px] font-bold text-white shadow-[0_6px_16px_var(--shadow-color-fc)] transition-transform active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none';

export const SECONDARY_BUTTON =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-(--color-surface-border) bg-(--color-surface-card) px-6 text-[15px] font-bold text-(--color-primary-blue-dark) transition-colors hover:bg-(--color-hover-wash) disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none';

export const FIELD =
  'w-full rounded-2xl border border-(--color-surface-border) bg-(--color-surface) px-4 py-3 text-[15px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)';
