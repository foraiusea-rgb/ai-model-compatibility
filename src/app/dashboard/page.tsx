"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { ModelGridItem } from "@/components/model/model-grid-item"
import { FilterSidebar } from "@/components/filters/filter-sidebar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/store/use-app-store"
import { computeCompatibility } from "@/lib/compatibility"
import type { ModelCard, Filters } from "@/types/model"
import { Search, Grid, List, Filter, Zap, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

interface FetchState {
  models: ModelCard[]
  total: number
  hasMore: boolean
  loading: boolean
  error: string | null
  initialLoad: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const { specs, loadFromStorage, bookmarks, addBookmark, removeBookmark, filters, setFilters, openrouterApiKey } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [state, setState] = useState<FetchState>({
    models: [],
    total: 0,
    hasMore: true,
    loading: false,
    error: null,
    initialLoad: true,
  })
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchInput, setSearchInput] = useState("")
  const [sort, setSort] = useState("downloads")
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null)

  // Load preferences
  useEffect(() => {
    loadFromStorage()
    setMounted(true)
  }, [loadFromStorage])

  // Fetch models with server-side pagination
  const fetchModels = useCallback(async (offset = 0, append = false) => {
    setState((prev) => ({ ...prev, loading: true, error: null, initialLoad: false }))

    const params = new URLSearchParams()
    params.set("limit", "20")
    params.set("offset", String(offset))
    params.set("sort", sort)
    if (searchInput) params.set("q", searchInput)
    if (filters.tasks[0]) params.set("pipeline_tag", filters.tasks[0])
    if (filters.sizeMinGB !== null) params.set("sizeMin", String(filters.sizeMinGB))
    if (filters.sizeMaxGB !== null) params.set("sizeMax", String(filters.sizeMaxGB))
    if (filters.paramMinB !== null) params.set("paramMin", String(filters.paramMinB))
    if (filters.paramMaxB !== null) params.set("paramMax", String(filters.paramMaxB))
    if (filters.formats.length > 0) params.set("format", filters.formats[0])

    try {
      const res = await fetch(`/api/models?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // Enrich with compatibility
      const enriched: ModelCard[] = data.models.map((m: any) => {
        if (specs && m.estimatedSizeGB != null) {
          const compat = computeCompatibility(m.estimatedSizeGB, m.contextLength, specs)
          return { ...m, compatibility: compat.rating, compatibilityScore: compat.score, matchReason: compat.reason } as ModelCard
        }
        return { ...m, compatibility: "unknown", compatibilityScore: 0, matchReason: "No specs configured" } as ModelCard
      })

      setState((prev) => ({
        ...prev,
        models: append ? [...prev.models, ...enriched] : enriched,
        total: data.total,
        hasMore: data.hasMore,
        loading: false,
      }))
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || "Failed to fetch models",
        loading: false,
      }))
    }
  }, [specs, searchInput, sort, filters])

  // Initial load
  useEffect(() => {
    if (mounted) fetchModels(0, false)
  }, [mounted, fetchModels, searchInput, sort, filters.sizeMinGB, filters.sizeMaxGB])

  // Debounced search
  const handleSearch = (value: string) => {
    setSearchInput(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      fetchModels(0, false)
    }, 500)
  }

  // Load more (infinite scroll)
  const loadMore = () => {
    if (!state.loading && state.hasMore) {
      fetchModels(state.models.length, true)
    }
  }

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !state.loading && state.hasMore) {
          loadMore()
        }
      },
      { threshold: 0.5 }
    )

    const ref = loadMoreRef.current
    if (ref) observer.observe(ref)
    return () => {
      if (ref) observer.unobserve(ref)
    }
  }, [state.loading, state.hasMore, state.models.length])

  const handleSortChange = (value: string | null) => {
    if (value) setSort(value)
  }

  if (!mounted) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden xl:block w-72 flex-shrink-0 border-r bg-muted/30 overflow-y-auto">
        <div className="p-4">
          <FilterSidebar />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="border-b bg-card/50 backdrop-blur-sm px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => router.push("/")}>
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm hidden sm:inline">ModelDB</span>
            </div>
            {/* Mobile filter */}
            <Sheet>
              <SheetTrigger>
                <Button variant="outline" size="sm" className="xl:hidden gap-1.5 shrink-0">
                  <Filter className="w-3.5 h-3.5" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="p-4">
                  <FilterSidebar />
                </div>
              </SheetContent>
            </Sheet>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search 2.7M+ models..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-muted/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs shrink-0">
              {state.models.length} / {state.total.toLocaleString()} loaded
            </Badge>

            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-32 h-8 text-xs shrink-0">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="downloads">Downloads</SelectItem>
                <SelectItem value="likes">Likes</SelectItem>
                <SelectItem value="lastModified">Recently Updated</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md overflow-hidden">
              <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0 rounded-none" onClick={() => setViewMode("grid")}>
                <Grid className="w-3.5 h-3.5" />
              </Button>
              <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0 rounded-none" onClick={() => setViewMode("list")}>
                <List className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "🌙" : "☀️"}
            </Button>
          </div>
        </header>

        {/* Active Filters Strip */}
        {(filters.compatibility.length > 0 || filters.tasks.length > 0 || searchInput) && (
          <div className="px-4 py-2 border-b flex flex-wrap gap-2 items-center bg-muted/20">
            <span className="text-xs text-muted-foreground mr-1">Active:</span>
            {searchInput && (
              <Badge variant="secondary" className="text-xs gap-1">
                "{searchInput}"
                <button className="ml-0.5 hover:text-foreground" onClick={() => { setSearchInput(""); handleSearch(""); }}>x</button>
              </Badge>
            )}
            {filters.compatibility.map((c) => (
              <Badge key={c} variant="secondary" className="text-xs gap-1">
                {c}
                <button className="ml-0.5 hover:text-foreground" onClick={() => setFilters({ compatibility: [] })}>x</button>
              </Badge>
            ))}
            {filters.tasks.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs gap-1">
                {t}
                <button className="ml-0.5 hover:text-foreground" onClick={() => setFilters({ tasks: [] })}>x</button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-5 text-xs px-2" onClick={() => setFilters({ compatibility: [], tasks: [], formats: [], licenses: [], sizeMinGB: null, sizeMaxGB: null })}>
              Clear all
            </Button>
          </div>
        )}

        {/* Model Grid */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {state.error && !state.initialLoad && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <p className="text-lg font-medium text-red-500">Failed to load models</p>
              <p className="text-sm text-muted-foreground">{state.error}</p>
              <Button variant="outline" onClick={() => fetchModels(0, false)}>
                Retry
              </Button>
            </div>
          )}

          {state.models.length === 0 && state.initialLoad && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading models from HuggingFace...</p>
            </div>
          )}

          {state.models.length > 0 && (
            <>
              <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4" : "flex flex-col gap-3 max-w-4xl mx-auto"}>
                {state.models.map((model) => (
                  <ModelGridItem
                    key={model.modelId}
                    model={model}
                    isBookmarked={bookmarks.some((b) => b.modelId === model.modelId)}
                    onToggleBookmark={(id) => {
                      if (bookmarks.some((b) => b.modelId === id)) removeBookmark(id)
                      else addBookmark(id)
                    }}
                  />
                ))}
              </div>

              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} className="h-10 flex items-center justify-center mt-6">
                {state.loading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading more models...</span>
                  </div>
                )}
                {!state.hasMore && (
                  <p className="text-sm text-muted-foreground">End of results</p>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
