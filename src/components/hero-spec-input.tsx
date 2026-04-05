"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Cpu, Monitor, Database, HardDrive, ArrowRight, Sparkles, Zap, ShieldCheck, BarChart3 } from "lucide-react"
import { useState } from "react"
import { useAppStore } from "@/store/use-app-store"
import { useRouter } from "next/navigation"
import type { HardwareSpecs } from "@/types/model"

export function HeroSpecInput() {
  const router = useRouter()
  const { setSpecs, specs, setHasEnteredSpecs } = useAppStore()
  const [ramGB, setRamGB] = useState(specs?.ramGB || 16)
  const [vramGB, setVramGB] = useState<number>(specs?.vramGB ?? 8)
  const [hasGPU, setHasGPU] = useState(specs?.vramGB !== null)
  const [cpuCores, setCpuCores] = useState(specs?.cpuCores || 8)
  const [diskFreeGB, setDiskFreeGB] = useState(specs?.diskFreeGB || 100)
  const [inference, setInference] = useState<"ollama" | "llama-cpp" | "vllm" | "transformers">(
    specs?.inference || "ollama"
  )

  const handleSubmit = () => {
    const hardwareSpecs: HardwareSpecs = {
      ramGB,
      vramGB: hasGPU ? vramGB : null,
      cpuCores,
      diskFreeGB,
      inference,
    }
    setSpecs(hardwareSpecs)
    setHasEnteredSpecs(true)
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base tracking-tight">ModelDB</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-mono text-xs">v0.1.0</Badge>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 lg:py-16">
        <div className="max-w-2xl w-full space-y-8">
          {/* Hero Text */}
          <div className="text-center space-y-4">
            <Badge variant="secondary" className="mb-2 px-3 py-1 text-xs font-medium gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              2.76M+ Models Indexed & Searched
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Find the right AI model
              <br />
              <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                for your hardware
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Enter your specs. Get instant compatibility scores. No signup, no tracking. Your data stays in your browser.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: Zap, label: "Instant Scoring", desc: "10ms response" },
              { icon: ShieldCheck, label: "Zero Tracking", desc: "100% local" },
              { icon: BarChart3, label: "2.76M+ Models", desc: "All of HuggingFace" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card/50">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-xs font-medium leading-none">{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Spec Input Card */}
          <Card className="border-2 shadow-xl shadow-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Monitor className="w-5 h-5 text-primary" />
                Your Hardware
              </CardTitle>
              <CardDescription>
                Tell us what you&apos;re running on and we&apos;ll match you with compatible models.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* RAM */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    System RAM
                  </label>
                  <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded text-foreground font-semibold">{ramGB} GB</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={256}
                  step={4}
                  value={ramGB}
                  onChange={(e) => setRamGB(e.target.valueAsNumber)}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>4 GB</span>
                  <span>256 GB</span>
                </div>
              </div>

              <Separator />

              {/* GPU Toggle & VRAM */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                    GPU / VRAM
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded text-foreground font-semibold">
                      {hasGPU ? `${vramGB} GB` : "CPU Only"}
                    </span>
                    <Switch checked={hasGPU} onCheckedChange={setHasGPU} />
                  </div>
                </div>
                {hasGPU && (
                  <>
                    <input
                      type="range"
                      min={4}
                      max={80}
                      step={2}
                      value={vramGB}
                      onChange={(e) => setVramGB(e.target.valueAsNumber)}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>4 GB</span>
                      <span>80 GB</span>
                    </div>
                  </>
                )}
              </div>

              <Separator />

              {/* CPU Cores & Disk */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Cpu className="w-4 h-4 text-muted-foreground" />
                    CPU Cores
                  </label>
                  <Input
                    type="number"
                    value={cpuCores}
                    onChange={(e) => setCpuCores(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={128}
                    className="font-mono h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    Free Disk (GB)
                  </label>
                  <Input
                    type="number"
                    value={diskFreeGB}
                    onChange={(e) => setDiskFreeGB(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={10000}
                    className="font-mono h-10"
                  />
                </div>
              </div>

              <Separator />

              {/* Inference Engine */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Inference Engine</label>
                <Select value={inference} onValueChange={(v) => setInference(v as HardwareSpecs["inference"])}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select engine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">🦙 Ollama (recommended)</SelectItem>
                    <SelectItem value="llama-cpp">💻 llama.cpp</SelectItem>
                    <SelectItem value="vllm">⚡ vLLM (GPU)</SelectItem>
                    <SelectItem value="transformers">🤗 HuggingFace Transformers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSubmit} size="lg" className="w-full gap-2 h-12 text-base font-semibold">
                Find Compatible Models
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Skip option */}
          <div className="text-center">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                setHasEnteredSpecs(false)
                router.push("/dashboard")
              }}
            >
              Skip — browse all models without specs →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
