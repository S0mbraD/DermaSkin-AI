import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  visionModel: string;
  audioModel: string;
  maxTokens: number;
  temperature: number;
  concurrency: number;
  frameInterval: number;   // seconds between extracted frames
  maxFrames: number;       // max frames to send to VL model
  enableTranscription: boolean;
}

export interface AppSettings {
  ai: AIConfig;
  theme: {
    primaryColor: string;
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    showAnimations: boolean;
  };
  notifications: {
    analysisDone: boolean;
    riskAlert: boolean;
    alertThreshold: number;
    soundEnabled: boolean;
  };
}

interface SettingsStoreState {
  settings: AppSettings;
  updateAI: (patch: Partial<AIConfig>) => void;
  updateTheme: (patch: Partial<AppSettings['theme']>) => void;
  updateNotifications: (patch: Partial<AppSettings['notifications']>) => void;
  resetAll: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    apiKey: '',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    visionModel: 'qwen-vl-max-latest',
    audioModel: 'qwen-audio-turbo-latest',
    maxTokens: 4096,
    temperature: 0.3,
    concurrency: 1,
    frameInterval: 10,
    maxFrames: 20,
    enableTranscription: true,
  },
  theme: {
    primaryColor: '#4361EE',
    fontSize: 'medium',
    compactMode: false,
    showAnimations: true,
  },
  notifications: {
    analysisDone: true,
    riskAlert: true,
    alertThreshold: 50,
    soundEnabled: false,
  },
};

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_SETTINGS },
      updateAI: (patch) =>
        set((s) => ({
          settings: { ...s.settings, ai: { ...s.settings.ai, ...patch } },
        })),
      updateTheme: (patch) =>
        set((s) => ({
          settings: { ...s.settings, theme: { ...s.settings.theme, ...patch } },
        })),
      updateNotifications: (patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            notifications: { ...s.settings.notifications, ...patch },
          },
        })),
      resetAll: () => set({ settings: { ...DEFAULT_SETTINGS } }),
    }),
    { name: 'dermaskin_settings' },
  ),
);
