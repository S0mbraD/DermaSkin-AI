import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CourseConfig } from '@/types';
import { ALL_COURSES } from '@/data';

interface CourseStoreState {
  activeCourseId: string;
  setActiveCourse: (id: string) => void;
  getActiveCourse: () => CourseConfig;
  getCourseById: (id: string) => CourseConfig | undefined;
}

export const useCourseStore = create<CourseStoreState>()(
  persist(
    (set, get) => ({
      activeCourseId: ALL_COURSES[0]?.id ?? 'derma_fungal',
      setActiveCourse: (id: string) => set({ activeCourseId: id }),
      getActiveCourse: (): CourseConfig => {
        const id = get().activeCourseId;
        return ALL_COURSES.find(c => c.id === id) ?? ALL_COURSES[0];
      },
      getCourseById: (id: string) => ALL_COURSES.find(c => c.id === id),
    }),
    { name: 'dermaskin_course' }
  )
);
