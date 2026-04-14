import type { Middleware } from '@reduxjs/toolkit';
import type { RootState } from './types';
import { dashboardActions } from './dashboardSlice';
import { historyActions } from './historySlice';

const ACTION_LABELS: Record<string, string | ((a: any) => string)> = {
  'dashboard/addWidget': (a: any) => `Add widget: ${a.payload?.type}`,
  'dashboard/commitMove': 'Move widget',
  'dashboard/commitResize': 'Resize widget',
  'dashboard/deleteSelected': 'Delete selected',
  'dashboard/deleteWidget': 'Delete widget',
  'dashboard/bringToFront': 'Bring to front',
  'dashboard/sendToBack': 'Send to back',
  'dashboard/loadPreset': 'Load preset',
  'dashboard/clearAll': 'Clear all',
  'dashboard/updateWidgetConfig': 'Update config',
};

const UNDOABLE_ACTIONS = new Set(Object.keys(ACTION_LABELS));

export const undoRedoMiddleware: Middleware<{}, RootState> =
  (storeApi) => (next) => (action: any) => {
    const type = action?.type as string;

    if (type === 'history/undo') {
      const { history, dashboard } = storeApi.getState();
      if (history.past.length === 0) return;
      const prev = history.past[history.past.length - 1];
      next(action);
      storeApi.dispatch(dashboardActions.loadPreset(prev.widgets));
      storeApi.dispatch(historyActions.applyUndo(storeApi.getState().dashboard));
      return;
    }

    if (type === 'history/redo') {
      const { history } = storeApi.getState();
      if (history.future.length === 0) return;
      const next_ = history.future[history.future.length - 1];
      next(action);
      storeApi.dispatch(dashboardActions.loadPreset(next_.widgets));
      storeApi.dispatch(historyActions.applyRedo(storeApi.getState().dashboard));
      return;
    }

    if (UNDOABLE_ACTIONS.has(type)) {
      const current = storeApi.getState().dashboard;
      const labelDef = ACTION_LABELS[type];
      const label = typeof labelDef === 'function' ? labelDef(action) : (labelDef ?? type);
      storeApi.dispatch(historyActions.pushState({
        dashboardState: JSON.parse(JSON.stringify(current)),
        label,
      }));
    }

    return next(action);
  };
