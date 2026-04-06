"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Search, Grid, List, Filter, Zap, Loader2, Moon, Sun,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAppStore } from "@/store/use-app-store"
import { computeCompatibility } from "@/lib/compatibility"
import { useTheme } from "next-themes"
import type { ModelCard } from "@/types/model"
import { useRouter } from "next/navigation"
import { ModelGridItem } from "@/components/model/model-grid-item"
import { FilterSidebar } from "@/components/filters/filter-sidebar"

export default function DashboardPage() {
  const router = useRouter()
  const { specs, loadFromStorage, bookmarks, addBookmark, removeBookmark, filters, setFilters } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [sort, setSort] = useState("downloads")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    loadFromStorage()
    setMounted(true)
  }, [loadFromStorage])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Enrich models with compatibility
  const modelCount = 10
  const modelCards: ModelCard[] = useMemo(() => {
    // Use mock for now (real API is in production)
    const { MOCK_MODELS } = require("@/lib/mock-data")
    return MOCK_MODELS.map((m: any) => {
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
  }, [specs, filters.searchQuery, filters.compatibility])

  const handleSearch = (value: string) => {
    setSearchInput(value)
    setFilters({ searchQuery: value })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar — compact */}
      <aside className="hidden xl:block w-64 flex-shrink-0 border-r bg-muted/20 overflow-y-auto">
        <div className="p-3">
          <FilterSidebar />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar — sticky, compact */}
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
                placeholder="Search 2.7M+ models..."
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

            {/* Sort */}
            <Select value={sort} onValueChange={(v) => { if (v) setSort(v) }}>
              <SelectTrigger className="w-24 h-8 text-xs shrink-0 border-none bg-muted/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="downloads">Downloads</SelectItem>
                <SelectItem value="likes">Likes</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
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
                "{searchInput}"
                <button className="ml-0.5 hover:text-foreground" onClick={() => { setSearchInput(""); setFilters({ searchQuery: "" }); }}>×</button>
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

        {/* Model Grid */}
        <main className="flex-1 overflow-y-auto p-3 lg:p-5">
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
        </main>
      </div>
    </div>
  )
}
