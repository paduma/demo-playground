import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { dashboardActions, historyActions, type AppDispatch } from '../store';

export function useKeyboardShortcuts() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement;

      if (ctrl && e.key === 'z') {
        e.preventDefault();
        dispatch(e.shiftKey ? historyActions.redo() : historyActions.undo());
      }
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        dispatch(dashboardActions.selectAll());
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !target.matches('input,textarea')) {
        e.preventDefault();
        dispatch(dashboardActions.deleteSelected());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);
}
