import { NextRequest, NextResponse } from "next/server";
import { searchHFModels, hfToInternal } from "@/lib/hf-api";

/**
 * GET /api/models
 * 
 * Proxies HF Hub API requests with proper auth and rate limiting.
 * Returns paginated model list with compatibility scoring support.
 * 
 * Query params:
 * - q: search query
 * - limit: items per page (default 20)
 * - offset: page offset
 * - sort: downloads | likes | lastModified | createdAt | trending
 * - direction: 1 (asc) | -1 (desc)
 * - pipeline_tag: filter by task type
 * - author: filter by author
 * - format: gguf | safetensors | pytorch
 * - sizeMin / sizeMax: estimated size range in GB
 * - paramMin / paramMax: parameter count range in billions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const sort = (searchParams.get("sort") as any) || "downloads";
    const direction = searchParams.get("direction") === "1" ? 1 : -1;
    const pipeline_tag = searchParams.get("pipeline_tag") || undefined;
    const author = searchParams.get("author") || undefined;

    // Validate sort
    const validSorts = ["downloads", "likes", "lastModified", "createdAt", "trending"];
    const hfSort = validSorts.includes(sort) ? sort : "downloads";

    const result = await searchHFModels({
      limit,
      offset,
      search: q,
      sort: hfSort as any,
      direction: direction as -1 | 1,
      pipeline_tag,
      author,
    });

    // Convert HF responses to our internal format
    const models = result.models.map((m) => hfToInternal(m));

    // Client-side filtering for size and params (HF API doesn't support these natively)
    let filtered = models;
    const sizeMin = parseFloat(searchParams.get("sizeMin") || "0");
    const sizeMax = parseFloat(searchParams.get("sizeMax") || "1000000");
    const paramMin = parseFloat(searchParams.get("paramMin") || "0");
    const paramMax = parseFloat(searchParams.get("paramMax") || "1000000");

    if (!isNaN(sizeMin)) {
      filtered = filtered.filter((m) => m.estimatedSizeGB == null || m.estimatedSizeGB >= sizeMin);
    }
    if (!isNaN(sizeMax)) {
      filtered = filtered.filter((m) => m.estimatedSizeGB == null || m.estimatedSizeGB <= sizeMax);
    }
    if (!isNaN(paramMin)) {
      filtered = filtered.filter((m) => m.paramCount == null || m.paramCount >= paramMin);
    }
    if (!isNaN(paramMax)) {
      filtered = filtered.filter((m) => m.paramCount == null || m.paramCount <= paramMax);
    }

    // Format filter
    const format = searchParams.get("format");
    if (format) {
      filtered = filtered.filter((m) => {
        if (format === "gguf") return m.siblings?.some((s: any) => s.rfilename.toLowerCase().includes(".gguf"));
        if (format === "safetensors") return m.format === "safetensors";
        return true;
      });
    }

    return NextResponse.json({
      models: filtered,
      total: result.total,
      hasMore: result.hasMore,
      page: Math.floor(offset / limit) + 1,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[API] Error fetching HF models:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch models", fallback: true },
      { status: 500 }
    );
  }
}
