import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useProjectStore = create(
    persist(
        (set) => ({
            localProjects: [],
            
            // Backs up the active workspace data into the archive box
            saveProjectToArchive: (config, lexicon) => set((state) => {
                const projectId = config.projectId;
                if (!projectId) return state;

                const projectData = { config, dictionary: lexicon };
                const existingIdx = state.localProjects.findIndex(p => p.id === projectId);
                
                if (existingIdx > -1) {
                    const updated = [...state.localProjects];
                    updated[existingIdx] = { 
                        ...updated[existingIdx], 
                        project_data: projectData, 
                        updated_at: new Date().toISOString() 
                    };
                    return { localProjects: updated };
                } else {
                    return {
                        localProjects: [
                            { id: projectId, project_data: projectData, updated_at: new Date().toISOString() },
                            ...state.localProjects
                        ]
                    };
                }
            }),

            deleteLocalProject: (id) => set((state) => ({
                localProjects: state.localProjects.filter(p => p.id !== id)
            }))
        }),
        { name: 'conlang-projects' }
    )
);