import { create } from 'zustand'

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebarCollapse: () => void
  
  // Modales
  modalOpen: string | null
  openModal: (modalId: string) => void
  closeModal: () => void
  
  // Loading global
  globalLoading: boolean
  setGlobalLoading: (loading: boolean) => void
  
  // Notificaciones no leídas
  unreadAlerts: number
  setUnreadAlerts: (count: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  sidebarOpen: false,
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  // Modales
  modalOpen: null,
  openModal: (modalId) => set({ modalOpen: modalId }),
  closeModal: () => set({ modalOpen: null }),
  
  // Loading
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
  
  // Alertas
  unreadAlerts: 0,
  setUnreadAlerts: (count) => set({ unreadAlerts: count }),
}))
