import type { Middleware } from '@reduxjs/toolkit';
import type { RootState } from './types';
import { formActions } from './formSlice';
import { historyActions } from './historySlice';

/** Action 类型 → 操作日志标签 */
const ACTION_LABELS: Record<string, string | ((action: any) => string)> = {
  'form/addField': (a: any) => `添加字段: ${a.payload}`,
  'form/insertFieldAt': (a: any) => `插入字段: ${a.payload?.type}`,
  'form/deleteField': '删除字段',
  'form/deleteSelected': '批量删除',
  'form/copyField': '复制字段',
  'form/updateField': (a: any) => `更新字段: ${a.payload?.label ?? ''}`,
  'form/reorderFields': '拖拽排序',
  'form/setGlobalSpan': '设置全局列数',
  'form/clearAll': '清空所有字段',
  'form/loadSchema': '加载模板',
  'form/setTitle': '修改标题',
  'form/setLabelCol': '修改标签列宽',
};

/** 需要记录到 undo 历史的 action */
const UNDOABLE_ACTIONS = new Set(Object.keys(ACTION_LABELS));

function getActionLabel(action: any): string {
  const def = ACTION_LABELS[action.type];
  return typeof def === 'function' ? def(action) : (def ?? action.type);
}

/**
 * Undo/Redo Middleware
 *
 * 拦截 history/undo 和 history/redo，通过 loadSchema 恢复表单状态，
 * 同时用 applyUndo/applyRedo 维护 past/future 栈。
 * 对可撤销的 form action，在执行前自动快照当前状态。
 */
export const undoRedoMiddleware: Middleware<{}, RootState> =
  (storeApi) => (next) => (action: any) => {
    const type = action?.type as string;

    // ── Undo ──
    if (type === 'history/undo') {
      const { history, form } = storeApi.getState();
      if (history.past.length === 0) return;
      const prev = history.past[history.past.length - 1];
      next(action);
      // 恢复表单到上一个快照
      storeApi.dispatch(formActions.loadSchema({
        title: prev.title,
        labelCol: prev.labelCol,
        fields: prev.fieldOrder.map(id => prev.fields.entities[id]!),
      }));
      // 把当前状态推入 future 栈
      storeApi.dispatch(historyActions.applyUndo(storeApi.getState().form));
      return;
    }

    // ── Redo ──
    if (type === 'history/redo') {
      const { history, form } = storeApi.getState();
      if (history.future.length === 0) return;
      const next_ = history.future[history.future.length - 1];
      next(action);
      storeApi.dispatch(formActions.loadSchema({
        title: next_.title,
        labelCol: next_.labelCol,
        fields: next_.fieldOrder.map(id => next_.fields.entities[id]!),
      }));
      storeApi.dispatch(historyActions.applyRedo(storeApi.getState().form));
      return;
    }

    // ── 自动快照：在可撤销 action 执行前保存当前状态 ──
    if (UNDOABLE_ACTIONS.has(type)) {
      const currentForm = storeApi.getState().form;
      storeApi.dispatch(historyActions.pushState({
        formState: JSON.parse(JSON.stringify(currentForm)),
        label: getActionLabel(action),
      }));
    }

    return next(action);
  };
