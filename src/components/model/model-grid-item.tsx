"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Download, Clock, Cpu, HardDrive, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ModelCard } from "@/types/model"
import { getCompatibilityColor, getCompatibilityLabel, getCompatibilityIcon } from "@/lib/compatibility"

function relativeDate(dateStr: string): string {
  try {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ""
    const now = Date.now()
    const diff = now - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    return `${Math.floor(months / 12)}y ago`
  } catch { return "" }
}

interface ModelGridItemProps {
  model: ModelCard
  isBookmarked: boolean
  onToggleBookmark: (id: string) => void
}

export function ModelGridItem({ model, isBookmarked, onToggleBookmark }: ModelGridItemProps) {
  const router = useRouter()
  const compatClass = getCompatibilityColor(model.compatibility)

  const dlDisplay = model.downloads >= 1000000
    ? `${(model.downloads / 1000000).toFixed(1)}M`
    : model.downloads >= 1000
      ? `${(model.downloads / 1000).toFixed(0)}K`
      : model.downloads.toString()

  const timeAgo = relativeDate(model.updatedAt)

  // Determine the hero stat — priority: size > params
  const heroStat = model.estimatedSizeGB != null
    ? { value: `~${model.estimatedSizeGB.toFixed(1)} GB`, icon: HardDrive }
    : model.paramCount != null
      ? { value: `${model.paramCount}B`, icon: Cpu }
      : null

  // Tags — max 2 visible + task badge
  const visibleTags = model.tags
    .filter((t) => !t.startsWith("license:") && !t.startsWith("region:") && !t.startsWith("dataset:"))
    .slice(0, 2)

  return (
    <Card
      className="group cursor-pointer hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 overflow-hidden relative border-border/60"
      onClick={() => router.push(`/model/${encodeURIComponent(model.modelId)}`)}
    >
      {/* Compatibility indicator bar */}
      {model.compatibility !== "unknown" && (
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${
          model.compatibility === "smooth" ? "bg-emerald-500" :
          model.compatibility === "slow" ? "bg-amber-500" : "bg-red-500"
        }`} />
      )}

      <CardContent className="p-4 space-y-3">
        {/* Header: Name + Bookmark */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
              {model.name || model.modelId.split("/").pop()}
            </h3>
            <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{model.author}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onToggleBookmark(model.modelId)
            }}
          >
            <Star className={`w-3.5 h-3.5 ${isBookmarked ? "fill-amber-400 text-amber-400 opacity-100" : "text-muted-foreground hover:text-amber-400"}`} />
          </Button>
        </div>

        {/* Compatibility Badge */}
        {model.compatibility !== "unknown" && (
          <Badge variant="outline" className={`text-[10px] font-medium w-fit px-1.5 py-0 h-auto ${compatClass}`}>
            <span className="mr-0.5 text-[9px]">{getCompatibilityIcon(model.compatibility)}</span>
            {getCompatibilityLabel(model.compatibility)}
          </Badge>
        )}

        {/* Hero Stat — ONE big stat */}
        {heroStat && (
          <div className="flex items-center gap-1.5 text-muted-foreground/60">
            <heroStat.icon className="w-3 h-3" />
            <span className="text-xs font-mono">{heroStat.value}</span>
          </div>
        )}

        {/* Secondary stats — compact row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/60">
          <div className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            <span>{dlDisplay}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
          </div>
          {heroStat?.icon === HardDrive && model.paramCount && (
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>{model.paramCount}B</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {(model.pipeline_tag || visibleTags.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {model.pipeline_tag && (
              <Badge variant="default" className="text-[9px] font-medium px-1.5 py-0 h-4">
                {model.pipeline_tag}
              </Badge>
            )}
            {visibleTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px] font-medium px-1.5 py-0 h-4 opacity-70">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Hover hint */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40 group-hover:text-primary/60 transition-colors pt-0.5">
          <span>View details</span>
          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </CardContent>
    </Card>
  )
}
