import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DashboardState, HistoryState } from './types';

const initialState: HistoryState = {
  past: [],
  future: [],
  log: [],
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    pushState(state, action: PayloadAction<{ dashboardState: DashboardState; label: string }>) {
      state.past.push(action.payload.dashboardState);
      if (state.past.length > 50) state.past.shift();
      state.future = [];
      state.log.push({ label: action.payload.label, timestamp: Date.now() });
      if (state.log.length > 100) state.log.shift();
    },
    undo() { },
    redo() { },
    applyUndo(state, action: PayloadAction<DashboardState>) {
      state.past.pop();
      state.future.push(action.payload);
    },
    applyRedo(state, action: PayloadAction<DashboardState>) {
      state.future.pop();
      state.past.push(action.payload);
    },
  },
});

export const historyActions = historySlice.actions;
export const historyReducer = historySlice.reducer;
