"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Download, Cpu, HardDrive } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ModelCard } from "@/types/model"
import { getCompatibilityColor, getCompatibilityLabel, getCompatibilityIcon } from "@/lib/compatibility"
import { useAppStore } from "@/store/use-app-store"

function getLeftBorderColor(compat: string): string {
  switch (compat) {
    case "smooth": return "border-l-emerald-500"
    case "slow": return "border-l-amber-500"
    case "heavy": return "border-l-red-500"
    default: return "border-l-border"
  }
}

function getBarColor(compat: string): string {
  switch (compat) {
    case "smooth": return "bg-emerald-500"
    case "slow": return "bg-amber-500"
    case "heavy": return "bg-red-500"
    default: return "bg-muted-foreground/30"
  }
}

interface ModelGridItemProps {
  model: ModelCard
  isBookmarked: boolean
  onToggleBookmark: (id: string) => void
}

export function ModelGridItem({ model, isBookmarked, onToggleBookmark }: ModelGridItemProps) {
  const router = useRouter()
  const specs = useAppStore((s) => s.specs)
  const compatClass = getCompatibilityColor(model.compatibility)
  const leftBorder = getLeftBorderColor(model.compatibility)

  const dlDisplay = model.downloads >= 1000000
    ? `${(model.downloads / 1000000).toFixed(1)}M`
    : model.downloads >= 1000
      ? `${(model.downloads / 1000).toFixed(0)}K`
      : model.downloads.toString()

  // Compute memory usage percentage for the bar
  const memTotal = specs ? (specs.vramGB || specs.ramGB) : null
  const usagePct = (memTotal && model.estimatedSizeGB)
    ? Math.min(100, Math.round((model.estimatedSizeGB / memTotal) * 100))
    : null

  return (
    <Card
      className={`group cursor-pointer hover:border-primary/40 transition-all duration-200 hover:shadow-md overflow-hidden relative border-border/60 border-l-[3px] ${leftBorder}`}
      onClick={() => router.push(`/model/${encodeURIComponent(model.modelId)}`)}
    >
      <CardContent className="p-3.5 space-y-2">
        {/* Row 1: Name + Bookmark */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[13px] leading-tight truncate group-hover:text-primary transition-colors" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {model.name || model.modelId.split("/").pop()}
            </h3>
            <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{model.author}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 shrink-0 transition-opacity ${isBookmarked ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            onClick={(e) => { e.stopPropagation(); onToggleBookmark(model.modelId) }}
          >
            <Star className={`w-3.5 h-3.5 ${isBookmarked ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-400"}`} />
          </Button>
        </div>

        {/* Row 2: Key specs — compact chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {model.estimatedSizeGB != null && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-muted/60" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <HardDrive className="w-3 h-3 text-muted-foreground/60" />
              {model.estimatedSizeGB.toFixed(1)} GB
            </span>
          )}
          {model.paramCount != null && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-muted/60" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <Cpu className="w-3 h-3 text-muted-foreground/60" />
              {model.paramCount}B
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 px-1.5 py-0.5">
            <Download className="w-3 h-3" />
            {dlDisplay}
          </span>
        </div>

        {/* Row 3: Memory usage bar — the differentiator */}
        {usagePct !== null && model.compatibility !== "unknown" && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <Badge variant="outline" className={`text-[10px] font-semibold px-1.5 py-0 h-auto ${compatClass}`}>
                {getCompatibilityIcon(model.compatibility)} {getCompatibilityLabel(model.compatibility)}
              </Badge>
              <span className="text-muted-foreground/60" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {usagePct}% of {specs?.vramGB ? "VRAM" : "RAM"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBarColor(model.compatibility)}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        )}

        {/* No specs — show nudge */}
        {model.compatibility === "unknown" && (
          <p className="text-[10px] text-muted-foreground/40 italic">Set your specs to see compatibility</p>
        )}

        {/* Row 4: Task tag */}
        {model.pipeline_tag && (
          <Badge variant="secondary" className="text-[9px] font-medium px-1.5 py-0 h-4 w-fit">
            {model.pipeline_tag}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
