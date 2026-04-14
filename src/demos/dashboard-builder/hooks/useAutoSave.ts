import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { AppState } from '../store';

const STORAGE_KEY = 'dashboard-builder-autosave';

/** Auto-save dashboard to localStorage on every change */
export function useAutoSave() {
  const widgets = useSelector((s: AppState) => s.dashboard.widgets);

  useEffect(() => {
    if (widgets.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    }
  }, [widgets]);
}

/** Load saved dashboard from localStorage */
export function loadSavedDashboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

/** Clear saved dashboard */
export function clearSavedDashboard() {
  localStorage.removeItem(STORAGE_KEY);
}
