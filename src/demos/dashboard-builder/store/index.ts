import { configureStore } from '@reduxjs/toolkit';
import { dashboardReducer } from './dashboardSlice';
import { historyReducer } from './historySlice';
import { undoRedoMiddleware } from './middleware';

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    history: historyReducer,
  },
  middleware: (getDefault) =>
    getDefault({ serializableCheck: false }).concat(undoRedoMiddleware),
});

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { dashboardActions } from './dashboardSlice';
export { historyActions } from './historySlice';
export type { Widget, WidgetType, RootState } from './types';
export { WIDGET_TEMPLATES } from './types';
