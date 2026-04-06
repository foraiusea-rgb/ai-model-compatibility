"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { getCompatibilityLabel, getCompatibilityIcon } from "@/lib/compatibility"
import { useAppStore } from "@/store/use-app-store"
import type { CompatibilityRating, Filters } from "@/types/model"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"

const TASKS = [
  "text-generation", "text2text-generation", "translation", "summarization",
  "image-classification", "text-to-image", "text-to-speech",
  "speech-to-text", "image-to-image", "image-to-video",
  "text-to-video", "audio-classification", "feature-extraction",
  "sentence-similarity", "reinforcement-learning", "text-to-sql",
]

const FORMATS = ["gguf", "safetensors", "pytorch", "onnx", "diffusers"]
const LICENSES = ["apache-2.0", "mit", "cc-by-4.0", "llama3.1", "llama3.2", "gemma", "other"]

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
        {title}
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

function ToggleRow({ checked, onChange, label, sublabel }: { checked: boolean; onChange: () => void; label: string; sublabel?: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer py-1.5 hover:bg-muted/40 rounded-md px-2 -mx-2 transition-colors">
      <Checkbox checked={checked} onCheckedChange={() => onChange()} className="h-3.5 w-3.5" />
      <span className="text-xs select-none">{label}</span>
      {sublabel && <span className="text-[10px] text-muted-foreground/50 ml-auto">{sublabel}</span>}
    </label>
  )
}

export function FilterSidebar() {
  const { filters, setFilters, specs } = useAppStore()

  const toggleFilter = (key: keyof Pick<Filters, "compatibility" | "tasks" | "formats" | "licenses">, value: string) => {
    const current = filters[key] as string[]
    const updated = current.includes(value) ? current.filter((c) => c !== value) : [...current, value]
    setFilters({ [key]: updated })
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 pb-2">
        <h3 className="font-semibold text-sm">Filters</h3>
        <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => setFilters({ compatibility: [], tasks: [], formats: [], licenses: [], searchQuery: "" })}>
          Reset
        </Button>
      </div>

      {/* Compatibility — always visible */}
      {specs && (
        <Card className="border bg-card/50">
          <CardHeader className="py-1.5 px-3">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Compatibility</CardTitle>
          </CardHeader>
          <CardContent className="px-1 pb-2 space-y-0">
            {(["smooth", "slow", "heavy"] as CompatibilityRating[]).map((rating) => (
              <ToggleRow
                key={rating}
                checked={filters.compatibility.includes(rating)}
                onChange={() => toggleFilter("compatibility", rating)}
                label={`${getCompatibilityIcon(rating)} ${getCompatibilityLabel(rating)}`}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Task Type */}
      <FilterSection title="Task Type" defaultOpen={true}>
        <div className="space-y-0 pl-1">
          {TASKS.map((task) => (
            <ToggleRow
              key={task}
              checked={filters.tasks.includes(task)}
              onChange={() => toggleFilter("tasks", task)}
              label={task.replace(/-/g, " ")}
            />
          ))}
        </div>
      </FilterSection>

      {/* Format */}
      <FilterSection title="Format" defaultOpen={true}>
        <div className="space-y-0 pl-1">
          {FORMATS.map((fmt) => (
            <ToggleRow
              key={fmt}
              checked={filters.formats.includes(fmt)}
              onChange={() => toggleFilter("formats", fmt)}
              label={fmt}
            />
          ))}
        </div>
      </FilterSection>

      {/* License — collapsed by default */}
      <FilterSection title="License" defaultOpen={false}>
        <div className="space-y-0 pl-1">
          {LICENSES.map((license) => (
            <ToggleRow
              key={license}
              checked={filters.licenses.includes(license)}
              onChange={() => toggleFilter("licenses", license)}
              label={license}
            />
          ))}
        </div>
      </FilterSection>
    </div>
  )
}
