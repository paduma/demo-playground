import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DashboardState, Widget, WidgetLayout, WidgetType } from './types';
import { genWidgetId, WIDGET_TEMPLATES } from './types';

const initialState: DashboardState = {
  widgets: [],
  selectedIds: [],
  gridSize: 16,
  canvasWidth: 1200,
  canvasHeight: 800,
  nextZIndex: 1,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    /** Add a widget at a given position */
    addWidget(state, action: PayloadAction<{ type: WidgetType; x: number; y: number }>) {
      const { type, x, y } = action.payload;
      const tpl = WIDGET_TEMPLATES.find(t => t.type === type)!;
      const widget: Widget = {
        id: genWidgetId(),
        type,
        layout: { x, y, w: tpl.defaultSize.w, h: tpl.defaultSize.h },
        zIndex: state.nextZIndex++,
        config: { title: tpl.label },
      };
      state.widgets.push(widget);
      state.selectedIds = [widget.id];
    },
    /** Move a widget to new position (high-frequency, no undo) */
    moveWidget(state, action: PayloadAction<{ id: string; x: number; y: number }>) {
      const w = state.widgets.find(w => w.id === action.payload.id);
      if (w) {
        w.layout.x = action.payload.x;
        w.layout.y = action.payload.y;
      }
    },
    /** Commit move — triggers undo snapshot (called on mouseup) */
    commitMove(_state) { },
    /** Resize a widget (high-frequency, no undo) */
    resizeWidget(state, action: PayloadAction<{ id: string; w: number; h: number }>) {
      const widget = state.widgets.find(w => w.id === action.payload.id);
      if (widget) {
        widget.layout.w = Math.max(80, action.payload.w);
        widget.layout.h = Math.max(40, action.payload.h);
      }
    },
    /** Commit resize — triggers undo snapshot (called on mouseup) */
    commitResize(_state) { },
    /** Update widget config */
    updateWidgetConfig(state, action: PayloadAction<{ id: string; config: Partial<Widget['config']> }>) {
      const w = state.widgets.find(w => w.id === action.payload.id);
      if (w) Object.assign(w.config, action.payload.config);
    },
    /** Delete selected widgets */
    deleteSelected(state) {
      state.widgets = state.widgets.filter(w => !state.selectedIds.includes(w.id));
      state.selectedIds = [];
    },
    /** Delete a single widget */
    deleteWidget(state, action: PayloadAction<string>) {
      state.widgets = state.widgets.filter(w => w.id !== action.payload);
      state.selectedIds = state.selectedIds.filter(id => id !== action.payload);
    },
    /** Select a widget (single) */
    selectWidget(state, action: PayloadAction<string | null>) {
      state.selectedIds = action.payload ? [action.payload] : [];
    },
    /** Toggle select (Ctrl+click) */
    toggleSelectWidget(state, action: PayloadAction<string>) {
      const idx = state.selectedIds.indexOf(action.payload);
      if (idx >= 0) state.selectedIds.splice(idx, 1);
      else state.selectedIds.push(action.payload);
    },
    /** Select all */
    selectAll(state) {
      state.selectedIds = state.widgets.map(w => w.id);
    },
    /** Bring to front */
    bringToFront(state, action: PayloadAction<string>) {
      const w = state.widgets.find(w => w.id === action.payload);
      if (w) w.zIndex = state.nextZIndex++;
    },
    /** Send to back */
    sendToBack(state, action: PayloadAction<string>) {
      const w = state.widgets.find(w => w.id === action.payload);
      if (w) {
        const minZ = Math.min(...state.widgets.map(w => w.zIndex));
        w.zIndex = minZ - 1;
      }
    },
    /** Load a preset dashboard */
    loadPreset(state, action: PayloadAction<Widget[]>) {
      state.widgets = action.payload;
      state.selectedIds = [];
      state.nextZIndex = Math.max(...action.payload.map(w => w.zIndex), 0) + 1;
    },
    /** Clear all */
    clearAll(state) {
      state.widgets = [];
      state.selectedIds = [];
    },
  },
});

export const dashboardActions = dashboardSlice.actions;
export const dashboardReducer = dashboardSlice.reducer;
