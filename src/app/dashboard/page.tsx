"use client"

import { useEffect, useState, useMemo } from "react"
import { MOCK_MODELS } from "@/lib/mock-data"
import { ModelGridItem } from "@/components/model/model-grid-item"
import { FilterSidebar } from "@/components/filters/filter-sidebar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/store/use-app-store"
import { computeCompatibility } from "@/lib/compatibility"
import type { ModelCard } from "@/types/model"
import { Search, Grid, List, Filter, Zap, Settings, Moon, Sun } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  const { specs, hasEnteredSpecs, loadFromStorage, bookmarks, addBookmark, removeBookmark, filters, setFilters, openrouterApiKey } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    loadFromStorage()
    setMounted(true)
  }, [loadFromStorage])

  if (!mounted) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  )

  // Enrich models with compatibility
  const enrichedModels: ModelCard[] = MOCK_MODELS.map((m) => {
    if (specs && m.estimatedSizeGB != null) {
      const compat = computeCompatibility(m.estimatedSizeGB, m.contextLength ?? null, specs)
      return {
        ...m,
        compatibility: compat.rating,
        compatibilityScore: compat.score,
        matchReason: compat.reason,
      } as ModelCard
    }
    return {
      ...m,
      compatibility: "unknown",
      compatibilityScore: 0,
      matchReason: "No specs configured",
    } as ModelCard
  })

  // Apply filters
  const filtered = useMemo(() => {
    let result = enrichedModels

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.modelId.toLowerCase().includes(q) ||
          m.name?.toLowerCase().includes(q) ||
          m.author.toLowerCase().includes(q)
      )
    }
    if (filters.compatibility.length > 0) {
      result = result.filter((m) => filters.compatibility.includes(m.compatibility))
    }
    if (filters.tasks.length > 0) {
      result = result.filter((m) => m.pipeline_tag && filters.tasks.includes(m.pipeline_tag))
    }
    if (filters.formats.length > 0) {
      result = result.filter((m) => m.format && filters.formats.includes(m.format))
    }
    if (filters.sizeMinGB !== null) {
      result = result.filter((m) => (m.estimatedSizeGB ?? 0) >= filters.sizeMinGB!)
    }
    if (filters.sizeMaxGB !== null) {
      result = result.filter((m) => (m.estimatedSizeGB ?? Infinity) <= filters.sizeMaxGB!)
    }
    if (filters.paramMinB !== null) {
      result = result.filter((m) => (m.paramCount ?? 0) >= filters.paramMinB!)
    }
    if (filters.paramMaxB !== null) {
      result = result.filter((m) => (m.paramCount ?? Infinity) <= filters.paramMaxB!)
    }

    result = [...result].sort((a, b) => {
      const dir = filters.sortDir === "asc" ? 1 : -1
      switch (filters.sortBy) {
        case "score":
          return (b.compatibilityScore - a.compatibilityScore) * dir
        case "downloads":
          return (b.downloads - a.downloads) * dir
        case "trending":
          return (b.trendingScore - a.trendingScore) * dir
        case "updated":
          return (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) * dir
        case "name":
          return a.name.localeCompare(b.name) * dir
        default:
          return 0
      }
    })

    return result
  }, [enrichedModels, filters])

  const totalCount = MOCK_MODELS.length
  const filteredCount = filtered.length
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

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
            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer shrink-0"
              onClick={() => router.push("/")}
            >
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

            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search models, authors..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ searchQuery: e.target.value })}
                className="pl-9 h-9 text-sm bg-muted/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs shrink-0">
              {filteredCount} / {totalCount}
            </Badge>

            {/* Sort */}
            <Select value={filters.sortBy} onValueChange={(v) => setFilters({ sortBy: v as typeof filters.sortBy })}>
              <SelectTrigger className="w-32 h-8 text-xs shrink-0">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="downloads">Downloads</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            {/* View toggle */}
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0 rounded-none"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0 rounded-none"
                onClick={() => setViewMode("list")}
              >
                <List className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </header>

        {/* Active Filters Strip */}
        {(filters.compatibility.length > 0 || filters.tasks.length > 0 || filters.searchQuery) && (
          <div className="px-4 py-2 border-b flex flex-wrap gap-2 items-center bg-muted/20">
            <span className="text-xs text-muted-foreground mr-1">Active:</span>
            {filters.searchQuery && (
              <Badge variant="secondary" className="text-xs gap-1">
                &quot;{filters.searchQuery}&quot;
                <button className="ml-0.5 hover:text-foreground" onClick={() => setFilters({ searchQuery: "" })}>x</button>
              </Badge>
            )}
            {filters.compatibility.map((c) => (
              <Badge key={c} variant="secondary" className="text-xs gap-1">
                {c}
                <button className="ml-0.5 hover:text-foreground" onClick={() => setFilters({ compatibility: filters.compatibility.filter((x) => x !== c) })}>x</button>
              </Badge>
            ))}
            {filters.tasks.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs gap-1">
                {t}
                <button className="ml-0.5 hover:text-foreground" onClick={() => setFilters({ tasks: filters.tasks.filter((x) => x !== t) })}>x</button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-5 text-xs px-2" onClick={() => setFilters({ compatibility: [], tasks: [], searchQuery: "", formats: [] })}>
              Clear all
            </Button>
          </div>
        )}

        {/* Model Grid */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <Filter className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-lg font-medium text-muted-foreground">No models match your filters</p>
              <Button variant="outline" onClick={() => setFilters({ compatibility: [], tasks: [], formats: [], licenses: [], sizeMinGB: null, sizeMaxGB: null, paramMinB: null, paramMaxB: null, searchQuery: "" })}>
                Clear all filters
              </Button>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4"
                  : "flex flex-col gap-3 max-w-4xl mx-auto"
              }
            >
              {filtered.map((model) => (
                <ModelGridItem
                  key={model.modelId}
                  model={model}
                  isBookmarked={bookmarks.some((b) => b.modelId === model.modelId)}
                  onToggleBookmark={(id) => {
                    if (bookmarks.some((b) => b.modelId === id)) {
                      removeBookmark(id)
                    } else {
                      addBookmark(id)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
