"use client"

import { useState, useEffect, useMemo } from "react"
import { MOCK_MODELS } from "@/lib/mock-data"
import { computeCompatibility } from "@/lib/compatibility"
import type { ModelCard, CompatibilityRating } from "@/types/model"

// Zustand for state
import { create } from "zustand"
import { loadPreferences } from "@/lib/storage"

// Icons only
import {
  Search, Grid, List, Filter, Zap, Loader2, Moon, Sun,
  Star, Download, Clock, Cpu, HardDrive, ChevronDown, ChevronRight,
} from "lucide-react"

// Custom store - no hooks here, just state
const useStore = create<{
  filters: {
    search: string
    compat: CompatibilityRating[]
  }
  setFilters: (f: Partial<{ search: string; compat: CompatibilityRating[] }>) => void
}>((set) => ({
  filters: { search: "", compat: [] },
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
}))

function relativeDate(dateStr: string): string {
  try {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ""
    const diff = Date.now() - d.getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return `${Math.floor(days / 30)}mo ago`
  } catch { return "" }
}

function getCompatBadge(rating: string) {
  switch (rating) {
    case "smooth": return { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "✓ Runs Smoothly" }
    case "slow": return { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "⚠ Runs Slow" }
    case "heavy": return { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "✗ Too Heavy" }
    default: return { color: "bg-muted text-muted-foreground border-border", label: "?" }
  }
}

// Simple Input component
function Input(props: any) {
  return (
    <input
      {...props}
      className={`px-3 py-1.5 text-sm bg-muted/30 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary ${props.className || ""}`}
    />
  )
}

