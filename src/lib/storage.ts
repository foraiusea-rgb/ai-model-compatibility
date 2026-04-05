import localforage from "localforage";
import { UserPreferences, DEFAULT_SPECS } from "@/types/model";

const STORAGE_KEY = "hf-compat-prefs";

let store: typeof localforage;

function getStore() {
  if (!store) {
    store = localforage.createInstance({
      name: "hf-model-compatibility",
      storeName: "preferences",
    });
  }
  return store;
}

export async function loadPreferences(): Promise<UserPreferences> {
  try {
    const data = await getStore().getItem<UserPreferences>(STORAGE_KEY);
    if (!data) {
      return {
        specs: DEFAULT_SPECS,
        bookmarks: [],
        openrouterApiKey: "",
        openrouterModel: "qwen/qwen3.6-plus:free",
        theme: "system",
        lastSyncDate: null,
        filterPresets: {},
      };
    }
    return {
      specs: data.specs || DEFAULT_SPECS,
      bookmarks: data.bookmarks || [],
      openrouterApiKey: data.openrouterApiKey || "",
      openrouterModel: data.openrouterModel || "qwen/qwen3.6-plus:free",
      theme: data.theme || "system",
      lastSyncDate: data.lastSyncDate || null,
      filterPresets: data.filterPresets || {},
    };
  } catch {
    return {
      specs: DEFAULT_SPECS,
      bookmarks: [],
      openrouterApiKey: "",
      openrouterModel: "qwen/qwen3.6-plus:free",
      theme: "system",
      lastSyncDate: null,
      filterPresets: {},
    };
  }
}

export async function savePreferences(prefs: Partial<UserPreferences>) {
  const current = await loadPreferences();
  const merged = { ...current, ...prefs };
  await getStore().setItem(STORAGE_KEY, merged);
  return merged;
}

export async function clearPreferences() {
  await getStore().removeItem(STORAGE_KEY);
}

export async function exportPreferences(): Promise<string> {
  const prefs = await loadPreferences();
  return JSON.stringify(prefs, null, 2);
}

export async function importPreferences(jsonString: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.specs && !parsed.bookmarks) return false;
    await savePreferences(parsed);
    return true;
  } catch {
    return false;
  }
}
