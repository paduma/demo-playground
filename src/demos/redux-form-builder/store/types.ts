import { createEntityAdapter } from '@reduxjs/toolkit';
import type { FieldSchema } from '../form-builder/types';

/** Entity Adapter — 字段实体的规范化存储 */
export const fieldsAdapter = createEntityAdapter<FieldSchema>();
export const initialFieldsState = fieldsAdapter.getInitialState();

/** 操作历史条目 */
export interface HistoryEntry {
  label: string;
  timestamp: number;
}

/** 表单状态 */
export interface FormState {
  title: string;
  labelCol: number;
  fields: typeof initialFieldsState;
  fieldOrder: string[];
  selectedId: string | null;
  /** 多选的字段 ID 集合 */
  selectedIds: string[];
  /** 当前全局列宽设置，新增字段时继承 */
  defaultSpan: number;
}

/** 历史状态 */
export interface HistoryState {
  past: FormState[];
  future: FormState[];
  log: HistoryEntry[];
}

/** 根状态 */
export interface RootState {
  form: FormState;
  history: HistoryState;
}
