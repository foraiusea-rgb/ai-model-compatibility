"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Cpu, Monitor, Database, HardDrive, ArrowRight, Sparkles } from "lucide-react"
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

  const vramValues = [vramGB]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl w-full space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <Badge variant="secondary" className="mb-2">
            <Sparkles className="w-3 h-3 mr-1" />
            2.76M+ AI Models Indexed
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Find the right AI model
            <br />
            <span className="text-muted-foreground">for your hardware</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Enter your specs. Get instant compatibility scores. No signup, no tracking.
          </p>
        </div>

        {/* Spec Input Card */}
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle>Your Hardware</CardTitle>
            <CardDescription>
              Tell us what you&apos;re running on and we&apos;ll match you with compatible models.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* RAM */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Database className="w-4 h-4" />
                  System RAM
                </label>
                <span className="text-sm font-mono text-muted-foreground">{ramGB} GB</span>
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>4 GB</span>
                <span>256 GB</span>
              </div>
            </div>

            {/* GPU Toggle & VRAM */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Monitor className="w-4 h-4" />
                  GPU / VRAM
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
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
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>4 GB</span>
                    <span>80 GB</span>
                  </div>
                </>
              )}
            </div>

            {/* CPU Cores & Disk */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Cpu className="w-4 h-4" />
                  CPU Cores
                </label>
                <Input
                  type="number"
                  value={cpuCores}
                  onChange={(e) => setCpuCores(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={128}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <HardDrive className="w-4 h-4" />
                  Free Disk (GB)
                </label>
                <Input
                  type="number"
                  value={diskFreeGB}
                  onChange={(e) => setDiskFreeGB(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={10000}
                  className="font-mono"
                />
              </div>
            </div>

            {/* Inference Engine */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Inference Engine</label>
              <Select value={inference} onValueChange={(v) => setInference(v as HardwareSpecs["inference"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select engine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ollama">Ollama (recommended)</SelectItem>
                  <SelectItem value="llama-cpp">llama.cpp</SelectItem>
                  <SelectItem value="vllm">vLLM (GPU)</SelectItem>
                  <SelectItem value="transformers">HuggingFace Transformers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSubmit} size="lg" className="w-full gap-2">
              Find Compatible Models
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Skip option */}
        <div className="text-center">
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => {
              setHasEnteredSpecs(false)
              router.push("/dashboard")
            }}
          >
            Skip — browse all models without specs
          </Button>
        </div>
      </div>
    </div>
  )
}
