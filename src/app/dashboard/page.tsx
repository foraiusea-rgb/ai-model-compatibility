"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { computeCompatibility } from "@/lib/compatibility"
import { loadPreferences } from "@/lib/storage"
import {
  Search, Grid, List, Filter, Zap, Loader2, Moon, Sun,
  Star, Download, Clock, Cpu, HardDrive, ChevronDown, ChevronRight,
} from "lucide-react"

// ── Utility functions ──

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
    case "smooth": return { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "✓ Smooth" }
    case "slow": return { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "⚠ Slow" }
    case "heavy": return { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "✗ Heavy" }
    default: return { color: "bg-muted text-muted-foreground border-border", label: "Unknown" }
  }
}

// ── Simple UI Components (pure HTML, no @base-ui) ──

function Input(props: any) {
  return <input {...props} className={`px-3 py-1.5 text-sm bg-muted/30 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary ${props.className || ""}`} />
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${className || ""}`}>{children}</span>
}

function Card({ children, onClick, className, onMouseEnter, onMouseLeave }: { children: React.ReactNode; onClick?: () => void; className?: string; onMouseEnter?: () => void; onMouseLeave?: () => void }) {
  return (
    <div onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className={`rounded-lg border border-border/60 bg-card/50 backdrop-blur-sm cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 ${className || ""}`}>
      {children}
    </div>
  )
}

function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 ${className || ""}`}>{children}</div>
}

// ── Model Card Component ──

function ModelCard({ model, specs }: { model: any; specs: any }) {
  const [hovered, setHovered] = useState(false)
  
  const compat = useMemo(() => {
    if (specs && model.estimatedSizeGB != null) {
      return computeCompatibility(model.estimatedSizeGB, model.contextLength || null, specs)
    }
    return null
  }, [specs, model.estimatedSizeGB, model.contextLength])

  const badge = compat ? getCompatBadge(compat.rating) : null
  const dlDisplay = model.downloads >= 1000000 ? `${(model.downloads / 1000000).toFixed(1)}M` : model.downloads >= 1000 ? `${(model.downloads / 1000).toFixed(0)}K` : model.downloads.toString()
  const timeAgo = relativeDate(model.updatedAt || model.lastModified || model.createdAt || "")

  return (
    <Card onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{model.name || model.modelId?.split("/").pop() || model.id || "?"}</h3>
            <p className="text-[11px] text-muted-foreground/70 truncate">{model.author || "unknown"}</p>
          </div>
          {hovered && (
            <button className="shrink-0">
              <Star className="w-3.5 h-3.5 text-muted-foreground hover:text-amber-400" />
            </button>
          )}
        </div>

        {badge && <Badge className={badge.color}>{badge.label}</Badge>}

        {model.estimatedSizeGB != null && (
          <div className="flex items-center gap-1.5 text-muted-foreground/60">
            <HardDrive className="w-3 h-3" />
            <span className="text-xs font-mono">~{model.estimatedSizeGB.toFixed(1)} GB</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/60">
          <div className="flex items-center gap-1"><Download className="w-3 h-3" /><span>{dlDisplay}</span></div>
          {timeAgo && <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{timeAgo}</span></div>}
          {model.paramCount && <div className="flex items-center gap-1"><Cpu className="w-3 h-3" /><span>{model.paramCount}B</span></div>}
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

// ── Filter Sidebar ──

function FilterSidebar({ compatFilter, setCompatFilter }: { compatFilter: Set<string>; setCompatFilter: (f: Set<string>) => void }) {
  const compatOptions = [
    { label: "✓ Smooth", value: "smooth" },
    { label: "⚠ Slow", value: "slow" },
    { label: "✗ Heavy", value: "heavy" },
  ]

  const toggleCompat = (value: string) => {
    const next = new Set(compatFilter)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setCompatFilter(next)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 pb-2">
        <h3 className="font-semibold text-sm">Filters</h3>
        <button onClick={() => setCompatFilter(new Set())} className="text-[10px] text-muted-foreground hover:text-foreground">Reset</button>
      </div>

      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Compatibility</div>
      {compatOptions.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/40 rounded-md cursor-pointer">
          <input type="checkbox" checked={compatFilter.has(opt.value)} onChange={() => toggleCompat(opt.value)} className="h-3 w-3" />
          <span className="text-xs select-none">{opt.label}</span>
        </label>
      ))}
    </div>
  )
}

// ── Sort Dropdown (pure HTML) ──

function SortDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const options = [
    { value: "downloads", label: "Downloads" },
    { value: "likes", label: "Likes" },
    { value: "lastModified", label: "Updated" },
  ]

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="h-7 px-2.5 text-xs rounded-md bg-muted/30 border border-border flex items-center gap-1 hover:bg-muted/50">
        <Zap className="w-3 h-3" />
        <span>{options.find(o => o.value === value)?.label || value}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
    )
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(false)} className="h-7 px-2.5 text-xs rounded-md bg-muted/30 border border-border flex items-center gap-1">
        <Zap className="w-3 h-3" />
        <span>{options.find(o => o.value === value)?.label || value}</span>
        <ChevronRight className="w-3 h-3 rotate-90" />
      </button>
      <div className="absolute top-full mt-1 right-0 bg-popover border rounded-md shadow-lg z-50 min-w-[120px] overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { onChange(opt.value); setOpen(false) }}
            className="block w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Close dropdown on outside click (use inside SortDropdown) ──