// Simple Select component
function SelectComp({ value, onValueChange, icon: Icon, children }: any) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="h-7 px-2.5 text-xs rounded-md bg-muted/30 border border-border flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        <span>{value}</span>
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-popover border rounded-md shadow-lg z-50 min-w-[120px]">
          {(children as any[]).map((child: any, i: number) => (
            <button
              key={i}
              onClick={() => { onValueChange(child.value); setOpen(false) }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50"
            >
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Simple Card component
function Card({ children, onClick, className }: any) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg border border-border/60 bg-card/50 backdrop-blur-sm cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 ${className || ""}`}
    >
      {children}
    </div>
  )
}

// Simple CardContent
function CardContent({ children, className }: any) {
  return <div className={`p-4 ${className || ""}`}>{children}</div>
}

// Simple Badge
function Badge({ children, className }: any) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${className || ""}`}>
      {children}
    </span>
  )
}

// Simple Filter Sidebar
function FilterSidebar({ compact }: { compact?: boolean }) {
  const { filters, setFilters } = useStore()

  const compatOptions: { label: string; value: CompatibilityRating }[] = [
    { label: "✓ Smooth", value: "smooth" },
    { label: "⚠ Slow", value: "slow" },
    { label: "✗ Heavy", value: "heavy" },
  ]

  const taskOptions = [
    "text-generation", "text-to-image", "text-to-speech", "image-classification", "speech-to-text"
  ]

  return (
    <div className={compact ? "space-y-3 text-xs" : "space-y-4"}>
      <div className="flex items-center justify-between px-2">
        <h3 className="font-semibold text-sm">Filters</h3>
        <button onClick={() => setFilters({ search: "", compat: [] })} className="text-[10px] text-muted-foreground hover:text-foreground">Reset</button>
      </div>

      <div className="space-y-1">
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Compatibility</div>
        {compatOptions.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/40 rounded-md cursor-pointer">
            <input
              type="checkbox"
              checked={filters.compat.includes(opt.value)}
              onChange={() => {
                const newCompat = filters.compat.includes(opt.value)
                  ? filters.compat.filter((c) => c !== opt.value)
                  : [...filters.compat, opt.value]
                setFilters({ compat: newCompat })
              }}
              className="h-3 w-3"
            />
            <span className="text-xs select-none">{opt.label}</span>
          </label>
        ))}
      </div>

      <div className="space-y-1">
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tasks</div>
        {taskOptions.map((task) => (
          <label key={task} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/40 rounded-md cursor-pointer">
            <input type="checkbox" className="h-3 w-3" />
            <span className="text-xs select-none">{task.replace(/-/g, " ")}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// Simple Model Card
// Simple Model Card
function ModelCard({ model, specs }: { model: any; specs: any }) {
  const compat = useMemo(() => {
    if (specs && model.estimatedSizeGB != null) {
      return computeCompatibility(model.estimatedSizeGB, model.contextLength || null, specs)
    }
    return null
  }, [specs, model])

  const badge = compat ? getCompatBadge(compat.rating) : null
  const dlDisplay = model.downloads >= 1000000 ? `${(model.downloads / 1000000).toFixed(1)}M` : model.downloads >= 1000 ? `${(model.downloads / 1000).toFixed(0)}K` : model.downloads.toString()
  const timeAgo = relativeDate(model.updatedAt || model.lastModified || "")

  return (
    <Card onClick={() => console.log("View:", model.modelId)}>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{model.name || model.modelId.split("/").pop()}</h3>
            <p className="text-[11px] text-muted-foreground/70 truncate">{model.author}</p>
          </div>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Star className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {badge && <Badge className={badge.color}>{badge.label}</Badge>}

        <div className="flex items-center gap-1.5 text-muted-foreground/60">
          <HardDrive className="w-3 h-3" />
          <span className="text-xs font-mono">~{model.estimatedSizeGB?.toFixed(1) || "?"} GB</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/60">
          <div className="flex items-center gap-1"><Download className="w-3 h-3" /><span>{dlDisplay}</span></div>
          <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{timeAgo}</span></div>
        </div>

        {model.pipeline_tag && (
          <div className="flex flex-wrap gap-1">
            <Badge className="bg-primary/20 text-primary">{model.pipeline_tag}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [searchInput, setSearchInput] = useState("")
  const [sort, setSort] = useState("downloads")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [specs, setSpecs] = useState<any>(null)

  // Load specs from storage
  useEffect(() => {
    loadPreferences().then((prefs) => {
      if (prefs.specs) setSpecs(prefs.specs)
      if (prefs.theme === "light" || prefs.theme === "system") setTheme("light")
    })
    setMounted(true)
  }, [])

  const { filters, setFilters } = useStore()

  // Sync search with global filters
  useEffect(() => {
    setFilters({ search: searchInput })
  }, [searchInput, setFilters])

  // Get models
  const enrichedModels = useMemo(() => {
    return MOCK_MODELS.filter((m) => {
      const compat = specs && m.estimatedSizeGB != null ? computeCompatibility(m.estimatedSizeGB, m.contextLength || null, specs) : null
      const rating = compat?.rating || "unknown"

      if (filters.compat.length > 0 && !filters.compat.includes(rating as any)) return false
      return true
    }).map((m) => {
      const compat = specs && m.estimatedSizeGB != null ? computeCompatibility(m.estimatedSizeGB, m.contextLength || null, specs) : { rating: "unknown", score: 0, reason: "No specs" }
      return { ...m, compatibility: compat.rating, compatibilityScore: compat.score }
    })
  }, [specs, filters.compat])

  const handleSortChange = (v: string) => setSort(v)
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={theme === "light" ? "" : "dark"}>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {/* Sidebar */}
        <aside className="hidden xl:block w-64 flex-shrink-0 border-r bg-muted/20 overflow-y-auto p-3">
          <FilterSidebar />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="border-b bg-background/80 backdrop-blur-md px-3 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = "/"}>
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <span className="font-bold text-sm hidden sm:inline">ModelDB</span>
              </div>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search 2.7M+ models..."
                  value={searchInput}
                  onChange={(e: any) => setSearchInput(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Badge className="text-[10px] font-mono px-2 py-0">{enrichedModels.length} models</Badge>

              <SelectComp value={sort} onValueChange={handleSortChange} icon={Zap}>
                {[
                  { value: "downloads", label: "Downloads" },
                  { value: "likes", label: "Likes" },
                  { value: "updated", label: "Updated" },
                ].map((opt) => (
                  <div key={opt.value} onClick={() => { handleSortChange(opt.value); }} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 cursor-pointer">
                    {opt.label}
                  </div>
                ))}
              </SelectComp>

              <div className="flex border rounded-md overflow-hidden">
                <button onClick={() => setViewMode("grid")} className={`h-7 w-7 flex items-center justify-center ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}>
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setViewMode("list")} className={`h-7 w-7 flex items-center justify-center ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}>
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              <button onClick={toggleTheme} className="h-7 w-7 flex items-center justify-center">
                {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </header>

          {/* Model Grid */}
          <main className="flex-1 overflow-y-auto p-3 lg:p-5">
            <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3" : "flex flex-col gap-2 max-w-4xl mx-auto"}>
              {enrichedModels.map((model) => (
                <ModelCard key={model.modelId} model={model} specs={specs} />
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
