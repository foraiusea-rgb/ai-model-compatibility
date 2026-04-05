"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { getCompatibilityLabel, getCompatibilityIcon } from "@/lib/compatibility"
import { useAppStore } from "@/store/use-app-store"
import type { CompatibilityRating, Filters } from "@/types/model"
import { X } from "lucide-react"

const TASKS = [
  "text-generation", "text2text-generation", "translation", "summarization",
  "fill-mask", "question-answering", "token-classification",
  "image-classification", "object-detection", "image-segmentation",
  "text-to-image", "image-to-image", "image-to-text", "image-to-video",
  "text-to-video", "text-to-speech", "speech-to-text", "text-to-audio",
  "audio-to-audio", "audio-classification", "video-classification",
  "zero-shot-image-classification", "visual-question-answering",
  "document-question-answering", "feature-extraction", "sentence-similarity",
  "reinforcement-learning", "text-ranking", "text-to-sql",
  "text-to-3d", "image-to-3d", "any-to-any", "mask-generation",
]

const LICENES = [
  "apache-2.0", "mit", "cc-by-4.0", "cc-by-nc-4.0", "llama3", "llama3.1",
  "llama3.2", "gemma", "llama2", "other",
]

export function FilterSidebar() {
  const { filters, setFilters, specs } = useAppStore()

  const toggleFilter = (key: keyof Pick<Filters, "compatibility" | "tasks" | "formats" | "licenses">, value: string) => {
    const current = filters[key] as string[]
    const updated = current.includes(value)
      ? current.filter((c) => c !== value)
      : [...current, value]
    setFilters({ [key]: updated })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Filters</h3>
      </div>

      {specs && (
        <Card>
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Compatibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {(["smooth", "slow", "heavy"] as CompatibilityRating[]).map((rating) => (
              <label
                key={rating}
                className="flex items-center gap-2.5 cursor-pointer py-1 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
              >
                <Checkbox
                  checked={filters.compatibility.includes(rating)}
                  onCheckedChange={() => toggleFilter("compatibility", rating)}
                />
                <span className="text-sm select-none">
                  {getCompatibilityIcon(rating)} {getCompatibilityLabel(rating)}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-3 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Task Type
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-52">
            <div className="space-y-0.5">
              {TASKS.map((task) => (
                <label
                  key={task}
                  className="flex items-center gap-2.5 cursor-pointer py-1 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                >
                  <Checkbox
                    checked={filters.tasks.includes(task)}
                    onCheckedChange={() => toggleFilter("tasks", task)}
                  />
                  <span className="text-xs capitalize select-none">{task.replace(/-/g, " ")}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Format
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {["gguf", "safetensors", "pytorch", "onnx", "diffusers"].map((fmt) => (
            <label
              key={fmt}
              className="flex items-center gap-2.5 cursor-pointer py-1 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
            >
              <Checkbox
                checked={filters.formats.includes(fmt)}
                onCheckedChange={() => toggleFilter("formats", fmt)}
              />
              <span className="text-xs font-mono select-none">{fmt}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            License
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-40">
            <div className="space-y-0.5">
              {LICENES.map((license) => (
                <label
                  key={license}
                  className="flex items-center gap-2.5 cursor-pointer py-1 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                >
                  <Checkbox
                    checked={filters.licenses.includes(license)}
                    onCheckedChange={() => toggleFilter("licenses", license)}
                  />
                  <span className="text-xs select-none">{license}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
