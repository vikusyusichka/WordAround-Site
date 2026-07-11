/* Shell UI state only (navigation lives in the URL via the router). Holds the
   mobile drawer and the create-menu open flags. */
import { create } from 'zustand';

interface UiStoreState {
  isDrawerOpen: boolean;
  isCreateMenuOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleCreateMenu: () => void;
  closeCreateMenu: () => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  isDrawerOpen: false,
  isCreateMenuOpen: false,
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleCreateMenu: () => set((s) => ({ isCreateMenuOpen: !s.isCreateMenuOpen })),
  closeCreateMenu: () => set({ isCreateMenuOpen: false }),
}));
