import React, { useCallback, useRef, useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import {
  store, dashboardActions, type AppState, type AppDispatch, type Widget, type WidgetType,
} from './store';
import WidgetRenderer from './WidgetRenderer';
import ComponentPanel from './ComponentPanel';
import PropertyPanel from './PropertyPanel';
import { useCanvasDrag } from './hooks/useCanvasDrag';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoSave, loadSavedDashboard } from './hooks/useAutoSave';

function snap(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/** Preset dashboard template — classic 3-row layout */
const PRESET_WIDGETS: Widget[] = [
  { id: 'p1', type: 'stat-card', layout: { x: 16, y: 16, w: 240, h: 112 }, zIndex: 1, config: { title: 'Total Users', value: '12,580' } },
  { id: 'p2', type: 'stat-card', layout: { x: 272, y: 16, w: 240, h: 112 }, zIndex: 2, config: { title: 'Revenue', value: '¥89.2K' } },
  { id: 'p3', type: 'stat-card', layout: { x: 528, y: 16, w: 240, h: 112 }, zIndex: 3, config: { title: 'Orders Today', value: '3,420' } },
  { id: 'p4', type: 'line-chart', layout: { x: 16, y: 144, w: 480, h: 256 }, zIndex: 4, config: { title: 'Revenue Trend', color: '#1677ff' } },
  { id: 'p5', type: 'bar-chart', layout: { x: 512, y: 144, w: 368, h: 256 }, zIndex: 5, config: { title: 'Weekly Sales', color: '#52c41a' } },
  { id: 'p6', type: 'pie-chart', layout: { x: 16, y: 416, w: 320, h: 240 }, zIndex: 6, config: { title: 'Traffic Source' } },
  { id: 'p7', type: 'table', layout: { x: 352, y: 416, w: 528, h: 240 }, zIndex: 7, config: { title: 'Top Products' } },
];

const DashboardInner: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const widgets = useSelector((s: AppState) => s.dashboard.widgets);
  const selectedIds = useSelector((s: AppState) => s.dashboard.selectedIds);
  const gridSize = useSelector((s: AppState) => s.dashboard.gridSize);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { dragId, resizeId, startDrag, startResize, onMouseMove, onMouseUp } = useCanvasDrag();
  useKeyboardShortcuts();
  useAutoSave();

  // Load saved dashboard on mount
  useEffect(() => {
    const saved = loadSavedDashboard();
    if (saved && Array.isArray(saved) && saved.length > 0) {
      dispatch(dashboardActions.loadPreset(saved));
    }
  }, [dispatch]);

  /** Drop from component panel */
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('widget-type') as WidgetType;
    if (!type) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = snap(e.clientX - rect.left, gridSize);
    const y = snap(e.clientY - rect.top, gridSize);
    dispatch(dashboardActions.addWidget({ type, x, y }));
  }, [dispatch, gridSize]);

  /** Widget mouse down — select + start drag */
  const handleWidgetMouseDown = useCallback((e: React.MouseEvent, widget: Widget) => {
    if ((e.target as HTMLElement).dataset.resize) return;
    e.stopPropagation();
    dispatch(dashboardActions.selectWidget(widget.id));
    startDrag(e, widget);
  }, [dispatch, startDrag]);

  return (
    <div style={{ display: 'flex', gap: 12, height: 'calc(100vh - 64px)' }}>
      <ComponentPanel presetWidgets={PRESET_WIDGETS} />

      {/* Canvas */}
      <div style={{ flex: 1, overflow: 'auto', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
        <div
          ref={canvasRef}
          onDrop={handleCanvasDrop}
          onDragOver={e => e.preventDefault()}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onClick={() => dispatch(dashboardActions.selectWidget(null))}
          style={{
            position: 'relative',
            width: 1200, minHeight: 800,
            backgroundImage: `radial-gradient(circle, #ddd 1px, transparent 1px)`,
            backgroundSize: `${gridSize}px ${gridSize}px`,
          }}
        >
          {widgets.map(w => (
            <div key={w.id}
              onMouseDown={e => handleWidgetMouseDown(e, w)}
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute',
                left: w.layout.x, top: w.layout.y,
                width: w.layout.w, height: w.layout.h,
                zIndex: w.zIndex,
                border: selectedIds.includes(w.id) ? '2px solid #1677ff' : '1px solid #e8e8e8',
                borderRadius: 8,
                background: '#fff',
                boxShadow: selectedIds.includes(w.id) ? '0 0 0 2px rgba(22,119,255,0.1)' : '0 1px 4px rgba(0,0,0,0.06)',
                cursor: dragId === w.id ? 'grabbing' : 'grab',
                overflow: 'hidden',
                transition: (dragId || resizeId) ? undefined : 'box-shadow 0.2s',
              }}>
              <WidgetRenderer widget={w} />
              {/* Resize handle */}
              {selectedIds.includes(w.id) && (
                <div data-resize="true"
                  onMouseDown={e => startResize(e, w)}
                  style={{
                    position: 'absolute', right: 0, bottom: 0,
                    width: 14, height: 14, cursor: 'nwse-resize',
                    background: '#1677ff', borderRadius: '4px 0 8px 0', opacity: 0.7,
                  }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <PropertyPanel />
    </div>
  );
};

const DashboardBuilderDemo: React.FC = () => (
  <Provider store={store}>
    <DashboardInner />
  </Provider>
);

export default DashboardBuilderDemo;
