import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { share } from "shared-zustand";

export const useProjectStore = create(
  subscribeWithSelector(
    persist(
      (set) => ({
        localProjects: [],

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
      { name: "conlang-projects" },
    ),
  ),
);

// Cross-tab sync via BroadcastChannel
// Shares project archive list between browser tabs on same device
if (typeof BroadcastChannel !== "undefined") {
  share("localProjects", useProjectStore, { ref: "localProjects" });
}
