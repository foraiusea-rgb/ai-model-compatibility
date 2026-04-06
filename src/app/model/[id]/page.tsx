"use client"

import { MOCK_MODELS } from "@/lib/mock-data"
import { computeCompatibility, getCompatibilityColor, getCompatibilityLabel, getCompatibilityIcon } from "@/lib/compatibility"
import { useAppStore } from "@/store/use-app-store"
import type { ModelCard } from "@/types/model"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, Download, Calendar, Cpu, HardDrive, FileText, Sparkles, ArrowLeft, Copy, Check, MessageSquare, ExternalLink, Zap } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { format, isValid } from "date-fns"

export default function ModelPage() {
  const router = useRouter()
  const params = useParams()
  const modelId = decodeURIComponent(params.id as string)
  const { specs, bookmarks, addBookmark, removeBookmark, openrouterApiKey, setApiKey, openrouterModel } = useAppStore()

  const model = useMemo(() => MOCK_MODELS.find((m) => m.modelId === modelId), [modelId])

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
  const [copied, setCopied] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  useEffect(() => {
    if (model) {
      setIsBookmarked(bookmarks.some((b) => b.modelId === modelId))
    }
  }, [modelId, bookmarks, model])

  if (!enriched) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const downloadCmdOllama = `ollama pull ${enriched.name?.toLowerCase().replace(/[^\w]/g, "-") || "model-name"}`
  const downloadCmdHG = `huggingface-cli download ${enriched.modelId}`

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b px-4 lg:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.back()} size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">ModelDB</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl lg:text-3xl font-bold">{enriched.name || enriched.modelId.split("/").pop()}</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isBookmarked) removeBookmark(modelId)
                  else addBookmark(modelId)
                  setIsBookmarked(!isBookmarked)
                }}
              >
                <Star className={`w-5 h-5 ${isBookmarked ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-400"}`} />
              </Button>
            </div>
            <p className="text-muted-foreground">
              by <span className="font-medium text-foreground">{enriched.author}</span>
              {" · "}
              <span className="font-mono text-xs">{enriched.modelId}</span>
            </p>
          </div>

          {enriched.compatibility !== "unknown" && (
            <Badge variant="outline" className={`text-sm font-medium self-start ${getCompatibilityColor(enriched.compatibility)}`}>
              <span className="mr-1">{getCompatibilityIcon(enriched.compatibility)}</span>
              {getCompatibilityLabel(enriched.compatibility)}
            </Badge>
          )}
        </div>

        {/* Match Reason */}
        {enriched.matchReason && enriched.compatibility !== "unknown" && (
          <div className="mb-6 p-4 rounded-xl bg-muted/50 border text-sm">
            <p className="text-muted-foreground">{enriched.matchReason}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Model Specs (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  {[
                    { label: "Parameters", value: enriched.paramCount ? `${enriched.paramCount}B` : "N/A", icon: Cpu },
                    { label: "Quantized Size", value: enriched.estimatedSizeGB ? `~${enriched.estimatedSizeGB.toFixed(1)} GB` : "N/A", icon: HardDrive },
                    { label: "Context Length", value: enriched.contextLength ? `${enriched.contextLength.toLocaleString()} tokens` : "N/A", icon: FileText },
                    { label: "Downloads", value: enriched.downloads >= 1000000 ? `${(enriched.downloads / 1000000).toFixed(1)}M` : enriched.downloads >= 1000 ? `${(enriched.downloads / 1000).toFixed(0)}K` : enriched.downloads.toString(), icon: Download },
                    { label: "License", value: enriched.license || "N/A", icon: null },
                    { label: "Format", value: enriched.format?.toUpperCase() || "N/A", icon: null },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label}>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        {label}
                      </div>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  ))}
                </div>

                <Separator className="my-5" />

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {enriched.pipeline_tag && (
                    <Badge variant="default">{enriched.pipeline_tag}</Badge>
                  )}
                  {enriched.tags.filter(t => !t.startsWith("license:") && !t.startsWith("region:")).map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-5">
                  <Calendar className="w-3.5 h-3.5" />
                  Updated {enriched.updatedAt && isValid(new Date(enriched.updatedAt))
                    ? format(new Date(enriched.updatedAt), "MMMM d, yyyy")
                    : "Unknown"}
                </div>
              </CardContent>
            </Card>

            {/* Tags from HuggingFace */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(`https://huggingface.co/${enriched.modelId}`, "_blank", "noopener,noreferrer")}>
                <a href={`https://huggingface.co/${enriched.modelId}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View on HuggingFace
                </a>
              </Button>
            </div>
          </div>

          {/* RIGHT: Actions (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Download Commands */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Quick Download
                </CardTitle>
                <CardDescription>Run these commands in your terminal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg group">
                  <code className="flex-1 text-xs font-mono break-all">{downloadCmdOllama}</code>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => handleCopy(downloadCmdOllama)}>
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <code className="flex-1 text-xs font-mono break-all">{downloadCmdHG}</code>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => handleCopy(downloadCmdHG)}>
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  AI Recommendation
                </CardTitle>
                <CardDescription>Get personalized advice based on your hardware</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!openrouterApiKey ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Enter your OpenRouter API key to generate AI-powered recommendations. Your key is stored locally only.</p>
                    <input
                      type="password"
                      placeholder="sk-or-v1-..."
                      className="flex-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Key stored in browser localStorage. Never sent to our servers.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button onClick={handleAISummary} disabled={aiLoading} className="gap-2 w-full">
                      <Sparkles className="w-4 h-4" />
                      {aiLoading ? "Analyzing..." : "Generate Recommendation"}
                    </Button>
                    {aiSummary && (
                      <div className="p-4 bg-muted/50 rounded-lg text-sm leading-relaxed whitespace-pre-wrap border">
                        {aiSummary}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
