"use client"

import { useAppStore } from "@/store/use-app-store"
import { computeCompatibility, getCompatibilityColor, getCompatibilityLabel, getCompatibilityIcon } from "@/lib/compatibility"
import type { ModelCard } from "@/types/model"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Zap, X, HardDrive, Cpu, FileText, Download, Scale, Moon, Sun } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"

function MemoryBar({ model, specs }: { model: ModelCard; specs: { vramGB: number | null; ramGB: number } }) {
  const memTotal = specs.vramGB || specs.ramGB
  const pct = model.estimatedSizeGB ? Math.min(100, Math.round((model.estimatedSizeGB / memTotal) * 100)) : 0
  const barColor = model.compatibility === "smooth" ? "bg-emerald-500" : model.compatibility === "slow" ? "bg-amber-500" : "bg-red-500"

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        <span>{model.estimatedSizeGB?.toFixed(1) || "?"} GB</span>
        <span>{pct}% of {specs.vramGB ? "VRAM" : "RAM"}</span>
      </div>
      <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CompatBreakdown({ model, specs }: { model: ModelCard; specs: { vramGB: number | null; ramGB: number } }) {
  if (!model.estimatedSizeGB) return null
  const memTotal = specs.vramGB || specs.ramGB
  const memLabel = specs.vramGB ? "VRAM" : "RAM"
  const headroom = memTotal - model.estimatedSizeGB
  const headroomPct = Math.round((headroom / memTotal) * 100)

  return (
    <div className="text-[11px] text-muted-foreground space-y-1 p-2.5 rounded-lg bg-muted/30 border border-border/50">
      <p>Model needs <span className="font-semibold text-foreground">{model.estimatedSizeGB.toFixed(1)} GB</span></p>
      <p>Your {memLabel}: <span className="font-semibold text-foreground">{memTotal} GB</span></p>
      <p>Headroom: <span className={`font-semibold ${headroom >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
        {headroom >= 0 ? `${headroom.toFixed(1)} GB (${headroomPct}%)` : `${Math.abs(headroom).toFixed(1)} GB over`}
      </span></p>
      {model.contextLength && (
        <p>Context overhead: ~{Math.min(model.estimatedSizeGB * 0.5, (model.contextLength / 1000) * 0.1 * (model.estimatedSizeGB / 4)).toFixed(1)} GB estimated</p>
      )}
    </div>
  )
}

export default function ComparePage() {
  const router = useRouter()
  const { specs, compareList, removeFromCompare, clearCompare } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const enriched: ModelCard[] = useMemo(() => {
    return compareList.map((m) => {
      if (specs && m.estimatedSizeGB != null) {
        const compat = computeCompatibility(m.estimatedSizeGB, m.contextLength ?? null, specs)
        return { ...m, compatibility: compat.rating, compatibilityScore: compat.score, matchReason: compat.reason } as ModelCard
      }
      return { ...m, compatibility: "unknown" as const, compatibilityScore: 0, matchReason: "No specs" } as ModelCard
    })
  }, [compareList, specs])

  const specRows = [
    { label: "Parameters", icon: Cpu, render: (m: ModelCard) => m.paramCount ? `${m.paramCount}B` : "N/A" },
    { label: "Size", icon: HardDrive, render: (m: ModelCard) => m.estimatedSizeGB ? `${m.estimatedSizeGB.toFixed(1)} GB` : "N/A" },
    { label: "Context", icon: FileText, render: (m: ModelCard) => m.contextLength ? `${m.contextLength.toLocaleString()}` : "N/A" },
    { label: "Downloads", icon: Download, render: (m: ModelCard) => m.downloads >= 1e6 ? `${(m.downloads / 1e6).toFixed(1)}M` : m.downloads >= 1e3 ? `${(m.downloads / 1e3).toFixed(0)}K` : String(m.downloads) },
    { label: "License", icon: null, render: (m: ModelCard) => m.license || "N/A" },
    { label: "Format", icon: null, render: (m: ModelCard) => m.format?.toUpperCase() || "N/A" },
    { label: "Task", icon: null, render: (m: ModelCard) => m.pipeline_tag || "N/A" },
  ]

  // Find the "best" model for highlighting
  const bestIdx = enriched.length > 0
    ? enriched.reduce((best, m, i) => m.compatibilityScore > enriched[best].compatibilityScore ? i : best, 0)
    : -1

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 lg:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.back()} size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />Back
          </Button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">ModelDB</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {enriched.length > 0 && (
            <Button variant="outline" size="sm" className="text-xs" onClick={clearCompare}>Clear all</Button>
          )}
          {mounted && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Scale className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Compare models</h1>
          <Badge variant="secondary" className="text-xs">{enriched.length}/3</Badge>
        </div>

        {enriched.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Scale className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">No models selected for comparison.</p>
            <p className="text-sm text-muted-foreground/60">Go to the dashboard and click the compare icon on model cards to add up to 3 models.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Browse models</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Model headers */}
            <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${enriched.length}, 1fr)` }}>
              {enriched.map((m, i) => (
                <Card key={m.modelId} className={`relative ${i === bestIdx && enriched.length > 1 ? "ring-2 ring-emerald-500/50" : ""}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                          {m.name || m.modelId.split("/").pop()}
                        </h3>
                        <p className="text-[10px] text-muted-foreground truncate">{m.author}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0" onClick={() => removeFromCompare(m.modelId)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    {i === bestIdx && enriched.length > 1 && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                        Best fit for your hardware
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[11px] font-semibold ${getCompatibilityColor(m.compatibility)}`}>
                      {getCompatibilityIcon(m.compatibility)} {getCompatibilityLabel(m.compatibility)}
                    </Badge>
                    {specs && <MemoryBar model={m} specs={specs} />}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Spec comparison rows */}
            <Card>
              <CardContent className="p-0">
                {specRows.map(({ label, icon: Icon, render }, rowIdx) => (
                  <div key={label} className={`grid items-center border-b last:border-b-0 ${rowIdx % 2 === 0 ? "bg-muted/20" : ""}`}
                    style={{ gridTemplateColumns: `140px repeat(${enriched.length}, 1fr)` }}>
                    <div className="px-4 py-3 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      {Icon && <Icon className="w-3 h-3" />}{label}
                    </div>
                    {enriched.map((m) => (
                      <div key={m.modelId} className="px-4 py-3 text-sm font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {render(m)}
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Compatibility breakdown per model */}
            {specs && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Compatibility breakdown</h3>
                <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${enriched.length}, 1fr)` }}>
                  {enriched.map((m) => (
                    <div key={m.modelId} className="space-y-2">
                      <p className="text-xs font-medium truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {m.name || m.modelId.split("/").pop()}
                      </p>
                      <CompatBreakdown model={m} specs={specs} />
                      {m.matchReason && (
                        <p className="text-[11px] text-muted-foreground">{m.matchReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
