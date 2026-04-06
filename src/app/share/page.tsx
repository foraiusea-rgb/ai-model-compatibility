"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, useMemo, Suspense } from "react"
import { computeCompatibility, getCompatibilityColor, getCompatibilityLabel, getCompatibilityIcon } from "@/lib/compatibility"
import { MOCK_MODELS } from "@/lib/mock-data"
import { useAppStore } from "@/store/use-app-store"
import type { HFModel, ModelCard, HardwareSpecs } from "@/types/model"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Zap, HardDrive, Cpu, Database, Monitor, ArrowRight, ExternalLink } from "lucide-react"

function ShareContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setSpecs, setHasEnteredSpecs } = useAppStore()

  const modelId = searchParams.get("model") || ""
  const ram = parseInt(searchParams.get("ram") || "0")
  const vram = searchParams.get("vram") ? parseInt(searchParams.get("vram")!) : null
  const cores = parseInt(searchParams.get("cores") || "8")
  const disk = parseInt(searchParams.get("disk") || "100")

  const [model, setModel] = useState<HFModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!modelId) { setError("No model specified"); setLoading(false); return }

    const mock = MOCK_MODELS.find(m => m.modelId === modelId)
    if (mock) { setModel(mock); setLoading(false); return }

    fetch(`/api/models?q=${encodeURIComponent(modelId)}&limit=5`)
      .then(r => r.json())
      .then(data => {
        const match = data.models?.find((m: HFModel) => m.modelId === modelId)
        if (match) setModel(match)
        else setError("Model not found")
      })
      .catch(() => setError("Failed to load model"))
      .finally(() => setLoading(false))
  }, [modelId])

  const sharedSpecs: HardwareSpecs | null = useMemo(() => {
    if (!ram) return null
    return { ramGB: ram, vramGB: vram, cpuCores: cores, diskFreeGB: disk, inference: "ollama" as const }
  }, [ram, vram, cores, disk])

  const enriched: ModelCard | null = useMemo(() => {
    if (!model) return null
    if (sharedSpecs && model.estimatedSizeGB != null) {
      const compat = computeCompatibility(model.estimatedSizeGB, model.contextLength ?? null, sharedSpecs)
      return { ...model, compatibility: compat.rating, compatibilityScore: compat.score, matchReason: compat.reason } as ModelCard
    }
    return { ...model, compatibility: "unknown" as const, compatibilityScore: 0, matchReason: "" } as ModelCard
  }, [model, sharedSpecs])

  const handleUseSpecs = () => {
    if (!sharedSpecs) return
    setSpecs(sharedSpecs)
    setHasEnteredSpecs(true)
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 space-y-6">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !enriched) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-muted-foreground">{error || "Something went wrong"}</p>
        <Button variant="outline" onClick={() => router.push("/")}>Go to ModelDB</Button>
      </div>
    )
  }

  const memTotal = sharedSpecs ? (sharedSpecs.vramGB || sharedSpecs.ramGB) : null
  const usagePct = (memTotal && enriched.estimatedSizeGB)
    ? Math.min(100, Math.round((enriched.estimatedSizeGB / memTotal) * 100)) : null

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <Badge variant="secondary" className="text-xs">Shared result</Badge>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {enriched.name || enriched.modelId.split("/").pop()}
        </h1>
        <p className="text-sm text-muted-foreground">{enriched.author} &middot; {enriched.modelId}</p>
      </div>

      {/* Compatibility result */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={`text-sm font-semibold px-3 py-1 ${getCompatibilityColor(enriched.compatibility)}`}>
              {getCompatibilityIcon(enriched.compatibility)} {getCompatibilityLabel(enriched.compatibility)}
            </Badge>
            {usagePct !== null && (
              <span className="text-sm text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {usagePct}% of {sharedSpecs?.vramGB ? "VRAM" : "RAM"}
              </span>
            )}
          </div>

          {usagePct !== null && (
            <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
              <div className={`h-full rounded-full ${
                enriched.compatibility === "smooth" ? "bg-emerald-500" :
                enriched.compatibility === "slow" ? "bg-amber-500" : "bg-red-500"
              }`} style={{ width: `${usagePct}%` }} />
            </div>
          )}

          {enriched.matchReason && (
            <p className="text-sm text-muted-foreground">{enriched.matchReason}</p>
          )}

          <Separator />

          {/* Model specs */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {enriched.estimatedSizeGB && (
              <div>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><HardDrive className="w-3 h-3" />Size</p>
                <p className="text-sm font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{enriched.estimatedSizeGB.toFixed(1)} GB</p>
              </div>
            )}
            {enriched.paramCount && (
              <div>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Cpu className="w-3 h-3" />Params</p>
                <p className="text-sm font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{enriched.paramCount}B</p>
              </div>
            )}
            {enriched.pipeline_tag && (
              <div>
                <p className="text-[10px] text-muted-foreground">Task</p>
                <p className="text-sm font-medium">{enriched.pipeline_tag}</p>
              </div>
            )}
          </div>

          {/* Hardware used */}
          {sharedSpecs && (
            <>
              <Separator />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tested on</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  <span className="flex items-center gap-1.5"><Database className="w-3 h-3" />RAM: {sharedSpecs.ramGB} GB</span>
                  <span className="flex items-center gap-1.5"><Monitor className="w-3 h-3" />VRAM: {sharedSpecs.vramGB ? `${sharedSpecs.vramGB} GB` : "CPU only"}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        {sharedSpecs && (
          <Button onClick={handleUseSpecs} className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-0 hover:from-emerald-400 hover:to-cyan-400">
            Use these specs and browse models <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        <Button variant="outline" className="w-full gap-2" onClick={() => router.push(`/model/${encodeURIComponent(enriched.modelId)}`)}>
          View full model details
        </Button>
        <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => window.open(`https://huggingface.co/${enriched.modelId}`, "_blank")}>
          <ExternalLink className="w-3.5 h-3.5" />View on HuggingFace
        </Button>
      </div>

      {/* Branding */}
      <div className="text-center pt-4">
        <button onClick={() => router.push("/")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="font-semibold">ModelDB</span>
          <span className="text-xs">— Find the right AI model for your hardware</span>
        </button>
      </div>
    </div>
  )
}

export default function SharePage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="max-w-lg mx-auto px-4 py-16 space-y-6">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-48 w-full" />
        </div>
      }>
        <ShareContent />
      </Suspense>
    </div>
  )
}
