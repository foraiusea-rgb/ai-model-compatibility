import { CompatibilityRating, HardwareSpecs } from "@/types/model";

/**
 * Compatibility Scoring Engine
 * 
 * Logic:
 * - Model size in VRAM → fits with headroom = smooth
 * - Model size in RAM (no GPU) → fits with headroom = smooth, tight = slow
 * - Model size exceeds both = heavy
 * - Quantization-aware: Q4_0 ≈ 0.5 bytes/param, FP16 ≈ 2 bytes/param
 */

export function estimateSizeGB(paramCountB: number, quantization: string | null): number {
  // Bits per parameter based on quantization
  const bitsMap: Record<string, number> = {
    "Q2_K": 2.5,
    "Q3_K_M": 3.5,
    "Q3_K_L": 3.8,
    "Q4_0": 4.5,
    "Q4_K_M": 4.5,
    "Q4_K_S": 4.2,
    "Q5_0": 5.5,
    "Q5_K_M": 5.5,
    "Q5_K_S": 5.2,
    "Q6_K": 6.5,
    "Q8_0": 8.5,
    "FP16": 16,
    "BF16": 16,
    "FP32": 32,
  };
  const bits = bitsMap[quantization?.toUpperCase() || ""] || 4.5; // default Q4
  const bytesPerParam = bits / 8;
  const overhead = 1.05; // 5% overhead for KV cache, context
  
  return (paramCountB * 1e9 * bytesPerParam * overhead) / 1e9; // Convert to GB
}

export function computeCompatibility(
  modelSizeGB: number,
  contextLength: number | null,
  specs: HardwareSpecs
): { rating: CompatibilityRating; score: number; reason: string } {
  if (!modelSizeGB || modelSizeGB <= 0) {
    return { rating: "unknown", score: 0, reason: "Size unknown" };
  }

  // Add KV cache overhead (rough estimate: ~100MB per 1K context for 7B model)
  const contextOverheadGB = contextLength ? (contextLength / 1000) * 0.1 * (modelSizeGB / 4) : 0;
  const totalNeededGB = modelSizeGB + Math.min(contextOverheadGB, modelSizeGB * 0.5);
  
  // Cap context overhead at 50% of model size to avoid absurd estimates

  // GPU path
  if (specs.vramGB !== null && specs.vramGB > 0) {
    const headroom = specs.vramGB - totalNeededGB;
    const headroomPct = (headroom / specs.vramGB) * 100;

    if (headroomPct >= 20) {
      return {
        rating: "smooth",
        score: Math.min(100, 70 + headroomPct),
        reason: `Fits in VRAM with ${headroomPct.toFixed(0)}% headroom`,
      };
    } else if (headroom >= 0) {
      return {
        rating: "smooth",
        score: 60 + headroomPct,
        reason: `Fits in VRAM (tight: ${headroomPct.toFixed(0)}% headroom)`,
      };
    } else if (totalNeededGB <= specs.ramGB * 1.1) {
      // Falls back to system RAM with GPU offload, still workable
      return {
        rating: "slow",
        score: 40,
        reason: `Exceeds VRAM by ${Math.abs(headroom).toFixed(1)}GB, will use partial CPU offload`,
      };
    }
  }

  // CPU-only path
  const cpuHeadroom = specs.ramGB - totalNeededGB;
  const cpuHeadroomPct = (cpuHeadroom / specs.ramGB) * 100;

  if (cpuHeadroomPct >= 20) {
    return {
      rating: "smooth",
      score: 50 + cpuHeadroomPct * 0.3,
      reason: `Fits in RAM with ${cpuHeadroomPct.toFixed(0)}% headroom (CPU inference)`,
    };
  } else if (cpuHeadroom >= 0) {
    return {
      rating: "slow",
      score: 35,
      reason: `Fits in RAM but tight (${cpuHeadroomPct.toFixed(0)}% headroom)`,
    };
  } else if (totalNeededGB <= specs.ramGB * 1.5 + (specs.vramGB || 0)) {
    return {
      rating: "slow",
      score: 25,
      reason: `Exceeds RAM, will swap (slow but functional)`,
    };
  }

  return {
    rating: "heavy",
    score: 0,
    reason: `Need ~${totalNeededGB.toFixed(1)}GB, you have ${specs.vramGB !== null ? `${specs.vramGB}GB VRAM + ${specs.ramGB}GB RAM` : `${specs.ramGB}GB RAM`}`,
  };
}

export function getCompatibilityColor(rating: CompatibilityRating): string {
  switch (rating) {
    case "smooth":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "slow":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "heavy":
      return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
    case "unknown":
    default:
      return "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30";
  }
}

export function getCompatibilityLabel(rating: CompatibilityRating): string {
  switch (rating) {
    case "smooth": return "Runs Smoothly";
    case "slow": return "Runs Slow";
    case "heavy": return "Too Heavy";
    case "unknown": return "Size Unknown";
  }
}

export function getCompatibilityIcon(rating: CompatibilityRating): string {
  switch (rating) {
    case "smooth": return "✓";
    case "slow": return "⚠";
    case "heavy": return "✗";
    case "unknown": return "•";
  }
}
