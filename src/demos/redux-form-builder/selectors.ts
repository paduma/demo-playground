import { createSelector } from '@reduxjs/toolkit';
import type { FormSchema } from '../form-builder/types';
import { fieldsAdapter, type RootState } from './types';

const fieldsSelectors = fieldsAdapter.getSelectors<RootState>(
  (state) => state.form.fields,
);

/** 按 fieldOrder 排序的字段列表 */
export const selectOrderedFields = createSelector(
  [(state: RootState) => state.form.fieldOrder, fieldsSelectors.selectEntities],
  (order, entities) => order.map(id => entities[id]!).filter(Boolean),
);

/** 当前选中的字段 */
export const selectSelectedField = createSelector(
  [(state: RootState) => state.form.selectedId, fieldsSelectors.selectEntities],
  (id, entities) => (id ? entities[id] ?? null : null),
);

/** 字段名冲突检测 */
export const selectNameConflict = createSelector(
  [selectSelectedField, selectOrderedFields],
  (selected, fields) => {
    if (!selected) return false;
    return fields.some(f => f.id !== selected.id && f.name === selected.name);
  },
);

/** 导出的 FormSchema JSON 字符串 */
export const selectSchemaJson = createSelector(
  [
    (state: RootState) => state.form.title,
    (state: RootState) => state.form.labelCol,
    selectOrderedFields,
  ],
  (title, labelCol, fields): string => {
    const schema: FormSchema = { title, labelCol, fields };
    return JSON.stringify(schema, null, 2);
  },
);

/** 历史相关 */
export const selectHistoryLog = (state: RootState) => state.history.log;
export const selectCanUndo = (state: RootState) => state.history.past.length > 0;
export const selectCanRedo = (state: RootState) => state.history.future.length > 0;


/** 多选的字段 ID 集合 */
export const selectSelectedIds = (state: RootState) => state.form.selectedIds;

/** 多选数量 */
export const selectSelectionCount = (state: RootState) => state.form.selectedIds.length;
