/**
 * HuggingFace Hub API Client
 * 
 * Handles all communication with the HF Models API.
 * Uses HF_TOKEN for authentication to get higher rate limits.
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
    model-index?: any[];
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
    model_type?: string;
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
    headers["Authorization"] = `Bearer ${HF_TOKEN}`;
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

  const url = new URL(`${HF_API_BASE}/models`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("sort", sort);
  url.searchParams.set("direction", String(direction));

  if (search) url.searchParams.set("search", search);
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
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`HF API error: ${response.status} ${response.statusText}`);
  }

  // The HF API returns total count in the Link header or as a header
  const totalHeader = response.headers.get("x-total-count") || "0";
  const total = parseInt(totalHeader, 10) || 0;

  // If x-total-count is not available, estimate based on offset + returned
  const models: HFModelResponse[] = await response.json();

  return {
    models,
    total,
    hasMore: models.length === limit,
  };
}

export async function getHFModel(modelId: string): Promise<HFModelResponse | null> {
  const encodedId = encodeURIComponent(modelId);
  const url = `${HF_API_BASE}/models/${encodedId}`;

  const response = await fetch(url, {
    headers: getHeaders(),
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`HF API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getHFModelCount(): Promise<number> {
  // Fetch just 1 model to get the total count from header
  const response = await fetch(`${HF_API_BASE}/models?limit=1`, {
    headers: getHeaders(),
    method: "HEAD",
  });

  const total = response.headers.get("x-total-count");
  return total ? parseInt(total, 10) : 0;
}

/**
 * Extract estimated parameter count from HF model response.
 * Returns value in billions (e.g., 7.2 for 7.2B params).
 */
export function extractParamCount(model: HFModelResponse): number | null {
  // From safetensors metadata
  if (model.safetensors?.total) {
    return Math.round((model.safetensors.total / 1e9) * 100) / 100;
  }

  // From card data if available
  if (model.cardData) {
    // No direct param count in card data
  }

  // From model ID naming conventions
  const id = model.id.toLowerCase();
  const match = id.match(/(\d+\.?\d*)[bm]/);
  if (match) {
    const num = parseFloat(match[1]);
    const suffix = match[0].slice(-1).toLowerCase();
    if (suffix === "b") return num;
    if (suffix === "m") return num / 1000;
  }

  return null;
}

/**
 * Extract estimated file size from model siblings.
 */
export function extractModelSize(model: HFModelResponse): { totalGB: number; files: number } | null {
  if (!model.siblings || model.siblings.length === 0) return null;

  const totalBytes = model.siblings.reduce((sum, s) => sum + (s.size || 0), 0);
  if (totalBytes === 0) return null;

  return {
    totalGB: Math.round((totalBytes / (1024 * 1024 * 1024)) * 100) / 100,
    files: model.siblings.length,
  };
}

/**
 * Convert HF API response to our internal model format.
 */
export function hfToInternal(hfModel: HFModelResponse) {
  const paramCount = extractParamCount(hfModel);
  const sizeInfo = extractModelSize(hfModel);
  
  const license = Array.isArray(hfModel.cardData?.license)
    ? hfModel.cardData.license.join(", ")
    : hfModel.cardData?.license || null;

  return {
    modelId: hfModel.id,
    author: hfModel.author,
    name: hfModel.id.split("/").pop() || hfModel.id,
    pipeline_tag: hfModel.pipeline_tag,
    taskId: hfModel.pipeline_tag,
    libraryName: hfModel.cardData?.library_name || null,
    tags: hfModel.tags || [],
    downloads: hfModel.downloads,
    likes: hfModel.likes,
    createdAt: hfModel.lastModified, // HF API only gives lastModified for free
    updatedAt: hfModel.lastModified,
    paramCount,
    estimatedSizeGB: sizeInfo?.totalGB,
    quantization: null,
    format: hfModel.safetensors ? "safetensors" : hfModel.cardData?.library_name || null,
    contextLength: null,
    license,
    trendingScore: Math.round(Math.log(hfModel.downloads + 1) * 10),
    siblings: hfModel.siblings || [],
  };
}
