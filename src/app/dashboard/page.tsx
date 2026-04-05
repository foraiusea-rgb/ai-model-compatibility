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
import { Search, Grid, List, Settings, Filter } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function DashboardPage() {
  const { specs, hasEnteredSpecs, loadFromStorage, bookmarks, addBookmark, removeBookmark, filters, setFilters } = useAppStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    loadFromStorage()
    setMounted(true)
  }, [loadFromStorage])

  if (!mounted) return null

  // Enrich models with compatibility
  const enrichedModels: ModelCard[] = MOCK_MODELS.map((m) => {
    if (specs && m.estimatedSizeGB) {
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

    // Search
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.modelId.toLowerCase().includes(q) ||
          m.name?.toLowerCase().includes(q) ||
          m.author.toLowerCase().includes(q)
      )
    }

    // Compatibility
    if (filters.compatibility.length > 0) {
      result = result.filter((m) => filters.compatibility.includes(m.compatibility))
    }

    // Tasks
    if (filters.tasks.length > 0) {
      result = result.filter((m) => m.pipeline_tag && filters.tasks.includes(m.pipeline_tag))
    }

    // Format
    if (filters.formats.length > 0) {
      result = result.filter((m) => m.format && filters.formats.includes(m.format))
    }

    // Size range
    if (filters.sizeMinGB !== null) {
      result = result.filter((m) => (m.estimatedSizeGB ?? 0) >= filters.sizeMinGB!)
    }
    if (filters.sizeMaxGB !== null) {
      result = result.filter((m) => (m.estimatedSizeGB ?? Infinity) <= filters.sizeMaxGB!)
    }

    // Param range
    if (filters.paramMinB !== null) {
      result = result.filter((m) => (m.paramCount ?? 0) >= filters.paramMinB!)
    }
    if (filters.paramMaxB !== null) {
      result = result.filter((m) => (m.paramCount ?? Infinity) <= filters.paramMaxB!)
    }

    // Sort
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
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 flex-shrink-0 border-r bg-muted/20 p-4">
        <FilterSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="border-b p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Mobile filter - hidden on desktop */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="p-4">
                    <FilterSidebar />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ searchQuery: e.target.value })}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {filteredCount} / {totalCount} models
            </Badge>

            {/* Sort */}
            <Select value={filters.sortBy} onValueChange={(v) => setFilters({ sortBy: v as typeof filters.sortBy })}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Compatibility</SelectItem>
                <SelectItem value="downloads">Downloads</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            {/* View toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {(filters.compatibility.length > 0 ||
          filters.tasks.length > 0 ||
          filters.formats.length > 0 ||
          filters.searchQuery) && (
          <div className="px-4 py-2 border-b flex flex-wrap gap-2">
            {filters.searchQuery && (
              <Badge variant="secondary" className="text-xs gap-1">
                Search: "{filters.searchQuery}"
                <button
                  className="ml-1 hover:text-foreground"
                  onClick={() => setFilters({ searchQuery: "" })}
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.compatibility.map((c) => (
              <Badge key={c} variant="secondary" className="text-xs gap-1">
                {c}
                <button
                  className="ml-1 hover:text-foreground"
                  onClick={() => setFilters({ compatibility: filters.compatibility.filter((x) => x !== c) })}
                >
                  ×
                </button>
              </Badge>
            ))}
            {filters.tasks.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs gap-1">
                {t}
                <button
                  className="ml-1 hover:text-foreground"
                  onClick={() => setFilters({ tasks: filters.tasks.filter((x) => x !== t) })}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Model Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-lg font-medium text-muted-foreground">No models match your filters</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() =>
                  setFilters({
                    compatibility: [],
                    tasks: [],
                    formats: [],
                    licenses: [],
                    sizeMinGB: null,
                    sizeMaxGB: null,
                    paramMinB: null,
                    paramMaxB: null,
                    searchQuery: "",
                  })
                }
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "flex flex-col gap-3 max-w-3xl"
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
        </div>
      </div>
    </div>
  )
}
