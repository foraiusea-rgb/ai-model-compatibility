"use client"

import { MOCK_MODELS } from "@/lib/mock-data"
import { computeCompatibility, getCompatibilityColor, getCompatibilityLabel, getCompatibilityIcon } from "@/lib/compatibility"
import { useAppStore } from "@/store/use-app-store"
import type { ModelCard } from "@/types/model"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, Download, Calendar, Cpu, HardDrive, FileText, KeyRound, Sparkles, ArrowLeft, Copy, Check, ExternalLink, MessageSquare } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"

export default function ModelPage() {
  const router = useRouter()
  const params = useParams()
  const modelId = decodeURIComponent(params.id as string)
  const { specs, bookmarks, addBookmark, removeBookmark, openrouterApiKey, setApiKey, openrouterModel } = useAppStore()

  const model = useMemo(() => MOCK_MODELS.find((m) => m.modelId === modelId), [modelId])

  const enriched: ModelCard | null = useMemo(() => {
    if (!model) return null
    if (specs && model.estimatedSizeGB) {
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
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const downloadCmdOllama = `ollama pull ${enriched.name?.toLowerCase().replace(/[^\w]/g, "-") || enriched.modelId}`
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
            { role: "system", content: "You are an AI model compatibility expert. Analyze this model and give a concise recommendation for the user's hardware." },
            { role: "user", content: `Analyze this model: ${enriched.modelId}\nParams: ${enriched.paramCount}B, Size: ${enriched.estimatedSizeGB}GB, Context: ${enriched.contextLength}, License: ${enriched.license}\nUser Hardware: ${specs?.ramGB}GB RAM, ${specs?.vramGB ? specs.vramGB + "GB VRAM" : "CPU only"}, ${specs?.cpuCores} cores\n\nProvide a short recommendation (3-4 sentences) on whether this model runs well, what to optimize, and any caveats.` },
          ],
        }),
      })
      const data = await res.json()
      setAiSummary(data.choices?.[0]?.message?.content || "Failed to generate summary")
    } catch (err) {
      setAiSummary("Error generating summary. Check your API key.")
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-6 gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{enriched.name || enriched.modelId.split("/").pop()}</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isBookmarked) removeBookmark(modelId)
                else addBookmark(modelId)
                setIsBookmarked(!isBookmarked)
              }}
            >
              <Star className={`w-5 h-5 ${isBookmarked ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
            </Button>
          </div>
          <p className="text-muted-foreground">by <span className="font-medium text-foreground">{enriched.author}</span></p>
        </div>

        {enriched.compatibility !== "unknown" && (
          <Badge variant="outline" className={`text-sm font-medium self-start ${getCompatibilityColor(enriched.compatibility)}`}>
            <span className="mr-1">{getCompatibilityIcon(enriched.compatibility)}</span>
            {getCompatibilityLabel(enriched.compatibility)}
          </Badge>
        )}
      </div>

      {/* Match Reason */}
      {enriched.matchReason && (
        <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm">{enriched.matchReason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Model Specs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Parameters", value: enriched.paramCount ? `${enriched.paramCount}B` : "N/A", icon: Cpu },
                { label: "Estimated Size", value: enriched.estimatedSizeGB ? `~${enriched.estimatedSizeGB.toFixed(1)} GB` : "N/A", icon: HardDrive },
                { label: "Context Length", value: enriched.contextLength ? `${(enriched.contextLength / 1024).toFixed(0)}K tokens` : "N/A", icon: FileText },
                { label: "License", value: enriched.license || "N/A", icon: null },
                { label: "Format", value: enriched.format?.toUpperCase() || "N/A", icon: null },
                { label: "Downloads", value: enriched.downloads >= 1000000 ? `${(enriched.downloads / 1000000).toFixed(1)}M` : enriched.downloads >= 1000 ? `${(enriched.downloads / 1000).toFixed(0)}K` : enriched.downloads.toString(), icon: Download },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {label}
                  </div>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {enriched.pipeline_tag && (
                <Badge variant="default" className="text-xs">{enriched.pipeline_tag}</Badge>
              )}
              {enriched.tags.filter(t => !t.startsWith("license:") && !t.startsWith("region:")).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
              <Calendar className="w-3.5 h-3.5" />
              Updated {format(new Date(enriched.updatedAt), "MMMM d, yyyy")}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Download Commands + AI */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Download Commands</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg group">
                <code className="flex-1 text-sm font-mono truncate">{downloadCmdOllama}</code>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleCopy(downloadCmdOllama)}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg group">
                <code className="flex-1 text-sm font-mono truncate">{downloadCmdHG}</code>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleCopy(downloadCmdHG)}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                AI Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!openrouterApiKey ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Paste your OpenRouter API key to generate AI-powered model recommendations.</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="sk-or-..."
                      className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Key is stored in your browser only. Never sent to our servers.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    onClick={handleAISummary}
                    disabled={aiLoading}
                    className="gap-2"
                    size="sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    {aiLoading ? "Generating..." : "Generate Recommendation"}
                  </Button>
                  {aiSummary && (
                    <div className="p-4 bg-muted/50 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
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
  )
}
