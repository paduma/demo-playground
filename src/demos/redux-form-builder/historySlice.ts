import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FormState, HistoryState } from './types';

const initialState: HistoryState = {
  past: [],
  future: [],
  log: [],
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    pushState(state, action: PayloadAction<{ formState: FormState; label: string }>) {
      state.past.push(action.payload.formState);
      if (state.past.length > 50) state.past.shift();
      state.future = [];
      state.log.push({ label: action.payload.label, timestamp: Date.now() });
      if (state.log.length > 100) state.log.shift();
    },
    undo() { },
    redo() { },
    applyUndo(state, action: PayloadAction<FormState>) {
      const popped = state.past.pop();
      if (popped) state.future.push(action.payload);
    },
    applyRedo(state, action: PayloadAction<FormState>) {
      const popped = state.future.pop();
      if (popped) state.past.push(action.payload);
    },
  },
});

export const historyActions = historySlice.actions;
export const historyReducer = historySlice.reducer;
