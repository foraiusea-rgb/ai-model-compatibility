"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { getCompatibilityLabel, getCompatibilityIcon } from "@/lib/compatibility"
import { useAppStore } from "@/store/use-app-store"
import type { CompatibilityRating, Filters } from "@/types/model"
import { X } from "lucide-react"

const TASKS = [
  "text-generation",
  "text2text-generation",
  "translation",
  "summarization",
  "fill-mask",
  "question-answering",
  "token-classification",
  "image-classification",
  "object-detection",
  "image-segmentation",
  "text-to-image",
  "image-to-image",
  "image-to-text",
  "image-to-video",
  "text-to-video",
  "text-to-speech",
  "speech-to-text",
  "text-to-audio",
  "audio-to-audio",
  "audio-classification",
  "video-classification",
  "zero-shot-image-classification",
  "visual-question-answering",
  "document-question-answering",
  "graph-ml",
  "feature-extraction",
  "sentence-similarity",
  "reinforcement-learning",
  "tabular-classification",
  "tabular-regression",
  "text-ranking",
  "robotics",
  "unconditional-image-generation",
  "video-text-to-text",
  "tabular-to-text",
  "table-question-answering",
  "text-to-sql",
  "text-to-3d",
  "image-to-3d",
  "any-to-any",
  "mask-generation",
]

const LICENSES = [
  "apache-2.0",
  "mit",
  "cc-by-4.0",
  "cc-by-nc-4.0",
  "cc-by-sa-4.0",
  "cc-by-nc-sa-4.0",
  "llama3",
  "llama3.1",
  "llama3.2",
  "gemma",
  "llama2",
  "creativeml-openrail-m",
  "openrail",
  "bigscience-openrail-m",
  "bigscience-bloom-rail",
  "bsd-3-clause",
  "bsd-2-clause",
  "gpl-3.0",
  "agpl-3.0",
  "mpl-2.0",
  "epl-2.0",
  "afl-3.0",
  "artistic-2.0",
  "other",
]

const FORMATS = ["gguf", "safetensors", "pytorch", "onnx", "tensorboard", "tf", "jax", "coreml", "diffusers"]

export function FilterSidebar() {
  const { filters, setFilters, specs } = useAppStore()

  const handleCompatToggle = (rating: CompatibilityRating) => {
    const current = filters.compatibility
    const updated = current.includes(rating)
      ? current.filter((c) => c !== rating)
      : [...current, rating]
    setFilters({ compatibility: updated })
  }

  const handleTaskToggle = (task: string) => {
    const current = filters.tasks
    const updated = current.includes(task)
      ? current.filter((t) => t !== task)
      : [...current, task]
    setFilters({ tasks: updated })
  }

  const handleLicenseToggle = (license: string) => {
    const current = filters.licenses
    const updated = current.includes(license)
      ? current.filter((l) => l !== license)
      : [...current, license]
    setFilters({ licenses: updated })
  }

  const handleFormatToggle = (format: string) => {
    const current = filters.formats
    const updated = current.includes(format)
      ? current.filter((f) => f !== format)
      : [...current, format]
    setFilters({ formats: updated })
  }

  const resetAll = () => {
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
      sortBy: "score",
      sortDir: "desc",
    })
  }

  const hasActiveFilters =
    filters.compatibility.length > 0 ||
    filters.tasks.length > 0 ||
    filters.formats.length > 0 ||
    filters.licenses.length > 0 ||
    filters.sizeMinGB !== null ||
    filters.sizeMaxGB !== null ||
    filters.paramMinB !== null ||
    filters.paramMaxB !== null

  return (
    <ScrollArea className="h-[calc(100vh-4rem)] pr-4">
      <div className="space-y-6">
        {/* Reset button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            className="w-full gap-2"
          >
            <X className="w-3.5 h-3.5" />
            Reset all filters
          </Button>
        )}

        {/* Compatibility */}
        {specs && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Compatibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(["smooth", "slow", "heavy"] as CompatibilityRating[]).map((rating) => (
                <div
                  key={rating}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => handleCompatToggle(rating)}
                >
                  <Checkbox
                    checked={filters.compatibility.includes(rating)}
                    onCheckedChange={() => handleCompatToggle(rating)}
                  />
                  <span className="text-sm">
                    {getCompatibilityIcon(rating)} {getCompatibilityLabel(rating)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Task Type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Task Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-1.5">
                {TASKS.map((task) => (
                  <div
                    key={task}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleTaskToggle(task)}
                  >
                    <Checkbox
                      checked={filters.tasks.includes(task)}
                      onCheckedChange={() => handleTaskToggle(task)}
                    />
                    <span className="text-xs">{task}</span>
                    {filters.tasks.includes(task) && (
                      <Badge variant="secondary" className="text-[10px] ml-auto">
                        active
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Model Size Range */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Model Size (GB)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>0 GB</span>
                <span>100 GB+</span>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={filters.sizeMinGB ?? 0}
                    onChange={(e) => setFilters({ sizeMinGB: Math.min(e.target.valueAsNumber, filters.sizeMaxGB ?? 100) || null })}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={filters.sizeMaxGB ?? 100}
                    onChange={(e) => setFilters({ sizeMaxGB: Math.max(e.target.valueAsNumber, filters.sizeMinGB ?? 0) || null })}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{filters.sizeMinGB !== null ? `${filters.sizeMinGB} GB` : "Min"}</span>
                <span>{filters.sizeMaxGB !== null ? `${filters.sizeMaxGB} GB` : "Max"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parameter Count */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Parameters (Billion)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>0B</span>
                <span>500B+</span>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={500}
                    step={1}
                    value={filters.paramMinB ?? 0}
                    onChange={(e) => setFilters({ paramMinB: Math.min(e.target.valueAsNumber, filters.paramMaxB ?? 500) || null })}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={500}
                    step={1}
                    value={filters.paramMaxB ?? 500}
                    onChange={(e) => setFilters({ paramMaxB: Math.max(e.target.valueAsNumber, filters.paramMinB ?? 0) || null })}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{filters.paramMinB !== null ? `${filters.paramMinB}B` : "Min"}</span>
                <span>{filters.paramMaxB !== null ? `${filters.paramMaxB}B` : "Max"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Format */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Format</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {FORMATS.map((format) => (
                <div
                  key={format}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => handleFormatToggle(format)}
                >
                  <Checkbox
                    checked={filters.formats.includes(format)}
                    onCheckedChange={() => handleFormatToggle(format)}
                  />
                  <span className="text-xs font-mono">{format}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* License */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">License</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-1.5">
                {LICENSES.map((license) => (
                  <div
                    key={license}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleLicenseToggle(license)}
                  >
                    <Checkbox
                      checked={filters.licenses.includes(license)}
                      onCheckedChange={() => handleLicenseToggle(license)}
                    />
                    <span className="text-xs">{license}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
