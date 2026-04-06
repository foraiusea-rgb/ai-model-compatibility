import { NextRequest, NextResponse } from "next/server";
import { searchHFModels, hfToInternal } from "@/lib/hf-api";
import { MOCK_MODELS } from "@/lib/mock-data";

/**
 * GET /api/models
 *
 * Proxies HF Hub API requests with auth and caching.
 * Falls back to mock data if HF API fails (rate limit, network, etc).
 *
 * Query params:
 * - q: search query (empty = top by downloads, which is what you want)
 * - limit: items per page (default 40, max 100)
 * - offset: pagination offset
 * - sort: downloads | likes | lastModified | createdAt | trending
 * - direction: 1 (asc) | -1 (desc)
 * - pipeline_tag: filter by task type
 * - author: filter by author
 * - format: gguf | safetensors | pytorch
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // q is only set if the user actually typed something — empty means "top models"
    const q = searchParams.get("q") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "40"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const sort = (searchParams.get("sort") as any) || "downloads";
    const direction = searchParams.get("direction") === "1" ? 1 : -1;
    const pipeline_tag = searchParams.get("pipeline_tag") || undefined;
    const author = searchParams.get("author") || undefined;

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

    const models = result.models.map((m) => hfToInternal(m));

    // Client-side size/param filtering (HF API doesn't support natively)
    let filtered = models;
    const sizeMin = parseFloat(searchParams.get("sizeMin") || "0");
    const sizeMax = parseFloat(searchParams.get("sizeMax") || "1000000");
    const paramMin = parseFloat(searchParams.get("paramMin") || "0");
    const paramMax = parseFloat(searchParams.get("paramMax") || "1000000");

    if (sizeMin > 0) {
      filtered = filtered.filter((m) => m.estimatedSizeGB == null || m.estimatedSizeGB >= sizeMin);
    }
    if (sizeMax < 1000000) {
      filtered = filtered.filter((m) => m.estimatedSizeGB == null || m.estimatedSizeGB <= sizeMax);
    }
    if (paramMin > 0) {
      filtered = filtered.filter((m) => m.paramCount == null || m.paramCount >= paramMin);
    }
    if (paramMax < 1000000) {
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
    console.error("[API] HF fetch failed, returning mock data:", error.message);
    // Fall back to mock data so the dashboard always shows something
    return NextResponse.json({
      models: MOCK_MODELS,
      total: MOCK_MODELS.length,
      hasMore: false,
      page: 1,
      limit: MOCK_MODELS.length,
      offset: 0,
      fallback: true,
    });
  }
}
