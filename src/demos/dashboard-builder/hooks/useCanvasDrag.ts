import { useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dashboardActions, type AppState, type AppDispatch, type Widget } from '../store';

function snap(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Hook for canvas drag (move) and resize interactions.
 * Uses local state during drag for performance, only dispatches to Redux on mouseup.
 */
export function useCanvasDrag() {
  const dispatch = useDispatch<AppDispatch>();
  const gridSize = useSelector((s: AppState) => s.dashboard.gridSize);

  const [dragId, setDragId] = useState<string | null>(null);
  const [resizeId, setResizeId] = useState<string | null>(null);

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const startDrag = useCallback((e: React.MouseEvent, widget: Widget) => {
    setDragId(widget.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: widget.layout.x, origY: widget.layout.y };
  }, []);

  const startResize = useCallback((e: React.MouseEvent, widget: Widget) => {
    e.stopPropagation();
    e.preventDefault();
    setResizeId(widget.id);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: widget.layout.w, origH: widget.layout.h };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragId && dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      dispatch(dashboardActions.moveWidget({
        id: dragId,
        x: snap(Math.max(0, dragRef.current.origX + dx), gridSize),
        y: snap(Math.max(0, dragRef.current.origY + dy), gridSize),
      }));
    }
    if (resizeId && resizeRef.current) {
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;
      dispatch(dashboardActions.resizeWidget({
        id: resizeId,
        w: snap(resizeRef.current.origW + dx, gridSize),
        h: snap(resizeRef.current.origH + dy, gridSize),
      }));
    }
  }, [dragId, resizeId, dispatch, gridSize]);

  const onMouseUp = useCallback(() => {
    if (dragId) {
      dispatch(dashboardActions.commitMove());
      setDragId(null);
      dragRef.current = null;
    }
    if (resizeId) {
      dispatch(dashboardActions.commitResize());
      setResizeId(null);
      resizeRef.current = null;
    }
  }, [dragId, resizeId, dispatch]);

  return { dragId, resizeId, startDrag, startResize, onMouseMove, onMouseUp };
}
