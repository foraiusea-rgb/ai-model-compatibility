"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Cpu, Monitor, Database, HardDrive, ArrowRight, Zap, Moon, Sun, Info,
  ChevronDown, ChevronUp, Shield, Globe, Fingerprint,
} from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { useAppStore } from "@/store/use-app-store"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { computeCompatibility, getCompatibilityIcon } from "@/lib/compatibility"
import { MOCK_MODELS } from "@/lib/mock-data"
import { SpecsHelperDialogInline } from "@/components/specs-helper-dialog"
import type { HardwareSpecs, ModelCard } from "@/types/model"

// Preview models — hand-picked for a good range of sizes
const PREVIEW_MODELS = MOCK_MODELS.filter(m =>
  ["microsoft/Phi-3.5-mini-instruct", "meta-llama/Meta-Llama-3.1-8B-Instruct", "Qwen/Qwen2.5-Coder-32B-Instruct", "Qwen/Qwen2.5-72B-Instruct", "stabilityai/stable-diffusion-3.5-large", "openai/whisper-large-v3-turbo"].includes(m.modelId)
)

function getBarColor(compat: string): string {
  switch (compat) {
    case "smooth": return "bg-emerald-500"
    case "slow": return "bg-amber-500"
    case "heavy": return "bg-red-500"
    default: return "bg-muted-foreground/30"
  }
}

function getBarBorder(compat: string): string {
  switch (compat) {
    case "smooth": return "border-l-emerald-500"
    case "slow": return "border-l-amber-500"
    case "heavy": return "border-l-red-500"
    default: return "border-l-border"
  }
}

function getBadgeStyle(compat: string): string {
  switch (compat) {
    case "smooth": return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
    case "slow": return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
    case "heavy": return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
    default: return "bg-muted text-muted-foreground border-border"
  }
}

function getCompatLabel(compat: string): string {
  switch (compat) {
    case "smooth": return "Runs smoothly"
    case "slow": return "Runs slow"
    case "heavy": return "Too heavy"
    default: return "Unknown"
  }
}

function PreviewCard({ model, specs }: { model: ModelCard; specs: { vramGB: number | null; ramGB: number } }) {
  const memTotal = specs.vramGB || specs.ramGB
  const usagePct = model.estimatedSizeGB ? Math.min(100, Math.round((model.estimatedSizeGB / memTotal) * 100)) : 0

  return (
    <div className={`p-3 rounded-lg border border-l-[3px] ${getBarBorder(model.compatibility)} bg-card/60 transition-all duration-300 space-y-1.5`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {model.name || model.modelId.split("/").pop()}
          </p>
          <p className="text-[10px] text-muted-foreground/60">{model.author} &middot; {model.paramCount}B &middot; {model.estimatedSizeGB?.toFixed(1)} GB</p>
        </div>
        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-auto shrink-0 font-semibold ${getBadgeStyle(model.compatibility)}`}>
          {getCompatibilityIcon(model.compatibility)} {getCompatLabel(model.compatibility)}
        </Badge>
      </div>
      <div className="h-1 rounded-full bg-muted/60 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(model.compatibility)}`} style={{ width: `${usagePct}%` }} />
      </div>
      <p className="text-[9px] text-muted-foreground/50 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {usagePct}% of {specs.vramGB ? "VRAM" : "RAM"}
      </p>
    </div>
  )
}

