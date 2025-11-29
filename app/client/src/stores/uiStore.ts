// UI State Store - Zustand
// Manages sidebar state, admin mode, and UI preferences

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ComparisonPeriod } from '@sabe/shared';

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Admin mode
  adminMode: boolean;
  toggleAdminMode: () => void;
  setAdminMode: (mode: boolean) => void;

  // Rankings preferences
  comparisonPeriod: ComparisonPeriod;
  setComparisonPeriod: (period: ComparisonPeriod) => void;

  // Selected run for details view
  selectedRunId: string | null;
  setSelectedRunId: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Admin mode
      adminMode: false,
      toggleAdminMode: () => set((state) => ({ adminMode: !state.adminMode })),
      setAdminMode: (mode) => set({ adminMode: mode }),

      // Rankings preferences
      comparisonPeriod: 'wow',
      setComparisonPeriod: (period) => set({ comparisonPeriod: period }),

      // Selected run
      selectedRunId: null,
      setSelectedRunId: (id) => set({ selectedRunId: id }),
    }),
    {
      name: 'sabe-ui-state',
      partialize: (state) => ({
        adminMode: state.adminMode,
        comparisonPeriod: state.comparisonPeriod,
      }),
    }
  )
);
