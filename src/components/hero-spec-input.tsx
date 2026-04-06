"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Cpu, Monitor, Database, HardDrive, ArrowRight, Sparkles, Zap, ShieldCheck, BarChart3 } from "lucide-react"
import { useState } from "react"
import { useAppStore } from "@/store/use-app-store"
import { useRouter } from "next/navigation"
import type { HardwareSpecs } from "@/types/model"
import { SpecsHelperDialog } from "@/components/specs-helper-dialog"

const INFERENCE_ENGINES = [
  { value: "ollama", label: "Ollama", emoji: "🦙" },
  { value: "llama-cpp", label: "llama.cpp", emoji: "💻" },
  { value: "vllm", label: "vLLM", emoji: "⚡" },
  { value: "transformers", label: "Transformers", emoji: "🤗" },
] as const

export function HeroSpecInput() {
  const router = useRouter()
  const { setSpecs, specs, setHasEnteredSpecs } = useAppStore()
  const [ramGB, setRamGB] = useState(specs?.ramGB || 16)
  const [vramGB, setVramGB] = useState<number>(specs?.vramGB ?? 12)
  const [hasGPU, setHasGPU] = useState(specs?.vramGB !== null)
  const [cpuCores, setCpuCores] = useState(specs?.cpuCores || 8)
  const [diskFreeGB, setDiskFreeGB] = useState(specs?.diskFreeGB || 100)
  const [inference, setInference] = useState<"ollama" | "llama-cpp" | "vllm" | "transformers">(
    specs?.inference || "ollama"
  )

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
      <nav className="border-b px-6 py-3 flex items-center justify-between relative z-10 bg-background/80 backdrop-blur-md">
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
          <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5 opacity-70">v0.1.0</Badge>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 lg:py-16 relative z-10">
        <div className="max-w-xl w-full space-y-10">
          {/* Hero Text - Bigger, tighter, better gradient */}
          <div className="text-center space-y-5">
            <Badge variant="secondary" className="mb-2 px-3 py-1 text-xs font-medium gap-1.5 border border-primary/20 bg-primary/5 text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              2.76M+ Models Indexed & Searched
            </Badge>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Find the right AI model
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                for your hardware
              </span>
            </h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              Enter your specs. Get instant compatibility scores.
              Your data stays in your browser.
            </p>
          </div>

          {/* Feature Pills - Tighter, more compact */}
          <div className="flex items-center justify-center gap-6">
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

          {/* Spec Input Card - Cleaned up */}
          <div className="flex justify-end -mb-4">
            <SpecsHelperDialog />
          </div>
          <Card className="border shadow-2xl shadow-black/20 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-6 space-y-5">
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
                    className={hasGPU ? "" : "opacity-40"}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
                    <span>{hasGPU ? "4 GB" : "—"}</span>
                    <span>{hasGPU ? "80 GB" : "—"}</span>
                  </div>
                </div>
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

              {/* Inference — Chip-style selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Inference</label>
                <div className="flex gap-1.5">
                  {INFERENCE_ENGINES.map((eng) => (
                    <button
                      key={eng.value}
                      onClick={() => setInference(eng.value as any)}
                      className={`flex-1 h-9 rounded-lg text-xs font-medium transition-all border ${
                        inference === eng.value
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {eng.emoji} {eng.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA - Big, bold, gradient */}
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