// Simplified: click the button again closes it

// ── Main Dashboard Page ──

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [theme, setThemeState] = useState<"dark" | "light">("dark")
  const [searchInput, setSearchInput] = useState("")
  const [sort, setSort] = useState("downloads")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [specs, setSpecs] = useState<any>(null)
  const [models, setModels] = useState<any[]>([])
  const [totalModels, setTotalModels] = useState(0)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [compatFilter, setCompatFilter] = useState<Set<string>>(new Set())
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null)

  // Load settings
  useEffect(() => {
    loadPreferences().then((prefs) => {
      if (prefs.specs) setSpecs(prefs.specs)
      if (prefs.theme === "light") setThemeState("light")
    })
    setMounted(true)
  }, [])

  // Fetch models
  const fetchModels = useCallback(async (searchQuery: string, sortOrder: string) => {
    setLoading(true)
    setApiError(null)
    try {
      const params = new URLSearchParams()
      params.set("limit", "60")
      params.set("sort", sortOrder)
      if (searchQuery) params.set("q", searchQuery)

      const res = await fetch(`/api/models?${params.toString()}`)
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      setModels(data.models || [])
      setTotalModels(data.total || 0)
    } catch (err: any) {
      setApiError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    if (mounted) fetchModels("", "downloads")
  }, [mounted, fetchModels])

  // Debounced search
  const handleSearch = (value: string) => {
    setSearchInput(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      fetchModels(value, sort)
    }, 500)
  }

  const handleSort = (value: string) => {
    setSort(value)
    fetchModels(searchInput, value)
  }

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setThemeState(next)
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  // Apply filters to loaded models
  const filteredModels = useMemo(() => {
    const withCompat = models.map((m) => {
      const compat = specs && m.estimatedSizeGB != null
        ? computeCompatibility(m.estimatedSizeGB, m.contextLength || null, specs)
        : { rating: "unknown" as const, score: 0 }
      return { ...m, compatibility: compat.rating, compatibilityScore: compat.score }
    })
    
    if (compatFilter.size === 0) return withCompat
    return withCompat.filter((m) => compatFilter.has(m.compatibility))
  }, [models, specs, compatFilter])

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
        <aside className="hidden xl:block w-60 flex-shrink-0 border-r bg-muted/20 overflow-y-auto p-3">
          <FilterSidebar compatFilter={compatFilter} setCompatFilter={setCompatFilter} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="border-b bg-background/80 backdrop-blur-md px-3 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => (window.location.href = "/")}>
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <span className="font-bold text-sm hidden sm:inline">ModelDB</span>
              </div>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder={totalModels > 0 ? `Search ${totalModels.toLocaleString()} models...` : "Search models..."}
                  value={searchInput}
                  onChange={(e: any) => handleSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Badge className="text-[10px] font-mono px-2 py-0">
                {totalModels > 0 ? totalModels.toLocaleString() : "—"} shown
              </Badge>
              <SortDropdown value={sort} onChange={handleSort} />
              <div className="flex border rounded-md overflow-hidden">
                <button onClick={() => setViewMode("grid")} className={`h-7 w-7 flex items-center justify-center ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}>
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setViewMode("list")} className={`h-7 w-7 flex items-center justify-center ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}>
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
              <button onClick={toggleTheme} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted/50">
                {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </header>

          {/* Filter strip */}
          {compatFilter.size > 0 && (
            <div className="px-3 py-1.5 border-b flex flex-wrap gap-1.5 items-center bg-muted/10">
              <span className="text-[10px] text-muted-foreground mr-0.5">Filters:</span>
              {Array.from(compatFilter).map((c) => (
                <Badge key={c} className="text-[10px] gap-0.5 border">
                  {c}
                  <button className="ml-0.5 hover:text-foreground" onClick={() => { const next = new Set(compatFilter); next.delete(c); setCompatFilter(next) }}>×</button>
                </Badge>
              ))}
              <button className="text-[10px] text-primary hover:underline ml-1" onClick={() => setCompatFilter(new Set())}>Clear all</button>
            </div>
          )}

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-3 lg:p-5">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-3 text-sm text-muted-foreground">Loading from HuggingFace...</span>
              </div>
            ) : apiError ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-red-400 font-medium">{apiError}</p>
                <button onClick={() => fetchModels(searchInput, sort)} className="mt-3 text-sm text-primary hover:underline">Retry</button>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                <p className="text-lg font-medium">No models match your filters</p>
                <button onClick={() => setCompatFilter(new Set())} className="mt-3 text-sm text-primary hover:underline">Clear filters</button>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3" : "flex flex-col gap-2 max-w-4xl mx-auto"}>
                {filteredModels.map((model) => (
                  <ModelCard key={model.modelId || model.id} model={model} specs={specs} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
