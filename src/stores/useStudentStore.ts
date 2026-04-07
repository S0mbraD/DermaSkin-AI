import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Student } from '@/types';
import { STUDENTS } from '@/data';

interface StudentStoreState {
  students: Student[];
  setStudents: (students: Student[]) => void;
  updateStudent: (id: number, patch: Partial<Student>) => void;
  getStudent: (id: number) => Student | undefined;
}

export const useStudentStore = create<StudentStoreState>()(
  persist(
    (set, get) => ({
      students: STUDENTS,
      setStudents: (students) => set({ students }),
      updateStudent: (id, patch) => set({
        students: get().students.map(s => s.id === id ? { ...s, ...patch } : s),
      }),
      getStudent: (id) => get().students.find(s => s.id === id),
    }),
    { name: 'dermaskin_students' }
  )
);
