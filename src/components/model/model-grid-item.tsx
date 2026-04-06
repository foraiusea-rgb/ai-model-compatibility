"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Download, Clock, Cpu, HardDrive, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ModelCard } from "@/types/model"
import { getCompatibilityColor, getCompatibilityLabel, getCompatibilityIcon } from "@/lib/compatibility"
import { formatDistanceToNowStrict, isValid } from "date-fns"

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

  return (
    <Card
      className="group cursor-pointer hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 overflow-hidden relative"
      onClick={() => router.push(`/model/${encodeURIComponent(model.modelId)}`)}
    >
      {/* Compatibility indicator bar */}
      {model.compatibility !== "unknown" && (
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          model.compatibility === "smooth" ? "bg-emerald-500" :
          model.compatibility === "slow" ? "bg-amber-500" : "bg-red-500"
        }`} />
      )}

      <CardContent className="p-5 space-y-3.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pt-1">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
              {model.name || model.modelId.split("/").pop()}
            </h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{model.author}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onToggleBookmark(model.modelId)
            }}
          >
            <Star
              className={`w-4 h-4 transition-colors ${isBookmarked ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-400"}`}
            />
          </Button>
        </div>

        {/* Compatibility Badge */}
        {model.compatibility !== "unknown" && (
          <Badge variant="outline" className={`text-xs font-medium w-fit ${compatClass}`}>
            <span className="mr-1">{getCompatibilityIcon(model.compatibility)}</span>
            {getCompatibilityLabel(model.compatibility)}
          </Badge>
        )}

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {model.paramCount && (
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span className="font-medium">{model.paramCount}B params</span>
            </div>
          )}
          {model.estimatedSizeGB != null && (
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              <span className="font-mono">~{model.estimatedSizeGB.toFixed(1)} GB</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>{dlDisplay}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDistanceToNowStrict(new Date(model.updatedAt), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Tags */}
        {model.pipeline_tag && (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="default" className="text-[10px] font-medium px-2 py-0.5">
              {model.pipeline_tag}
            </Badge>
            {model.tags.filter(t => !t.startsWith("license:") && !t.startsWith("region:")).slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] font-medium px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* View detail hint */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors pt-1">
          <span>View details</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </CardContent>
    </Card>
  )
}
