/**
 * Storage abstraction for app state.
 * Swap this implementation for an API client when migrating to a backend.
 * The store only persists this subset; UI state (selections, modals) lives in memory.
 */

import type { AppState } from '@/types';

const STORAGE_KEY = 'expmanager-state';

export interface DataStore {
  getState(): Promise<AppState | null>;
  saveState(state: AppState): Promise<void>;
}

export const localStorageStore: DataStore = {
  async getState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  async saveState(state: AppState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
};
