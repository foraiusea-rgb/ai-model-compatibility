"use client"

import { MOCK_MODELS } from "@/lib/mock-data"
import { computeCompatibility, getCompatibilityColor, getCompatibilityLabel, getCompatibilityIcon } from "@/lib/compatibility"
import { useAppStore } from "@/store/use-app-store"
import type { ModelCard, HFModel } from "@/types/model"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, Download, Calendar, Cpu, HardDrive, FileText, Sparkles, ArrowLeft, Copy, Check, MessageSquare, ExternalLink, Zap, Moon, Sun, AlertTriangle, Share2, Scale } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { format, isValid } from "date-fns"
import { useTheme } from "next-themes"

function getMatchReasonStyle(compat: string): string {
  switch (compat) {
    case "smooth": return "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
    case "slow": return "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
    case "heavy": return "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
    default: return "bg-muted/50 border-border text-muted-foreground"
  }
}

export default function ModelPage() {
  const router = useRouter()
  const params = useParams()
  const modelId = decodeURIComponent(params.id as string)
  const { specs, bookmarks, addBookmark, removeBookmark, openrouterApiKey, setApiKey, openrouterModel } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Try mock data first, then fetch from API
  const mockModel = useMemo(() => MOCK_MODELS.find((m) => m.modelId === modelId), [modelId])
  const [apiModel, setApiModel] = useState<HFModel | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!mockModel)

  useEffect(() => {
    if (mockModel) return // already have it
    setLoading(true)
    setLoadError(null)
    fetch(`/api/models?q=${encodeURIComponent(modelId)}&limit=5`)
      .then((r) => r.json())
      .then((data) => {
        const match = data.models?.find((m: HFModel) => m.modelId === modelId)
        if (match) {
          setApiModel(match)
        } else {
          setLoadError("Model not found")
        }
      })
      .catch(() => setLoadError("Failed to load model data"))
      .finally(() => setLoading(false))
  }, [modelId, mockModel])

  const model = mockModel || apiModel

  const enriched: ModelCard | null = useMemo(() => {
    if (!model) return null
    if (specs && model.estimatedSizeGB != null) {
      const compat = computeCompatibility(model.estimatedSizeGB, model.contextLength ?? null, specs)
      return { ...model, compatibility: compat.rating, compatibilityScore: compat.score, matchReason: compat.reason } as ModelCard
    }
    return { ...model, compatibility: "unknown", compatibilityScore: 0, matchReason: "No specs configured" } as ModelCard
  }, [model, specs])

  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [copiedOllama, setCopiedOllama] = useState(false)
  const [copiedHG, setCopiedHG] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [sharecopied, setSharecopied] = useState(false)

  const addToCompare = useAppStore((s) => s.addToCompare)
  const compareList = useAppStore((s) => s.compareList)
  const isComparing = compareList.some(m => m.modelId === modelId)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (model) {
      setIsBookmarked(bookmarks.some((b) => b.modelId === modelId))
    }
  }, [modelId, bookmarks, model])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b px-4 lg:px-6 py-3">
          <Button variant="ghost" onClick={() => router.back()} size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />Back
          </Button>
        </header>
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  // Error state
  if (loadError || !enriched) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b px-4 lg:px-6 py-3">
          <Button variant="ghost" onClick={() => router.back()} size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />Back
          </Button>
        </header>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
          <p className="text-sm text-muted-foreground">{loadError || "Model not found"}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>
            <Button variant="outline" size="sm" onClick={() => window.open(`https://huggingface.co/${modelId}`, "_blank")}>
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />View on HuggingFace
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const downloadCmdOllama = `ollama pull ${enriched.name?.toLowerCase().replace(/[^\w]/g, "-") || "model-name"}`
  const downloadCmdHG = `huggingface-cli download ${enriched.modelId}`

  const handleCopy = (cmd: string, which: "ollama" | "hg") => {
    navigator.clipboard.writeText(cmd)
    if (which === "ollama") {
      setCopiedOllama(true)
      setTimeout(() => setCopiedOllama(false), 2000)
    } else {
      setCopiedHG(true)
      setTimeout(() => setCopiedHG(false), 2000)
    }
  }

  const handleAISummary = async () => {
    if (!openrouterApiKey) return
    setAiLoading(true)
    setAiSummary(null)
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "AI Model Compatibility Dashboard",
        },
        body: JSON.stringify({
          model: openrouterModel,
          messages: [
            { role: "system", content: "You are an AI model compatibility expert. Give concise, practical recommendations." },
            { role: "user", content: `Analyze: ${enriched.modelId}\nParams: ${enriched.paramCount}B, Size: ~${enriched.estimatedSizeGB}GB, Context: ${enriched.contextLength ? `${enriched.contextLength} tokens` : "N/A"}, License: ${enriched.license}\nMy Hardware: ${specs?.ramGB}GB RAM, ${specs?.vramGB ? specs.vramGB + "GB VRAM" : "CPU only"}, ${specs?.cpuCores} cores\n\nGive a short recommendation (3-4 sentences) on whether this model runs on my hardware and any caveats.` },
          ],
        }),
      })
      const data = await res.json()
      setAiSummary(data.choices?.[0]?.message?.content || "Failed to generate summary.")
    } catch {
      setAiSummary("Error generating summary. Check your API key and try again.")
    } finally {
      setAiLoading(false)
    }
  }

  const criticalSpecs = [
    { label: "Parameters", value: enriched.paramCount ? `${enriched.paramCount}B` : "N/A", icon: Cpu },
    { label: "Estimated size", value: enriched.estimatedSizeGB ? `~${enriched.estimatedSizeGB.toFixed(1)} GB` : "N/A", icon: HardDrive },
    { label: "Context length", value: enriched.contextLength ? `${enriched.contextLength.toLocaleString()} tokens` : "N/A", icon: FileText },
  ]
  const secondarySpecs = [
    { label: "Downloads", value: enriched.downloads >= 1000000 ? `${(enriched.downloads / 1000000).toFixed(1)}M` : enriched.downloads >= 1000 ? `${(enriched.downloads / 1000).toFixed(0)}K` : enriched.downloads.toString() },
    { label: "License", value: enriched.license || "N/A" },
    { label: "Format", value: enriched.format?.toUpperCase() || "N/A" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 lg:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.back()} size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />Back
          </Button>
          <Separator orientation="vertical" className="h-5" />
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

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl lg:text-3xl font-bold font-mono">{enriched.name || enriched.modelId.split("/").pop()}</h1>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => { if (isBookmarked) removeBookmark(modelId); else addBookmark(modelId); setIsBookmarked(!isBookmarked) }}>
                  <Star className={`w-5 h-5 ${isBookmarked ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-400"}`} />
                </Button>
                <Button variant="ghost" size="sm" title={isComparing ? "In compare list" : "Add to compare"} onClick={() => { if (!isComparing && model) addToCompare(model) }}>
                  <Scale className={`w-4 h-4 ${isComparing ? "text-primary" : "text-muted-foreground hover:text-primary"}`} />
                </Button>
                <Button variant="ghost" size="sm" title="Share this result" onClick={() => {
                  const url = new URL("/share", window.location.origin)
                  url.searchParams.set("model", enriched.modelId)
                  if (specs) {
                    url.searchParams.set("ram", String(specs.ramGB))
                    if (specs.vramGB) url.searchParams.set("vram", String(specs.vramGB))
                    url.searchParams.set("cores", String(specs.cpuCores))
                    url.searchParams.set("disk", String(specs.diskFreeGB))
                  }
                  navigator.clipboard.writeText(url.toString())
                  setSharecopied(true)
                  setTimeout(() => setSharecopied(false), 2000)
                }}>
                  {sharecopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />}
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground">
              by <span className="font-medium text-foreground">{enriched.author}</span>
              {" \u00B7 "}
              <span className="font-mono text-xs">{enriched.modelId}</span>
            </p>
          </div>
          {enriched.compatibility !== "unknown" && (
            <Badge variant="outline" className={`text-sm font-semibold self-start px-3 py-1 ${getCompatibilityColor(enriched.compatibility)}`}>
              <span className="mr-1">{getCompatibilityIcon(enriched.compatibility)}</span>
              {getCompatibilityLabel(enriched.compatibility)}
            </Badge>
          )}
        </div>

        {enriched.matchReason && enriched.compatibility !== "unknown" && (
          <div className={`mb-6 p-4 rounded-xl border text-sm ${getMatchReasonStyle(enriched.compatibility)}`}>
            <p>{enriched.matchReason}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Specifications</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  {criticalSpecs.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="p-3 rounded-lg bg-muted/40 border border-border/50 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                        <Icon className="w-3 h-3" />{label}
                      </div>
                      <p className="text-base font-semibold font-mono">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                  {secondarySpecs.map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {enriched.pipeline_tag && <Badge variant="default">{enriched.pipeline_tag}</Badge>}
                  {enriched.tags.filter(t => !t.startsWith("license:") && !t.startsWith("region:")).map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  Updated {enriched.updatedAt && isValid(new Date(enriched.updatedAt))
                    ? format(new Date(enriched.updatedAt), "MMMM d, yyyy")
                    : "Unknown"}
                </div>
              </CardContent>
            </Card>
            <a href={`https://huggingface.co/${enriched.modelId}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />View on HuggingFace
            </a>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Download className="w-4 h-4" />Quick download</CardTitle>
                <CardDescription>Run these commands in your terminal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <code className="flex-1 text-xs font-mono break-all">{downloadCmdOllama}</code>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => handleCopy(downloadCmdOllama, "ollama")}>
                    {copiedOllama ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <code className="flex-1 text-xs font-mono break-all">{downloadCmdHG}</code>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => handleCopy(downloadCmdHG, "hg")}>
                    {copiedHG ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4" />AI recommendation</CardTitle>
                <CardDescription>Get personalized advice based on your hardware</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!openrouterApiKey ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      This uses <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">OpenRouter</a> to generate recommendations. Free tier models are available. Your key stays in your browser.
                    </p>
                    <input type="password" placeholder="sk-or-v1-..."
                      className="flex-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      onChange={(e) => setApiKey(e.target.value)} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button onClick={handleAISummary} disabled={aiLoading} className="gap-2 w-full">
                      <Sparkles className="w-4 h-4" />{aiLoading ? "Analyzing..." : "Generate recommendation"}
                    </Button>
                    {aiSummary && (
                      <div className="p-4 bg-muted/50 rounded-lg text-sm leading-relaxed whitespace-pre-wrap border">{aiSummary}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compatibility Breakdown */}
            {specs && enriched.estimatedSizeGB && enriched.compatibility !== "unknown" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />Compatibility breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const memTotal = specs.vramGB || specs.ramGB
                    const memLabel = specs.vramGB ? "VRAM" : "RAM"
                    const headroom = memTotal - enriched.estimatedSizeGB
                    const headroomPct = Math.round((headroom / memTotal) * 100)
                    const usagePct = Math.min(100, Math.round((enriched.estimatedSizeGB / memTotal) * 100))
                    const ctxOverhead = enriched.contextLength
                      ? Math.min(enriched.estimatedSizeGB * 0.5, (enriched.contextLength / 1000) * 0.1 * (enriched.estimatedSizeGB / 4))
                      : 0

                    return (
                      <>
                        {/* Visual bar */}
                        <div className="space-y-1.5">
                          <div className="h-3 rounded-full bg-muted/60 overflow-hidden relative">
                            <div
                              className={`h-full rounded-full transition-all ${
                                enriched.compatibility === "smooth" ? "bg-emerald-500" :
                                enriched.compatibility === "slow" ? "bg-amber-500" : "bg-red-500"
                              }`}
                              style={{ width: `${usagePct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                            <span>0 GB</span>
                            <span>{memTotal} GB {memLabel}</span>
                          </div>
                        </div>

                        {/* Numbers */}
                        <div className="space-y-2 text-[12px]">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Model size</span>
                            <span className="font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{enriched.estimatedSizeGB.toFixed(1)} GB</span>
                          </div>
                          {ctxOverhead > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Context overhead (est.)</span>
                              <span className="font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>~{ctxOverhead.toFixed(1)} GB</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Your {memLabel}</span>
                            <span className="font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{memTotal} GB</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground font-medium">Headroom</span>
                            <span className={`font-semibold ${headroom >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                              {headroom >= 0 ? `${headroom.toFixed(1)} GB (${headroomPct}%)` : `${Math.abs(headroom).toFixed(1)} GB over`}
                            </span>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Quick Start Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4" />Quick start
                </CardTitle>
                <CardDescription>Get this model running in 3 steps</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
                    <div>
                      <p className="text-sm font-medium">Install Ollama</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Download from{" "}
                        <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">ollama.com</a>
                        {" "} — works on Mac, Windows, and Linux.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
                    <div>
                      <p className="text-sm font-medium">Pull the model</p>
                      <div className="flex items-center gap-2 mt-1 p-2 bg-muted/50 rounded-md">
                        <code className="text-[11px] font-mono flex-1 break-all">{downloadCmdOllama}</code>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => handleCopy(downloadCmdOllama, "ollama")}>
                          {copiedOllama ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
                    <div>
                      <p className="text-sm font-medium">Start chatting</p>
                      <div className="flex items-center gap-2 mt-1 p-2 bg-muted/50 rounded-md">
                        <code className="text-[11px] font-mono flex-1 break-all">{`ollama run ${enriched.name?.toLowerCase().replace(/[^\w]/g, "-") || "model-name"}`}</code>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
