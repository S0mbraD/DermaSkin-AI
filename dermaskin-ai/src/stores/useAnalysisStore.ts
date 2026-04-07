import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  isElectron,
  dbGetAnalyses,
  dbSaveAnalysis,
  dbDeleteAnalysis,
  type DBAnalysis,
} from '@/services/dbService';

interface AnalysisStoreState {
  analyses: DBAnalysis[];
  loading: boolean;

  /** Fetch all analyses (from SQLite in Electron, from persisted state in browser) */
  fetchAnalyses: (courseId?: string) => Promise<void>;

  /** Save a new analysis result */
  saveAnalysis: (analysis: DBAnalysis) => Promise<void>;

  /** Delete an analysis by ID */
  removeAnalysis: (id: string) => Promise<void>;
}

export const useAnalysisStore = create<AnalysisStoreState>()(
  persist(
    (set, get) => ({
      analyses: [],
      loading: false,

      fetchAnalyses: async (courseId?: string) => {
        if (isElectron()) {
          set({ loading: true });
          try {
            const data = await dbGetAnalyses(courseId);
            set({ analyses: data, loading: false });
          } catch (err) {
            console.error('[AnalysisStore] fetch failed:', err);
            set({ loading: false });
          }
        }
      },

      saveAnalysis: async (analysis: DBAnalysis) => {
        if (isElectron()) {
          await dbSaveAnalysis(analysis);
        }
        set((s) => {
          const idx = s.analyses.findIndex((a) => a.id === analysis.id);
          const next = [...s.analyses];
          if (idx >= 0) next[idx] = analysis;
          else next.unshift(analysis);
          return { analyses: next };
        });
      },

      removeAnalysis: async (id: string) => {
        if (isElectron()) {
          await dbDeleteAnalysis(id);
        }
        set((s) => ({
          analyses: s.analyses.filter((a) => a.id !== id),
        }));
      },
    }),
    {
      name: 'dermaskin_analyses',
      partialize: (state) =>
        isElectron() ? {} : { analyses: state.analyses },
    },
  ),
);
