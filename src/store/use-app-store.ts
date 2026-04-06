import { create } from 'zustand'
import type { HardwareSpecs, Bookmark, CompatibilityRating, UserPreferences, Filters, HFModel, DEFAULT_FILTERS } from '@/types/model'
import { savePreferences, loadPreferences } from '@/lib/storage'

interface AppState {
  specs: HardwareSpecs | null
  bookmarks: Bookmark[]
  openrouterApiKey: string
  openrouterModel: string
  theme: "dark" | "light" | "system"
  filterPresets: Record<string, unknown>

  filters: typeof DEFAULT_FILTERS
  selectedModelId: string | null
  hasEnteredSpecs: boolean
  isLoading: boolean

  // Compare (in-memory, up to 3 models)
  compareList: HFModel[]

  // Actions
  loadFromStorage: () => Promise<void>
  setSpecs: (specs: HardwareSpecs) => Promise<void>
  addBookmark: (modelId: string, notes?: string) => Promise<void>
  removeBookmark: (modelId: string) => Promise<void>
  setApiKey: (key: string) => Promise<void>
  setOpenrouterModel: (model: string) => Promise<void>
  setTheme: (theme: "dark" | "light" | "system") => Promise<void>
  setFilters: (filters: Partial<typeof DEFAULT_FILTERS>) => void
  setSelectedModelId: (id: string | null) => void
  setHasEnteredSpecs: (v: boolean) => void
  setLoading: (v: boolean) => void
  exportData: () => Promise<string>
  importData: (json: string) => Promise<boolean>
  addToCompare: (model: HFModel) => void
  removeFromCompare: (modelId: string) => void
  clearCompare: () => void
  isInCompare: (modelId: string) => boolean
}

export const useAppStore = create<AppState>((set, get) => ({
  specs: null,
  bookmarks: [],
  openrouterApiKey: "",
  openrouterModel: "qwen/qwen3.6-plus:free",
  theme: "system",
  filterPresets: {},
  filters: {
    compatibility: [],
    tasks: [],
    formats: [],
    licenses: [],
    sizeMinGB: null,
    sizeMaxGB: null,
    paramMinB: null,
    paramMaxB: null,
    searchQuery: "",
    sortBy: "score",
    sortDir: "desc",
  },
  selectedModelId: null,
  hasEnteredSpecs: false,
  isLoading: false,
  compareList: [],

  loadFromStorage: async () => {
    const prefs = await loadPreferences()
    set({
      specs: prefs.specs,
      bookmarks: prefs.bookmarks,
      openrouterApiKey: prefs.openrouterApiKey,
      openrouterModel: prefs.openrouterModel,
      theme: prefs.theme,
      filterPresets: prefs.filterPresets,
      hasEnteredSpecs: !!prefs.specs,
    })
  },

  setSpecs: async (specs) => {
    set({ specs, hasEnteredSpecs: true })
    await savePreferences({ specs })
  },

  addBookmark: async (modelId, notes) => {
    const { bookmarks } = get()
    if (bookmarks.some(b => b.modelId === modelId)) return
    const newBookmark: Bookmark = { modelId, addedAt: new Date().toISOString(), notes }
    const updated = [...bookmarks, newBookmark]
    set({ bookmarks: updated })
    await savePreferences({ bookmarks: updated })
  },

  removeBookmark: async (modelId) => {
    const { bookmarks } = get()
    const updated = bookmarks.filter(b => b.modelId !== modelId)
    set({ bookmarks: updated })
    await savePreferences({ bookmarks: updated })
  },

  setApiKey: async (key) => {
    set({ openrouterApiKey: key })
    await savePreferences({ openrouterApiKey: key })
  },

  setOpenrouterModel: async (model) => {
    set({ openrouterModel: model })
    await savePreferences({ openrouterModel: model })
  },

  setTheme: async (theme) => {
    set({ theme })
    await savePreferences({ theme })
  },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }))
  },

  setSelectedModelId: (id) => set({ selectedModelId: id }),
  setHasEnteredSpecs: (v) => set({ hasEnteredSpecs: v }),
  setLoading: (v) => set({ isLoading: v }),

  addToCompare: (model) => {
    const { compareList } = get()
    if (compareList.length >= 3) return
    if (compareList.some(m => m.modelId === model.modelId)) return
    set({ compareList: [...compareList, model] })
  },

  removeFromCompare: (modelId) => {
    set({ compareList: get().compareList.filter(m => m.modelId !== modelId) })
  },

  clearCompare: () => set({ compareList: [] }),

  isInCompare: (modelId) => get().compareList.some(m => m.modelId === modelId),

  exportData: async () => {
    const state = get()
    return JSON.stringify({
      specs: state.specs,
      bookmarks: state.bookmarks,
      openrouterModel: state.openrouterModel,
      theme: state.theme,
      filterPresets: state.filterPresets,
    }, null, 2)
  },

  importData: async (json) => {
    try {
      const parsed = JSON.parse(json)
      if (parsed.specs) set({ specs: parsed.specs, hasEnteredSpecs: true })
      if (parsed.bookmarks) set({ bookmarks: parsed.bookmarks })
      if (parsed.openrouterModel) set({ openrouterModel: parsed.openrouterModel })
      if (parsed.theme) set({ theme: parsed.theme })
      if (parsed.filterPresets) set({ filterPresets: parsed.filterPresets })
      await savePreferences(parsed)
      return true
    } catch {
      return false
    }
  },
}))
