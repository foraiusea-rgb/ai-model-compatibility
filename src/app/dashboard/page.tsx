"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import {
  Search, Grid, List, Filter, Zap, Loader2, Moon, Sun, AlertTriangle, RefreshCw,
  Settings2, Sparkles, ArrowUpDown, ChevronRight,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
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

// Categories for the "Best for your hardware" section
const CATEGORIES = [
  { key: "text-generation", label: "Text generation", emoji: "💬", desc: "Chat, writing, reasoning" },
  { key: "text-to-image", label: "Image generation", emoji: "🎨", desc: "Stable Diffusion, Flux" },
  { key: "automatic-speech-recognition", label: "Speech to text", emoji: "🎙️", desc: "Whisper, transcription" },
  { key: "text-to-speech", label: "Text to speech", emoji: "🔊", desc: "Voice synthesis" },
]

function computeBestFitScore(model: ModelCard): number {
  // Composite: compatibility score (0-100) weighted with download popularity
  const compatWeight = 0.6
  const popularityWeight = 0.4
  const popularityScore = Math.min(100, Math.log10(model.downloads + 1) * 14)
  return (model.compatibilityScore * compatWeight) + (popularityScore * popularityWeight)
}

export default function DashboardPage() {
  const router = useRouter()
  const { specs, loadFromStorage, bookmarks, addBookmark, removeBookmark, filters, setFilters, hasEnteredSpecs } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [sort, setSort] = useState("best-fit")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const [rawModels, setRawModels] = useState<HFModel[]>([])
  const [totalModels, setTotalModels] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadFromStorage()
    setMounted(true)
  }, [loadFromStorage])

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

      const sortMap: Record<string, string> = {
        "best-fit": "downloads",
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
      if (!append) setError(err.message || "Failed to load models")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    setOffset(0)
    fetchModels("", sort, 0, false)
  }, [mounted, sort, fetchModels])

  // Enrich with compatibility + best-fit score
  const modelCards: ModelCard[] = useMemo(() => {
    const enriched = rawModels.map((m) => {
      if (specs && m.estimatedSizeGB != null) {
        const compat = computeCompatibility(m.estimatedSizeGB, m.contextLength ?? null, specs)
        return { ...m, compatibility: compat.rating, compatibilityScore: compat.score, matchReason: compat.reason } as ModelCard
      }
      return { ...m, compatibility: "unknown" as const, compatibilityScore: 0, matchReason: "No specs configured" } as ModelCard
    })

    // Apply client-side filters
    let filtered = enriched.filter((m: ModelCard) => {
      if (filters.compatibility.length > 0 && !filters.compatibility.includes(m.compatibility)) return false
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase()
        if (!m.modelId.toLowerCase().includes(q) && !(m.name || "").toLowerCase().includes(q) && !m.author.toLowerCase().includes(q)) return false
      }
      return true
    })

    // Sort by best-fit when that option is selected
    if (sort === "best-fit" && specs) {
      filtered.sort((a, b) => computeBestFitScore(b) - computeBestFitScore(a))
    }

    return filtered
  }, [rawModels, specs, filters.searchQuery, filters.compatibility, sort])

  // Category picks — top 4 models per category, sorted by best-fit
  const categoryPicks = useMemo(() => {
    if (!specs || isSearching) return []
    return CATEGORIES.map((cat) => {
      const matching = modelCards
        .filter((m) => m.pipeline_tag === cat.key && m.compatibility !== "heavy" && m.compatibility !== "unknown")
        .sort((a, b) => computeBestFitScore(b) - computeBestFitScore(a))
        .slice(0, 4)
      return { ...cat, models: matching }
    }).filter((cat) => cat.models.length > 0)
  }, [modelCards, specs, isSearching])

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
    setFilters({ searchQuery: value })
    setIsSearching(!!value.trim())

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

  // Stats for the specs summary
  const smoothCount = modelCards.filter(m => m.compatibility === "smooth").length
  const slowCount = modelCards.filter(m => m.compatibility === "slow").length
  const heavyCount = modelCards.filter(m => m.compatibility === "heavy").length

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden xl:block w-64 flex-shrink-0 border-r bg-muted/20 overflow-y-auto">
        <div className="p-3 space-y-4">
          {specs && hasEnteredSpecs && (
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your hardware</span>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => router.push("/")}>
                  <Settings2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                <span>RAM: {specs.ramGB} GB</span>
                <span>VRAM: {specs.vramGB ? `${specs.vramGB} GB` : "CPU"}</span>
                <span>Cores: {specs.cpuCores}</span>
                <span>Disk: {specs.diskFreeGB} GB</span>
              </div>
              <Separator className="my-1.5" />
              <div className="flex gap-2 text-[10px]">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{smoothCount} smooth</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">{slowCount} slow</span>
                <span className="text-red-500 font-medium">{heavyCount} heavy</span>
              </div>
            </div>
          )}
          {!hasEnteredSpecs && (
            <div className="p-2.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 space-y-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Add your hardware specs to see compatibility scores and personalized recommendations.
              </p>
              <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 w-full" onClick={() => router.push("/")}>
                <Settings2 className="w-3 h-3" />Set up specs
              </Button>
            </div>
          )}
          <FilterSidebar />
        </div>
      </aside>

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

            <Sheet>
              <SheetTrigger>
                <Button variant="outline" size="sm" className="xl:hidden gap-1.5 shrink-0 h-8">
                  <Filter className="w-3.5 h-3.5" />Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="p-3"><FilterSidebar /></div>
              </SheetContent>
            </Sheet>

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
              {modelCards.length} models
            </Badge>
            {isFallback && (
              <Badge variant="outline" className="text-[10px] px-2 py-0 text-amber-600 border-amber-400 shrink-0">offline</Badge>
            )}

            <Select value={sort} onValueChange={(v) => { if (v) setSort(v) }}>
              <SelectTrigger className="w-28 h-8 text-xs shrink-0 border-none bg-muted/30 gap-1">
                <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best-fit">Best fit</SelectItem>
                <SelectItem value="downloads">Downloads</SelectItem>
                <SelectItem value="likes">Likes</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md overflow-hidden shrink-0">
              <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0 rounded-none" onClick={() => setViewMode("grid")}>
                <Grid className="w-3.5 h-3.5" />
              </Button>
              <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0 rounded-none" onClick={() => setViewMode("list")}>
                <List className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 xl:hidden" onClick={() => router.push("/")}>
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </header>

        {/* Active Filters */}
        {(filters.compatibility.length > 0 || filters.tasks.length > 0 || searchInput) && (
          <div className="px-3 py-1.5 border-b flex flex-wrap gap-1.5 items-center bg-muted/10">
            <span className="text-[10px] text-muted-foreground mr-0.5">Filters:</span>
            {searchInput && (
              <Badge variant="secondary" className="text-[10px] gap-0.5">
                &quot;{searchInput}&quot;
                <button className="ml-0.5 hover:text-foreground" onClick={() => { setSearchInput(""); setFilters({ searchQuery: "" }); setIsSearching(false); setOffset(0); fetchModels("", sort, 0, false); }}>x</button>
              </Badge>
            )}
            {filters.compatibility.map((c) => (
              <Badge key={c} variant="outline" className="text-[10px] gap-0.5">
                {c}<button className="ml-0.5 hover:text-foreground" onClick={() => setFilters({ compatibility: [] })}>x</button>
              </Badge>
            ))}
            <button className="text-[10px] text-primary hover:underline ml-1" onClick={() => { setSearchInput(""); setIsSearching(false); setFilters({ compatibility: [], tasks: [], formats: [], licenses: [], searchQuery: "" }); setOffset(0); fetchModels("", sort, 0, false); }}>
              Clear all
            </button>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading models...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchModels(searchInput, sort, 0, false)}>
                <RefreshCw className="w-3.5 h-3.5" />Retry
              </Button>
            </div>
          )}

          {!loading && !error && modelCards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-5 max-w-sm mx-auto text-center">
              <Sparkles className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm font-medium">No models found</p>
              <p className="text-xs text-muted-foreground">Try a different search or clear your filters.</p>
              {searchInput && (
                <Button variant="outline" size="sm" onClick={() => { setSearchInput(""); setIsSearching(false); setFilters({ searchQuery: "" }); setOffset(0); fetchModels("", sort, 0, false); }}>
                  Clear search
                </Button>
              )}
            </div>
          )}

          {!loading && !error && modelCards.length > 0 && (
            <div className="p-3 lg:p-5 space-y-8">

              {/* Category Picks — only when specs are set and not searching */}
              {categoryPicks.length > 0 && !isSearching && filters.compatibility.length === 0 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      Best for your hardware
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Top compatible models per category, ranked by fit + popularity
                    </p>
                  </div>

                  {categoryPicks.map((cat) => (
                    <div key={cat.key}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold flex items-center gap-1.5">
                          <span>{cat.emoji}</span>
                          {cat.label}
                          <span className="text-[10px] font-normal text-muted-foreground">{cat.desc}</span>
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {cat.models.map((model) => (
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
                    </div>
                  ))}

                  <Separator />
                </div>
              )}

              {/* All Models grid */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                  {isSearching ? `Results for "${searchInput}"` : "All models"}
                </h2>
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2.5"
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

                {hasMore && (
                  <div className="flex justify-center pt-6 pb-4">
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleLoadMore} disabled={loadingMore}>
                      {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      {loadingMore ? "Loading..." : "Load more models"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
