export type CompatibilityRating = "smooth" | "slow" | "heavy" | "unknown";

export interface HardwareSpecs {
  ramGB: number;
  vramGB: number | null; // null = CPU-only
  cpuCores: number;
  diskFreeGB: number;
  inference: "ollama" | "llama-cpp" | "vllm" | "transformers";
}

export interface HFModel {
  modelId: string;
  author: string;
  name: string;
  taskId: string | null;
  pipeline_tag: string | null;
  libraryName: string | null;
  tags: string[];
  downloads: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
  // Computed/synced fields
  paramCount: number | null; // in billions
  estimatedSizeGB: number | null;
  quantization: string | null;
  format: string | null;
  contextLength: number | null;
  license: string | null;
  trendingScore: number;
}

export interface ModelVariant {
  modelId: string;
  quantization: string;
  estimatedSizeGB: number;
  format: string;
  downloadCount: number;
}

export interface ModelCard extends HFModel {
  compatibility: CompatibilityRating;
  compatibilityScore: number; // 0-100
  matchReason: string;
}

export interface Bookmark {
  modelId: string;
  addedAt: string;
  notes?: string;
}

export interface UserPreferences {
  specs: HardwareSpecs | null;
  bookmarks: Bookmark[];
  openrouterApiKey: string;
  openrouterModel: string;
  theme: "dark" | "light" | "system";
  lastSyncDate: string | null;
  filterPresets: Record<string, unknown>;
}

export interface Filters {
  compatibility: CompatibilityRating[];
  tasks: string[];
  formats: string[];
  licenses: string[];
  sizeMinGB: number | null;
  sizeMaxGB: number | null;
  paramMinB: number | null;
  paramMaxB: number | null;
  searchQuery: string;
  sortBy: "score" | "downloads" | "trending" | "updated" | "name";
  sortDir: "asc" | "desc";
}

export const DEFAULT_FILTERS: Filters = {
  compatibility: [],
  tasks: [],
  formats: [],
  licenses: [],
  sizeMinGB: null,
  sizeMaxGB: null,
  paramMinB: null,
  paramMaxB: null,
  searchQuery: "",
  sortBy: "score",
  sortDir: "desc",
};

export const DEFAULT_SPECS: HardwareSpecs = {
  ramGB: 16,
  vramGB: null,
  cpuCores: 8,
  diskFreeGB: 100,
  inference: "ollama",
};
