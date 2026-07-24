import { create } from "zustand";
import { persist, createJSONStorage, subscribeWithSelector } from "zustand/middleware";
import { share } from "shared-zustand";

// Raw storage adapter that catches quota-exceeded errors instead of crashing.
// This is passed to createJSONStorage() which handles JSON serialization.
const safeRawStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      // Quota exceeded — try to free space by trimming old project dictionaries
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        console.warn('[ProjectStore] localStorage quota exceeded — trimming archived dictionaries to free space.');
        try {
          const parsed = JSON.parse(value);
          const projects = parsed?.state?.localProjects;
          if (Array.isArray(projects) && projects.length > 3) {
            // Sort by updated_at descending, keep full data for 3 most recent,
            // strip dictionaries from the rest (metadata stays for the project list)
            const sorted = [...projects].sort(
              (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
            );
            sorted.forEach((p, i) => {
              if (i >= 3 && p.project_data?.dictionary) {
                p.project_data.dictionary = [];
              }
            });
            parsed.state.localProjects = sorted;
          }
          localStorage.setItem(name, JSON.stringify(parsed));
        } catch {
          // If even the trimmed version doesn't fit, silently give up.
          // The in-memory state is still correct; just persistence is lost for this write.
          console.warn('[ProjectStore] Could not persist project archive — localStorage is full. Consider deleting unused conlangs.');
        }
      }
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // noop
    }
  },
};

export const useProjectStore = create(
  subscribeWithSelector(
    persist(
      (set) => ({
        localProjects: [],
        globalWorldMap: { image: '/classic_map.svg' },

        setGlobalWorldMap: (mapObj) => set({ globalWorldMap: mapObj }),

        // Backs up the active workspace data into the archive box
        saveProjectToArchive: (config, lexicon) =>
          set((state) => {
            const projectId = config.projectId;
            if (!projectId) return state;

            const safeConfig = JSON.parse(JSON.stringify({
              ...config,
              customFontBase64: undefined,
              customFont: undefined,
              syllabaryMap: undefined,
              customGlyphs: undefined,
              isRehydrating: undefined
            }));
            const safeLexicon = JSON.parse(JSON.stringify(lexicon));
            const projectData = { config: safeConfig, dictionary: safeLexicon };
            const existingIdx = state.localProjects.findIndex(
              (p) => p.id === projectId,
            );

            if (existingIdx > -1) {
              const updated = [...state.localProjects];
              updated[existingIdx] = {
                ...updated[existingIdx],
                project_data: projectData,
                updated_at: new Date().toISOString(),
              };
              return { localProjects: updated };
            } else {
              return {
                localProjects: [
                  {
                    id: projectId,
                    project_data: projectData,
                    updated_at: new Date().toISOString(),
                  },
                  ...state.localProjects,
                ],
              };
            }
          }),

        deleteLocalProject: (id) =>
          set((state) => ({
            localProjects: state.localProjects.filter((p) => p.id !== id),
          })),
      }),
      { name: "conlang-projects", storage: createJSONStorage(() => safeRawStorage) },
    ),
  ),
);

// Cross-tab sync via BroadcastChannel
// Shares project archive list between browser tabs on same device
if (typeof BroadcastChannel !== "undefined") {
  share("localProjects", useProjectStore, { ref: "localProjects" });
}

