"use client"

import { useAppStore } from "@/store/use-app-store"
import { computeCompatibility, getCompatibilityColor, getCompatibilityLabel, getCompatibilityIcon } from "@/lib/compatibility"
import type { ModelCard, HFModel } from "@/types/model"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Zap, Star, Trash2, HardDrive, Cpu, Download, Moon, Sun, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { MOCK_MODELS } from "@/lib/mock-data"

export default function BookmarksPage() {
  const router = useRouter()
  const { specs, bookmarks, removeBookmark, loadFromStorage } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [fetchedModels, setFetchedModels] = useState<HFModel[]>([])

  useEffect(() => {
    loadFromStorage()
    setMounted(true)
  }, [loadFromStorage])

  // Try to resolve bookmarked models from mock data or API
  useEffect(() => {
    const missingIds = bookmarks
      .filter(b => !MOCK_MODELS.some(m => m.modelId === b.modelId))
      .map(b => b.modelId)

    if (missingIds.length === 0) return

    // Fetch each missing model
    Promise.all(
      missingIds.map(id =>
        fetch(`/api/models?q=${encodeURIComponent(id)}&limit=3`)
          .then(r => r.json())
          .then(data => data.models?.find((m: HFModel) => m.modelId === id) || null)
          .catch(() => null)
      )
    ).then(results => {
      setFetchedModels(results.filter(Boolean) as HFModel[])
    })
  }, [bookmarks])

  const enrichedBookmarks: ModelCard[] = useMemo(() => {
    return bookmarks.map((b) => {
      const model = MOCK_MODELS.find(m => m.modelId === b.modelId) || fetchedModels.find(m => m.modelId === b.modelId)
      if (!model) return null
      if (specs && model.estimatedSizeGB != null) {
        const compat = computeCompatibility(model.estimatedSizeGB, model.contextLength ?? null, specs)
        return { ...model, compatibility: compat.rating, compatibilityScore: compat.score, matchReason: compat.reason } as ModelCard
      }
      return { ...model, compatibility: "unknown" as const, compatibilityScore: 0, matchReason: "" } as ModelCard
    }).filter(Boolean) as ModelCard[]
  }, [bookmarks, fetchedModels, specs])

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
        {mounted && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          <h1 className="text-2xl font-bold">Bookmarks</h1>
          <Badge variant="secondary" className="text-xs">{bookmarks.length} saved</Badge>
        </div>

        {enrichedBookmarks.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Star className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">No bookmarked models yet.</p>
            <p className="text-sm text-muted-foreground/60">Click the star icon on any model card to save it here.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Browse models</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {enrichedBookmarks.map((m) => {
              const memTotal = specs ? (specs.vramGB || specs.ramGB) : null
              const usagePct = (memTotal && m.estimatedSizeGB) ? Math.min(100, Math.round((m.estimatedSizeGB / memTotal) * 100)) : null

              return (
                <Card key={m.modelId} className="hover:border-primary/40 transition-all cursor-pointer"
                  onClick={() => router.push(`/model/${encodeURIComponent(m.modelId)}`)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Left: Compat indicator */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                      m.compatibility === "smooth" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                      m.compatibility === "slow" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                      m.compatibility === "heavy" ? "bg-red-500/15 text-red-500" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {getCompatibilityIcon(m.compatibility)}
                    </div>

                    {/* Middle: Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="font-semibold text-sm truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {m.name || m.modelId.split("/").pop()}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span>{m.author}</span>
                        {m.estimatedSizeGB && <span className="font-mono">{m.estimatedSizeGB.toFixed(1)} GB</span>}
                        {m.paramCount && <span className="font-mono">{m.paramCount}B params</span>}
                        {usagePct !== null && <span className="font-mono">{usagePct}% of {specs?.vramGB ? "VRAM" : "RAM"}</span>}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${getCompatibilityColor(m.compatibility)}`}>
                        {getCompatibilityLabel(m.compatibility)}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); removeBookmark(m.modelId) }}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
