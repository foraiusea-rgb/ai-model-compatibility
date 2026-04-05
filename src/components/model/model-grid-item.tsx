import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Download, Clock, Cpu, HardDrive } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ModelCard } from "@/types/model"
import { getCompatibilityColor, getCompatibilityLabel, getCompatibilityIcon } from "@/lib/compatibility"
import { formatDistanceToNow } from "date-fns"

interface ModelGridItemProps {
  model: ModelCard
  isBookmarked: boolean
  onToggleBookmark: (id: string) => void
}

export function ModelGridItem({ model, isBookmarked, onToggleBookmark }: ModelGridItemProps) {
  const router = useRouter()
  const compatClass = getCompatibilityColor(model.compatibility)

  return (
    <Card
      className="group cursor-pointer hover:border-primary/50 transition-all duration-200 hover:shadow-md overflow-hidden"
      onClick={() => router.push(`/model/${model.modelId}`)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {model.name || model.modelId.split("/").pop()}
            </h3>
            <p className="text-xs text-muted-foreground truncate">{model.author}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggleBookmark(model.modelId)
            }}
          >
            <Star
              className={`w-3.5 h-3.5 ${isBookmarked ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
            />
          </Button>
        </div>

        {model.compatibility !== "unknown" && (
          <Badge variant="outline" className={`text-xs font-medium ${compatClass}`}>
            <span className="mr-1">{getCompatibilityIcon(model.compatibility)}</span>
            {getCompatibilityLabel(model.compatibility)}
          </Badge>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {model.paramCount && (
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>{model.paramCount}B</span>
            </div>
          )}
          {model.estimatedSizeGB && (
            <div className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              <span>~{model.estimatedSizeGB.toFixed(1)}GB</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            <span>{model.downloads >= 1000000 ? `${(model.downloads / 1000000).toFixed(1)}M` : model.downloads >= 1000 ? `${(model.downloads / 1000).toFixed(0)}K` : model.downloads}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatDistanceToNow(new Date(model.updatedAt), { addSuffix: true })}</span>
          </div>
        </div>

        {model.pipeline_tag && (
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px] font-medium">
              {model.pipeline_tag}
            </Badge>
            {model.tags.filter(t => !t.startsWith("license:") && !t.startsWith("region:")).slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] font-medium">
                {tag}
              </Badge>
            ))}
            {model.tags.length > 2 && (
              <Badge variant="outline" className="text-[10px] font-medium">
                +{model.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