export function HeroSpecInput() {
  const router = useRouter()
  const { setSpecs, specs, setHasEnteredSpecs } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [ramGB, setRamGB] = useState(specs?.ramGB || 16)
  const [vramGB, setVramGB] = useState<number>(specs?.vramGB ?? 12)
  const [hasGPU, setHasGPU] = useState(specs?.vramGB !== null)
  const [cpuCores, setCpuCores] = useState(specs?.cpuCores || 8)
  const [diskFreeGB, setDiskFreeGB] = useState(specs?.diskFreeGB || 100)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Live preview — compute compatibility for preview models based on current slider values
  const currentSpecs: HardwareSpecs = useMemo(() => ({
    ramGB,
    vramGB: hasGPU ? vramGB : null,
    cpuCores,
    diskFreeGB,
    inference: "ollama",
  }), [ramGB, vramGB, hasGPU, cpuCores, diskFreeGB])

  const previewCards: ModelCard[] = useMemo(() => {
    return PREVIEW_MODELS.map((m) => {
      if (m.estimatedSizeGB != null) {
        const compat = computeCompatibility(m.estimatedSizeGB, m.contextLength ?? null, currentSpecs)
        return { ...m, compatibility: compat.rating, compatibilityScore: compat.score, matchReason: compat.reason } as ModelCard
      }
      return { ...m, compatibility: "unknown" as const, compatibilityScore: 0, matchReason: "" } as ModelCard
    }).sort((a, b) => (a.estimatedSizeGB || 0) - (b.estimatedSizeGB || 0))
  }, [currentSpecs])

  const smoothCount = previewCards.filter(m => m.compatibility === "smooth").length
  const totalCount = previewCards.length

  const handleSubmit = () => {
    setSpecs(currentSpecs)
    setHasEnteredSpecs(true)
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-40%] left-[-10%] w-[80%] h-[80%] rounded-full bg-primary/[0.03] blur-3xl animate-mesh" />
        <div className="absolute bottom-[-40%] right-[-10%] w-[70%] h-[70%] rounded-full bg-emerald-500/[0.03] blur-3xl animate-mesh-slow" />
      </div>

      {/* Nav */}
      <nav className="border-b px-4 sm:px-6 py-3 flex items-center justify-between relative z-10 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base tracking-tight">ModelDB</span>
        </div>
        <div className="flex items-center gap-2">
          {mounted && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10 relative z-10">
        <div className="max-w-2xl w-full space-y-6">

          {/* Hero — tighter */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
              Will it run on
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent"> your machine</span>?
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Set your RAM and GPU. See which AI models fit. No account, no tracking.
            </p>
          </div>

          {/* Trust signals — reframed as user benefits */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5" />No account needed</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />100% in your browser</span>
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Every open-source model</span>
          </div>

          {/* Two-column layout: Specs on left, Preview on right */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* LEFT: Spec inputs (3 cols) */}
            <Card className="lg:col-span-3 border shadow-xl shadow-black/10 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Your hardware</span>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <SpecsHelperDialogInline />
                  </div>
                </div>

                {/* RAM slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-sm font-medium">
                      <Database className="w-3.5 h-3.5 text-muted-foreground" />RAM
                    </label>
                    <span className="text-sm font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{ramGB} GB</span>
                  </div>
                  <input type="range" min={4} max={256} step={4} value={ramGB}
                    onChange={(e) => setRamGB(e.target.valueAsNumber)} className="w-full" />
                  <div className="flex justify-between text-[9px] text-muted-foreground/50 font-mono"><span>4</span><span>256 GB</span></div>
                </div>

                {/* VRAM slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-sm font-medium">
                      <Monitor className="w-3.5 h-3.5 text-muted-foreground" />GPU
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {hasGPU ? `${vramGB} GB` : "CPU only"}
                      </span>
                      <Switch checked={hasGPU} onCheckedChange={setHasGPU} className="scale-75" />
                    </div>
                  </div>
                  <input type="range" min={4} max={80} step={2}
                    value={hasGPU ? vramGB : 0}
                    onChange={(e) => setVramGB(e.target.valueAsNumber)}
                    disabled={!hasGPU}
                    className={`w-full ${hasGPU ? "" : "opacity-30"}`} />
                  <div className="flex justify-between text-[9px] text-muted-foreground/50 font-mono">
                    <span>{hasGPU ? "4" : "\u2014"}</span><span>{hasGPU ? "80 GB" : "\u2014"}</span>
                  </div>
                </div>

                {/* Advanced toggle */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors w-full"
                >
                  {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showAdvanced ? "Hide advanced" : "CPU cores, disk space"} — rarely changes the result
                </button>

                {showAdvanced && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Cpu className="w-3 h-3" />Cores
                      </label>
                      <Input type="number" value={cpuCores}
                        onChange={(e) => setCpuCores(Math.max(1, parseInt(e.target.value) || 1))}
                        min={1} max={128} className="h-9 font-mono text-center text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <HardDrive className="w-3 h-3" />Disk (GB)
                      </label>
                      <Input type="number" value={diskFreeGB}
                        onChange={(e) => setDiskFreeGB(Math.max(1, parseInt(e.target.value) || 1))}
                        min={1} max={10000} className="h-9 font-mono text-center text-sm" />
                    </div>
                  </div>
                )}

                {/* Dual CTAs */}
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 h-11 text-sm font-bold gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Find compatible models
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 text-sm px-4"
                    onClick={() => { setHasEnteredSpecs(false); router.push("/dashboard") }}
                  >
                    Browse all
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* RIGHT: Live preview (2 cols) */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold text-muted-foreground">Live preview</p>
                <p className="text-[10px] text-muted-foreground/60">
                  <span className="text-emerald-500 font-semibold">{smoothCount}</span>/{totalCount} run on this setup
                </p>
              </div>
              <div className="space-y-1.5">
                {previewCards.map((m) => (
                  <PreviewCard key={m.modelId} model={m} specs={currentSpecs} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/40 text-center pt-1">
                Drag the sliders — badges update in real time
              </p>
            </div>
          </div>

          {/* Helper nudge */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/50">
            <Info className="w-3 h-3" />
            <span>Rough estimates are fine. Based on <a href="https://huggingface.co" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted-foreground">HuggingFace</a>, the largest open-source model registry.</span>
          </div>

        </div>
      </div>
    </div>
  )
}
