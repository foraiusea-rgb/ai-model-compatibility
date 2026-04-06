/**
 * HuggingFace Hub API Client
 *
 * Handles all communication with the HF Models API.
 * Uses HF_TOKEN for authentication to get higher rate limits and full metadata.
 *
 * API docs: https://huggingface.co/docs/hub/api
 */

const HF_API_BASE = process.env.HF_API_BASE || "https://huggingface.co/api";
const HF_TOKEN = process.env.HF_TOKEN;

// Types matching HF API responses
export interface HFModelResponse {
  _id: string;
  id: string;
  author: string;
  sha: string;
  lastModified: string;
  private: boolean;
  disabled: boolean;
  gated: false | "auto" | "manual";
  pipeline_tag: string | null;
  tags: string[];
  downloads: number;
  likes: number;
  cardData?: {
    language?: string[];
    license?: string | string[];
    library_name?: string;
    base_model?: string;
    datasets?: string[];
    metrics?: string[];
    mask_token?: string;
    widget?: any[];
    modelIndex?: any[];
    co2_eq?: {
      emissions: number | { emissions: number };
    };
  };
  safetensors?: {
    parameters: Record<string, number>;
    total: number;
  };
  transformersInfo?: {
    auto_model: string;
    class: string;
  };
  siblings?: Array<{
    rfilename: string;
    size?: number;
  }>;
  config?: {
    architectures?: string[];
    modelType?: string;
  };
}

export interface HFSearchParams {
  limit?: number;
  offset?: number;
  search?: string;
  sort?: "downloads" | "likes" | "lastModified" | "createdAt" | "trending";
  direction?: -1 | 1;
  filter?: string[];
  author?: string;
  gated?: boolean;
  pipeline_tag?: string;
  library?: string;
  tags?: string[];
}

export interface HFSearchResult {
  models: HFModelResponse[];
  total: number;
  hasMore: boolean;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (HF_TOKEN) {
    headers["Authorization"] = "Bearer " + HF_TOKEN;
  }
  return headers;
}

export async function searchHFModels(params: HFSearchParams = {}): Promise<HFSearchResult> {
  const {
    limit = 20,
    offset = 0,
    search,
    sort = "downloads",
    direction = -1,
    filter,
    author,
    gated,
    pipeline_tag,
    library,
    tags,
  } = params;

  const url = new URL(HF_API_BASE + "/models");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("sort", sort);
  url.searchParams.set("direction", String(direction));

  // Only set search if caller actually passed a non-empty query
  if (search && search.trim()) url.searchParams.set("search", search.trim());
  if (author) url.searchParams.set("author", author);
  if (pipeline_tag) url.searchParams.set("pipeline_tag", pipeline_tag);
  if (library) url.searchParams.set("library", library);
  if (gated !== undefined) url.searchParams.set("gated", String(gated));

  if (filter && filter.length > 0) {
    filter.forEach((f) => url.searchParams.append("filter", f));
  }
  if (tags && tags.length > 0) {
    tags.forEach((t) => url.searchParams.append("tags", t));
  }

  const response = await fetch(url.toString(), {
    headers: getHeaders(),
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error("HF API error: " + response.status + " " + response.statusText);
  }

  const models: HFModelResponse[] = await response.json();

  // x-total-count may be absent for unauth requests — fall back to array length
  const totalHeader = response.headers.get("x-total-count");
  const total = totalHeader ? parseInt(totalHeader, 10) : models.length;

  return {
    models,
    total: total || models.length,
    hasMore: models.length === limit,
  };
}

export async function getHFModel(modelId: string): Promise<HFModelResponse | null> {
  const encodedId = encodeURIComponent(modelId);
  const url = HF_API_BASE + "/models/" + encodedId;

  const response = await fetch(url, {
    headers: getHeaders(),
    next: { revalidate: 3600 },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("HF API error: " + response.status + " " + response.statusText);
  }

  return response.json();
}

export async function getHFModelCount(): Promise<number> {
  const response = await fetch(HF_API_BASE + "/models?limit=1", {
    headers: getHeaders(),
    method: "HEAD",
  });

  const total = response.headers.get("x-total-count");
  return total ? parseInt(total, 10) : 0;
}

export function extractParamCount(model: HFModelResponse): number | null {
  // 1. Best source: safetensors metadata
  if (model.safetensors && model.safetensors.total) {
    return Math.round((model.safetensors.total / 1e9) * 100) / 100;
  }

  // 2. Parse from model ID (e.g. "Llama-3.1-8B" → 8, "phi-3.5-mini" won't false-match)
  const id = model.id.toLowerCase();
  const match = id.match(/(\d+\.?\d*)\s*[bm](?:[^a-z]|$)/i);
  if (match) {
    const num = parseFloat(match[1]);
    const suffix = match[0].replace(/[\d.\s]/g, "")[0].toLowerCase();
    if (suffix === "b") return num;
    if (suffix === "m") return num / 1000;
  }

  return null;
}

export function extractModelSize(model: HFModelResponse) {
  if (!model.siblings || model.siblings.length === 0) return null;

  const totalBytes = model.siblings.reduce((sum, s) => sum + (s.size || 0), 0);
  if (totalBytes === 0) return null;

  return {
    totalGB: Math.round((totalBytes / (1024 * 1024 * 1024)) * 100) / 100,
    files: model.siblings.length,
  };
}

/**
 * Estimate model size in GB from param count when file size data is unavailable.
 * Assumes Q4_K_M quantization (~4.5 bits/param → ~0.56 bytes/param) plus 5% overhead.
 */
function estimateSizeFromParams(paramCountB: number | null): number | null {
  if (!paramCountB || paramCountB <= 0) return null;
  return Math.round(paramCountB * 0.59 * 100) / 100;
}

export function hfToInternal(hfModel: HFModelResponse) {
  const paramCount = extractParamCount(hfModel);
  const sizeInfo = extractModelSize(hfModel);

  const cardData = hfModel.cardData;
  const license = cardData && Array.isArray(cardData.license)
    ? (cardData.license as string[]).join(", ")
    : (cardData && cardData.license) || null;

  // Use file-based size when available, otherwise estimate from param count
  const estimatedSizeGB = sizeInfo
    ? sizeInfo.totalGB
    : estimateSizeFromParams(paramCount);

  return {
    modelId: hfModel.id,
    author: hfModel.author || hfModel.id.split("/")[0] || "unknown",
    name: hfModel.id.split("/").pop() || hfModel.id,
    pipeline_tag: hfModel.pipeline_tag,
    taskId: hfModel.pipeline_tag,
    libraryName: (hfModel.cardData && hfModel.cardData.library_name) || null,
    tags: hfModel.tags || [],
    downloads: hfModel.downloads || 0,
    likes: hfModel.likes || 0,
    createdAt: hfModel.lastModified || new Date().toISOString(),
    updatedAt: hfModel.lastModified || new Date().toISOString(),
    paramCount,
    estimatedSizeGB,
    quantization: null,
    format: hfModel.safetensors ? "safetensors" : (hfModel.cardData && hfModel.cardData.library_name) || null,
    contextLength: null,
    license,
    trendingScore: Math.round(Math.log((hfModel.downloads || 0) + 1) * 10),
    siblings: hfModel.siblings || [],
  };
}
