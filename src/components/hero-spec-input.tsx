"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Cpu, Monitor, Database, HardDrive, ArrowRight, Sparkles, Zap, ShieldCheck, BarChart3, Moon, Sun, Info } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { useAppStore } from "@/store/use-app-store"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import type { HardwareSpecs } from "@/types/model"
import { SpecsHelperDialog, SpecsHelperDialogInline } from "@/components/specs-helper-dialog"

const INFERENCE_ENGINES = [
  { value: "ollama", label: "Ollama", emoji: "🦙", desc: "Easiest setup, works everywhere" },
  { value: "llama-cpp", label: "llama.cpp", emoji: "💻", desc: "Raw performance, manual setup" },
  { value: "vllm", label: "vLLM", emoji: "⚡", desc: "GPU-only, production serving" },
  { value: "transformers", label: "Transformers", emoji: "🤗", desc: "Python, full HF ecosystem" },
] as const

function getSpecSummary(ramGB: number, vramGB: number | null, hasGPU: boolean): string {
  const effectiveMem = hasGPU && vramGB ? vramGB : ramGB
  const overhead = hasGPU ? 0.85 : 0.7
  const usableGB = effectiveMem * overhead
  const estMaxParams = Math.floor(usableGB / 0.59)

  if (estMaxParams <= 1) return "You can run small models up to ~1B parameters — good for testing and light tasks."
  if (estMaxParams <= 7) return `With this setup, models up to ~${estMaxParams}B parameters should run smoothly — covers most 7B models.`
  if (estMaxParams <= 14) return `Solid setup — you can comfortably run models up to ~${estMaxParams}B parameters, including most popular open-source LLMs.`
  if (estMaxParams <= 34) return `Strong hardware — models up to ~${estMaxParams}B parameters are in range, including 13B and some 30B+ models.`
  if (estMaxParams <= 72) return `High-end setup — you can run models up to ~${estMaxParams}B, including 70B models with quantization.`
  return `Very powerful — even 70B+ models should run. You have headroom for large context windows too.`
}

