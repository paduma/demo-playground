import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FieldSchema, FormSchema, FieldType } from '../../form-builder/types';
import { createField } from '../../form-builder/types';
import { fieldsAdapter, type FormState, initialFieldsState } from './types';

const initialState: FormState = {
  title: '未命名表单',
  labelCol: 6,
  fields: initialFieldsState,
  fieldOrder: [],
  selectedId: null,
  selectedIds: [],
  defaultSpan: 24,
};

const formSlice = createSlice({
  name: 'form',
  initialState,
  reducers: {
    setTitle(state, action: PayloadAction<string>) {
      state.title = action.payload;
    },
    setLabelCol(state, action: PayloadAction<number>) {
      state.labelCol = action.payload;
    },
    addField(state, action: PayloadAction<FieldType>) {
      const field = createField(action.payload);
      field.span = state.defaultSpan;
      fieldsAdapter.addOne(state.fields, field);
      state.fieldOrder.push(field.id);
      state.selectedId = field.id;
      state.selectedIds = [field.id];
    },
    /** 在指定位置插入新字段 */
    insertFieldAt(state, action: PayloadAction<{ type: FieldType; index: number }>) {
      const field = createField(action.payload.type);
      field.span = state.defaultSpan;
      fieldsAdapter.addOne(state.fields, field);
      state.fieldOrder.splice(action.payload.index, 0, field.id);
      state.selectedId = field.id;
      state.selectedIds = [field.id];
    },
    updateField(state, action: PayloadAction<FieldSchema>) {
      fieldsAdapter.upsertOne(state.fields, action.payload);
    },
    deleteField(state, action: PayloadAction<string>) {
      fieldsAdapter.removeOne(state.fields, action.payload);
      state.fieldOrder = state.fieldOrder.filter(id => id !== action.payload);
      if (state.selectedId === action.payload) state.selectedId = null;
    },
    copyField(state, action: PayloadAction<string>) {
      const source = state.fields.entities[action.payload];
      if (!source) return;
      const copied = createField(source.type);
      Object.assign(copied, {
        ...source,
        id: copied.id,
        name: `${source.name}_copy`,
        label: `${source.label}(副本)`,
      });
      fieldsAdapter.addOne(state.fields, copied);
      const idx = state.fieldOrder.indexOf(action.payload);
      state.fieldOrder.splice(idx + 1, 0, copied.id);
    },
    reorderFields(state, action: PayloadAction<{ oldIndex: number; newIndex: number }>) {
      const { oldIndex, newIndex } = action.payload;
      const [moved] = state.fieldOrder.splice(oldIndex, 1);
      state.fieldOrder.splice(newIndex, 0, moved);
    },
    setGlobalSpan(state, action: PayloadAction<number>) {
      state.defaultSpan = action.payload;
      const updates = state.fieldOrder.map(id => ({ id, changes: { span: action.payload } }));
      fieldsAdapter.updateMany(state.fields, updates);
    },
    selectField(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
      state.selectedIds = action.payload ? [action.payload] : [];
    },
    /** 多选：Ctrl/Shift 点击切换选中 */
    toggleSelectField(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.selectedIds.indexOf(id);
      if (idx >= 0) {
        state.selectedIds.splice(idx, 1);
      } else {
        state.selectedIds.push(id);
      }
      state.selectedId = state.selectedIds[state.selectedIds.length - 1] ?? null;
    },
    /** 范围选择：Shift 点击 */
    rangeSelectField(state, action: PayloadAction<string>) {
      const targetId = action.payload;
      const anchorId = state.selectedId;
      if (!anchorId) {
        state.selectedIds = [targetId];
        state.selectedId = targetId;
        return;
      }
      const startIdx = state.fieldOrder.indexOf(anchorId);
      const endIdx = state.fieldOrder.indexOf(targetId);
      const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
      state.selectedIds = state.fieldOrder.slice(from, to + 1);
      state.selectedId = targetId;
    },
    /** 全选 */
    selectAll(state) {
      state.selectedIds = [...state.fieldOrder];
      state.selectedId = state.fieldOrder[state.fieldOrder.length - 1] ?? null;
    },
    /** 批量删除选中字段 */
    deleteSelected(state) {
      if (state.selectedIds.length === 0) return;
      fieldsAdapter.removeMany(state.fields, state.selectedIds);
      state.fieldOrder = state.fieldOrder.filter(id => !state.selectedIds.includes(id));
      state.selectedIds = [];
      state.selectedId = null;
    },
    clearAll(state) {
      fieldsAdapter.removeAll(state.fields);
      state.fieldOrder = [];
      state.selectedId = null;
      state.selectedIds = [];
    },
    loadSchema(state, action: PayloadAction<FormSchema>) {
      const schema = action.payload;
      state.title = schema.title;
      state.labelCol = schema.labelCol ?? 6;
      fieldsAdapter.setAll(state.fields, schema.fields);
      state.fieldOrder = schema.fields.map(f => f.id);
      state.selectedId = null;
      state.selectedIds = [];
      // 推断 defaultSpan：取字段中出现最多的 span 值
      if (schema.fields.length > 0) {
        const spanCounts = new Map<number, number>();
        schema.fields.forEach(f => {
          const s = f.span || 24;
          spanCounts.set(s, (spanCounts.get(s) || 0) + 1);
        });
        let maxCount = 0;
        spanCounts.forEach((count, span) => {
          if (count > maxCount) { maxCount = count; state.defaultSpan = span; }
        });
      }
    },
  },
});

export const formActions = formSlice.actions;
export const formReducer = formSlice.reducer;
