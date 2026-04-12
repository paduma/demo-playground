import { configureStore } from '@reduxjs/toolkit';
import { formReducer } from './formSlice';
import { historyReducer } from './historySlice';
import { undoRedoMiddleware } from './middleware';

export const store = configureStore({
  reducer: {
    form: formReducer,
    history: historyReducer,
  },
  middleware: (getDefault) =>
    getDefault({ serializableCheck: false }).concat(undoRedoMiddleware),
});

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 统一导出，方便外部引用
export { formActions } from './formSlice';
export { historyActions } from './historySlice';
export {
  selectOrderedFields,
  selectSelectedField,
  selectNameConflict,
  selectSchemaJson,
  selectHistoryLog,
  selectCanUndo,
  selectCanRedo,
  selectSelectedIds,
  selectSelectionCount,
} from './selectors';