function getSpecColor(ramGB: number, vramGB: number | null, hasGPU: boolean): string {
  const effectiveMem = hasGPU && vramGB ? vramGB : ramGB
  if (effectiveMem >= 24) return "text-emerald-500"
  if (effectiveMem >= 12) return "text-amber-500"
  return "text-red-400"
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
  const [inference, setInference] = useState<"ollama" | "llama-cpp" | "vllm" | "transformers">(
    specs?.inference || "ollama"
  )

  useEffect(() => { setMounted(true) }, [])

  const summary = useMemo(() => getSpecSummary(ramGB, hasGPU ? vramGB : null, hasGPU), [ramGB, vramGB, hasGPU])
  const summaryColor = useMemo(() => getSpecColor(ramGB, hasGPU ? vramGB : null, hasGPU), [ramGB, vramGB, hasGPU])

  const handleSubmit = () => {
    setSpecs({
      ramGB,
      vramGB: hasGPU ? vramGB : null,
      cpuCores,
      diskFreeGB,
      inference,
    })
    setHasEnteredSpecs(true)
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-40%] left-[-10%] w-[80%] h-[80%] rounded-full bg-primary/[0.03] blur-3xl animate-mesh" />
        <div className="absolute bottom-[-40%] right-[-10%] w-[70%] h-[70%] rounded-full bg-emerald-500/[0.03] blur-3xl animate-mesh-slow" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Nav */}
      <nav className="border-b px-4 sm:px-6 py-3 flex items-center justify-between relative z-10 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight">ModelDB</span>
            <span className="ml-2 text-xs text-muted-foreground font-normal">beta</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5 opacity-70 hidden sm:inline-flex">v0.1.0</Badge>
          {mounted && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 lg:py-16 relative z-10">
        <div className="max-w-xl w-full space-y-8 sm:space-y-10">
          {/* Hero Text */}
          <div className="text-center space-y-4 sm:space-y-5">
            <Badge variant="secondary" className="mb-2 px-3 py-1 text-xs font-medium gap-1.5 border border-primary/20 bg-primary/5 text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              2.76M+ Models Indexed
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Find the right AI model
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                for your hardware
              </span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              Enter your specs. Get instant compatibility scores.
              Your data stays in your browser.
            </p>
          </div>

          {/* Feature Pills — responsive: stack on mobile */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            {[
              { icon: Zap, label: "Instant Scoring", desc: "10ms" },
              { icon: ShieldCheck, label: "Zero Tracking", desc: "100% local" },
              { icon: BarChart3, label: "2.76M+ Models", desc: "All of HF" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="text-left leading-tight">
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Spec Input Card */}
          <Card className="border shadow-2xl shadow-black/20 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6 space-y-5">
              {/* Header with specs helper — prominent */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Your hardware</span>
                <SpecsHelperDialog />
              </div>

              {/* Not sure banner — visible callout above sliders */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Not sure what to enter? Rough estimates work fine — or{" "}
                  <SpecsHelperDialogInline />
                  {" "}to find exact values.
                </p>
              </div>

              {/* Row 1: RAM + GPU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* RAM */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      RAM
                    </label>
                    <span className="text-sm font-mono text-primary font-semibold">{ramGB} GB</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={256}
                    step={4}
                    value={ramGB}
                    onChange={(e) => setRamGB(e.target.valueAsNumber)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
                    <span>4 GB</span>
                    <span>256 GB</span>
                  </div>
                </div>

                {/* GPU / VRAM */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                      VRAM
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-primary font-semibold">
                        {hasGPU ? `${vramGB} GB` : "CPU only"}
                      </span>
                      <Switch checked={hasGPU} onCheckedChange={setHasGPU} className="scale-75" />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={80}
                    step={2}
                    value={hasGPU ? vramGB : 0}
                    onChange={(e) => setVramGB(e.target.valueAsNumber)}
                    disabled={!hasGPU}
                    className={`w-full ${hasGPU ? "" : "opacity-40"}`}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
                    <span>{hasGPU ? "4 GB" : "\u2014"}</span>
                    <span>{hasGPU ? "80 GB" : "\u2014"}</span>
                  </div>
                </div>
              </div>

              {/* Live feedback */}
              <div className={`text-xs leading-relaxed px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50 transition-colors duration-300 ${summaryColor}`}>
                {summary}
              </div>

              <Separator />

              {/* Row 2: CPU + Disk */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Cpu className="w-4 h-4 text-muted-foreground" />
                    Cores
                  </label>
                  <Input
                    type="number"
                    value={cpuCores}
                    onChange={(e) => setCpuCores(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={128}
                    className="h-10 font-mono text-center"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    Disk (GB)
                  </label>
                  <Input
                    type="number"
                    value={diskFreeGB}
                    onChange={(e) => setDiskFreeGB(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={10000}
                    className="h-10 font-mono text-center"
                  />
                </div>
              </div>

              {/* Inference — with tooltips */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  Inference engine
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground/50" />
                    </TooltipTrigger>
                    <TooltipContent>How the model runs on your machine. Pick Ollama if unsure.</TooltipContent>
                  </Tooltip>
                </label>
                <div className="grid grid-cols-2 sm:flex gap-1.5">
                  {INFERENCE_ENGINES.map((eng) => (
                    <Tooltip key={eng.value}>
                      <TooltipTrigger>
                        <button
                          onClick={() => setInference(eng.value as any)}
                          className={`w-full sm:flex-1 h-9 rounded-lg text-xs font-medium transition-all border ${
                            inference === eng.value
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {eng.emoji} {eng.label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{eng.desc}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <Button
                onClick={handleSubmit}
                size="lg"
                className="w-full h-12 text-base font-bold gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Find Compatible Models
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Skip link */}
          <div className="text-center">
            <Button
              variant="ghost"
              className="text-sm text-muted-foreground/70 hover:text-foreground transition-colors"
              onClick={() => {
                setHasEnteredSpecs(false)
                router.push("/dashboard")
              }}
            >
              or browse all models without specs
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
