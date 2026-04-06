"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import {
  Search, Grid, List, Filter, Zap, Loader2, Moon, Sun, AlertTriangle, RefreshCw,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAppStore } from "@/store/use-app-store"
import { computeCompatibility } from "@/lib/compatibility"
import { useTheme } from "next-themes"
import type { ModelCard, HFModel } from "@/types/model"
import { useRouter } from "next/navigation"
import { ModelGridItem } from "@/components/model/model-grid-item"
import { FilterSidebar } from "@/components/filters/filter-sidebar"

const PAGE_SIZE = 40

interface ApiResponse {
  models: HFModel[]
  total: number
  hasMore: boolean
  fallback?: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const { specs, loadFromStorage, bookmarks, addBookmark, removeBookmark, filters, setFilters } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [sort, setSort] = useState("downloads")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // API state
  const [rawModels, setRawModels] = useState<HFModel[]>([])
  const [totalModels, setTotalModels] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Debounce search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadFromStorage()
    setMounted(true)
  }, [loadFromStorage])

  // Fetch models from API
  const fetchModels = useCallback(async (query: string, sortBy: string, pageOffset: number, append: boolean) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      params.set("limit", String(PAGE_SIZE))
      params.set("offset", String(pageOffset))

      // Map sort values to HF API sort params
      const sortMap: Record<string, string> = {
        downloads: "downloads",
        likes: "likes",
        updated: "lastModified",
        trending: "trending",
      }
      params.set("sort", sortMap[sortBy] || "downloads")
      params.set("direction", "-1")

      const res = await fetch(`/api/models?${params.toString()}`)
      if (!res.ok) throw new Error(`API returned ${res.status}`)

      const data: ApiResponse = await res.json()

      if (append) {
        setRawModels((prev) => [...prev, ...data.models])
      } else {
        setRawModels(data.models)
      }
      setTotalModels(data.total)
      setHasMore(data.hasMore)
      setIsFallback(!!data.fallback)
      setOffset(pageOffset + data.models.length)
    } catch (err: any) {
      console.error("Failed to fetch models:", err)
      if (!append) {
        setError(err.message || "Failed to load models")
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Initial fetch + refetch on sort change
  useEffect(() => {
    if (!mounted) return
    setOffset(0)
    fetchModels("", sort, 0, false)
  }, [mounted, sort, fetchModels])

  // Enrich with compatibility scores
  const modelCards: ModelCard[] = useMemo(() => {
    return rawModels.map((m) => {
      if (specs && m.estimatedSizeGB != null) {
        const compat = computeCompatibility(m.estimatedSizeGB, m.contextLength ?? null, specs)
        return { ...m, compatibility: compat.rating, compatibilityScore: compat.score, matchReason: compat.reason } as ModelCard
      }
      return { ...m, compatibility: "unknown", compatibilityScore: 0, matchReason: "No specs configured" } as ModelCard
    }).filter((m: ModelCard) => {
      if (filters.compatibility.length > 0 && !filters.compatibility.includes(m.compatibility)) return false
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase()
        if (!m.modelId.toLowerCase().includes(q) && !(m.name || "").toLowerCase().includes(q) && !m.author.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [rawModels, specs, filters.searchQuery, filters.compatibility])

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
    setFilters({ searchQuery: value })

    // Debounce API search — only fire after user stops typing for 400ms
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setOffset(0)
      fetchModels(value, sort, 0, false)
    }, 400)
  }, [sort, fetchModels, setFilters])

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return
    fetchModels(searchInput, sort, offset, true)
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden xl:block w-64 flex-shrink-0 border-r bg-muted/20 overflow-y-auto">
        <div className="p-3">
          <FilterSidebar />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="border-b bg-background/80 backdrop-blur-md px-3 lg:px-5 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => router.push("/")}>
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm hidden sm:inline">ModelDB</span>
            </div>

            {/* Mobile filter */}
            <Sheet>
              <SheetTrigger>
                <Button variant="outline" size="sm" className="xl:hidden gap-1.5 shrink-0 h-8">
                  <Filter className="w-3.5 h-3.5" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="p-3">
                  <FilterSidebar />
                </div>
              </SheetContent>
            </Sheet>

            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-muted/30 border-none focus-visible:ring-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0 shrink-0">
              {modelCards.length}{totalModels > modelCards.length ? ` / ${totalModels.toLocaleString()}` : ""} models
            </Badge>
            {isFallback && (
              <Badge variant="outline" className="text-[10px] px-2 py-0 text-amber-600 border-amber-400 shrink-0">
                offline
              </Badge>
            )}

            {/* Sort */}
            <Select value={sort} onValueChange={(v) => { if (v) setSort(v) }}>
              <SelectTrigger className="w-24 h-8 text-xs shrink-0 border-none bg-muted/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="downloads">Downloads</SelectItem>
                <SelectItem value="likes">Likes</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
              </SelectContent>
            </Select>

            {/* View toggle */}
            <div className="flex border rounded-md overflow-hidden shrink-0">
              <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0 rounded-none" onClick={() => setViewMode("grid")}>
                <Grid className="w-3.5 h-3.5" />
              </Button>
              <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0 rounded-none" onClick={() => setViewMode("list")}>
                <List className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Theme toggle */}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </header>

        {/* Active Filters Strip */}
        {(filters.compatibility.length > 0 || filters.tasks.length > 0 || searchInput) && (
          <div className="px-3 py-1.5 border-b flex flex-wrap gap-1.5 items-center bg-muted/10">
            <span className="text-[10px] text-muted-foreground mr-0.5">Filters:</span>
            {searchInput && (
              <Badge variant="secondary" className="text-[10px] gap-0.5">
                &quot;{searchInput}&quot;
                <button className="ml-0.5 hover:text-foreground" onClick={() => { setSearchInput(""); setFilters({ searchQuery: "" }); setOffset(0); fetchModels("", sort, 0, false); }}>×</button>
              </Badge>
            )}
            {filters.compatibility.map((c) => (
              <Badge key={c} variant="outline" className="text-[10px] gap-0.5">
                {c}
                <button className="ml-0.5 hover:text-foreground" onClick={() => setFilters({ compatibility: [] })}>×</button>
              </Badge>
            ))}
            {filters.tasks.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] gap-0.5">
                {t}
                <button className="ml-0.5 hover:text-foreground" onClick={() => setFilters({ tasks: [] })}>×</button>
              </Badge>
            ))}
            <button className="text-[10px] text-primary hover:underline ml-1" onClick={() => setFilters({ compatibility: [], tasks: [], formats: [], licenses: [], searchQuery: "" })}>
              Clear all
            </button>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-3 lg:p-5">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading models from HuggingFace...</p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchModels(searchInput, sort, 0, false)}>
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && modelCards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm text-muted-foreground">No models found.</p>
              {searchInput && (
                <Button variant="outline" size="sm" onClick={() => { setSearchInput(""); setFilters({ searchQuery: "" }); setOffset(0); fetchModels("", sort, 0, false); }}>
                  Clear search
                </Button>
              )}
            </div>
          )}

          {/* Model Grid */}
          {!loading && !error && modelCards.length > 0 && (
            <>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3"
                    : "flex flex-col gap-2 max-w-4xl mx-auto"
                }
              >
                {modelCards.map((model) => (
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

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center pt-6 pb-4">
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleLoadMore} disabled={loadingMore}>
                    {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {loadingMore ? "Loading..." : "Load more models"}
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
