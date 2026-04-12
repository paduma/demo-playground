import React, { useCallback, useMemo, useState } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import {
  Card, Tabs, Typography, Select, Space, Button, Popconfirm,
  message, Tooltip, Tag, Modal, Input, Slider,
} from 'antd';
import {
  ClearOutlined, ColumnWidthOutlined, ImportOutlined,
  FileTextOutlined, UndoOutlined, RedoOutlined, HistoryOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { FormSchema, FieldType } from './form-builder/types';
import { FIELD_TEMPLATES, FORM_TEMPLATES } from './form-builder/types';
import FieldConfig from './form-builder/FieldConfig';
import SortableField from './form-builder/SortableField';
import HistoryPanel from './redux-form-builder/HistoryPanel';
import CanvasRenderer from './redux-form-builder/CanvasRenderer';
import DraggableComponentItem from './redux-form-builder/dnd/DraggableComponentItem';
import DroppableCanvas from './redux-form-builder/dnd/DroppableCanvas';
import DragOverlayPreview from './redux-form-builder/dnd/DragOverlayPreview';
import {
  store, formActions, historyActions,
  selectOrderedFields, selectSelectedField, selectNameConflict,
  selectSchemaJson, selectCanUndo, selectCanRedo,
  selectSelectedIds, selectSelectionCount,
  type AppDispatch, type AppState,
} from './redux-form-builder/store';
import '../form-builder.css';

const { Text } = Typography;

const COLUMN_OPTIONS = [
  { label: '1 列', value: 24 },
  { label: '2 列', value: 12 },
  { label: '3 列', value: 8 },
];

const FormBuilderInner: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const fields = useSelector(selectOrderedFields);
  const selectedField = useSelector(selectSelectedField);
  const nameConflict = useSelector(selectNameConflict);
  const jsonOutput = useSelector(selectSchemaJson);
  const canUndo = useSelector(selectCanUndo);
  const canRedo = useSelector(selectCanRedo);
  const selectedIds = useSelector(selectSelectedIds);
  const selectionCount = useSelector(selectSelectionCount);
  const title = useSelector((s: AppState) => s.form.title);
  const labelCol = useSelector((s: AppState) => s.form.labelCol);
  const selectedId = useSelector((s: AppState) => s.form.selectedId);

  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [dragActiveType, setDragActiveType] = useState<FieldType | null>(null);
  /** 是否有任何拖拽正在进行（用于画布切单列） */
  const [canvasDragging, setCanvasDragging] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const schema: FormSchema = useMemo(() => ({ title, labelCol, fields }), [title, labelCol, fields]);

  /** 处理字段点击 — 支持多选 */
  const handleFieldClick = useCallback((id: string, e?: React.MouseEvent) => {
    if (e?.ctrlKey || e?.metaKey) {
      dispatch(formActions.toggleSelectField(id));
    } else if (e?.shiftKey) {
      dispatch(formActions.rangeSelectField(id));
    } else {
      dispatch(formActions.selectField(id));
    }
  }, [dispatch]);

  /** 拖拽开始 */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'new-field') {
      setDragActiveType(data.fieldType as FieldType);
    }
    // 任何拖拽开始都触发画布切单列
    setCanvasDragging(true);
  }, []);

  /** 拖拽结束 — 处理排序和跨区域新增 */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDragActiveType(null);
    setCanvasDragging(false);
    const { active, over } = event;
    const data = active.data.current;

    // 从组件面板拖入 → 新增字段
    if (data?.type === 'new-field') {
      const fieldType = data.fieldType as FieldType;
      if (over) {
        // 如果 over 到了某个已有字段上，插入到该字段的位置
        const overIndex = fields.findIndex(f => f.id === over.id);
        if (overIndex >= 0) {
          dispatch(formActions.insertFieldAt({ type: fieldType, index: overIndex }));
          return;
        }
      }
      // 否则追加到末尾
      dispatch(formActions.addField(fieldType));
      return;
    }

    // 画布内排序 或 左侧列表排序
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex(f => f.id === active.id);
    const newIndex = fields.findIndex(f => f.id === over.id);
    if (oldIndex >= 0 && newIndex >= 0) {
      dispatch(formActions.reorderFields({ oldIndex, newIndex }));
    }
  }, [dispatch, fields]);

  /** 拖拽取消 */
  const handleDragCancel = useCallback(() => {
    setDragActiveType(null);
    setCanvasDragging(false);
  }, []);

  const loadTemplate = useCallback((key: string) => {
    const tpl = FORM_TEMPLATES.find(t => t.key === key);
    if (!tpl) return;
    const doLoad = () => {
      dispatch(formActions.loadSchema(JSON.parse(JSON.stringify(tpl.schema))));
      message.success(`已加载「${tpl.label}」模板`);
    };
    if (fields.length > 0) {
      Modal.confirm({
        title: '加载模板', content: `当前已有 ${fields.length} 个字段，确定覆盖？`,
        okText: '确定', okType: 'danger', cancelText: '取消', onOk: doLoad,
      });
    } else { doLoad(); }
  }, [dispatch, fields.length]);

  const handleImport = useCallback(() => {
    try {
      const parsed = JSON.parse(importJson) as FormSchema;
      if (!parsed.fields || !Array.isArray(parsed.fields)) { message.error('缺少 fields 数组'); return; }
      dispatch(formActions.loadSchema(parsed));
      setImportOpen(false); setImportJson('');
      message.success('导入成功');
    } catch { message.error('JSON 解析失败'); }
  }, [dispatch, importJson]);

  // 键盘快捷键
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+Z / Ctrl+Shift+Z — undo/redo
      if (ctrl && e.key === 'z') {
        e.preventDefault();
        dispatch(e.shiftKey ? historyActions.redo() : historyActions.undo());
        return;
      }
      // Ctrl+A — 全选
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        dispatch(formActions.selectAll());
        return;
      }
      // Delete / Backspace — 删除选中
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // 避免在输入框中触发
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
        e.preventDefault();
        if (selectionCount > 1) {
          dispatch(formActions.deleteSelected());
          message.success(`已删除 ${selectionCount} 个字段`);
        } else if (selectedId) {
          dispatch(formActions.deleteField(selectedId));
        }
        return;
      }
      // Ctrl+D — 复制选中字段
      if (ctrl && e.key === 'd') {
        e.preventDefault();
        if (selectedId) {
          dispatch(formActions.copyField(selectedId));
          message.success('已复制');
        }
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, selectedId, selectionCount]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 64px)' }}>
        {/* ── 左侧 ── */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 工具栏 */}
          <Card size="small" title={<><HistoryOutlined /> Redux 操作</>}>
            <Space wrap>
              <Tooltip title="撤销 (Ctrl+Z)">
                <Button size="small" icon={<UndoOutlined />} disabled={!canUndo}
                  onClick={() => dispatch(historyActions.undo())} />
              </Tooltip>
              <Tooltip title="重做 (Ctrl+Shift+Z)">
                <Button size="small" icon={<RedoOutlined />} disabled={!canRedo}
                  onClick={() => dispatch(historyActions.redo())} />
              </Tooltip>
              {selectionCount > 1 && (
                <Tooltip title={`删除 ${selectionCount} 个选中字段 (Delete)`}>
                  <Button size="small" danger icon={<DeleteOutlined />}
                    onClick={() => { dispatch(formActions.deleteSelected()); message.success('已删除'); }}>
                    {selectionCount}
                  </Button>
                </Tooltip>
              )}
              <Tag color="geekblue">RTK</Tag>
            </Space>
          </Card>

          {/* 模板 + 导入 */}
          <Card size="small" title="快捷操作" style={{ flexShrink: 0 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Select size="small" style={{ width: '100%' }} placeholder="选择预设模板..."
                options={FORM_TEMPLATES.map(t => ({ label: t.label, value: t.key }))}
                onChange={loadTemplate} value={null as unknown as string} allowClear />
              <Button size="small" icon={<ImportOutlined />} onClick={() => setImportOpen(true)} block>
                导入 JSON
              </Button>
            </Space>
          </Card>

          {/* 组件面板 — 可拖拽 */}
          <Card size="small" title="组件面板（可拖入画布）" style={{ flexShrink: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {FIELD_TEMPLATES.map(t => (
                <DraggableComponentItem key={t.type} type={t.type} label={t.label} icon={t.icon} />
              ))}
            </div>
          </Card>

          {/* 字段列表 */}
          <Card size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>字段列表 <Tag color="blue" style={{ marginLeft: 4 }}>{fields.length}</Tag></span>
                {fields.length > 0 && (
                  <Popconfirm title="确定清空？" onConfirm={() => { dispatch(formActions.clearAll()); message.success('已清空'); }}>
                    <Tooltip title="清空所有">
                      <Button type="text" size="small" danger icon={<ClearOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                )}
              </div>
            }
            style={{ flex: 1, overflow: 'auto' }}>
            {fields.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>拖拽组件到画布，或点击添加</Text>
            ) : (
              <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                {fields.map(f => (
                  <SortableField key={f.id} field={f}
                    isSelected={selectedIds.includes(f.id)}
                    onSelect={() => handleFieldClick(f.id)}
                    onDelete={() => dispatch(formActions.deleteField(f.id))} />
                ))}
              </SortableContext>
            )}
          </Card>
        </div>

        {/* ── 中间：预览画布 ── */}
        <Card style={{ flex: 1, overflow: 'auto' }} styles={{ body: { height: '100%' } }}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileTextOutlined />
                {editingTitle ? (
                  <Input size="small" style={{ width: 200 }} value={title}
                    onChange={e => dispatch(formActions.setTitle(e.target.value))}
                    onBlur={() => setEditingTitle(false)} onPressEnter={() => setEditingTitle(false)} autoFocus />
                ) : (
                  <span style={{ cursor: 'pointer', borderBottom: '1px dashed #d9d9d9' }}
                    onClick={() => setEditingTitle(true)}>
                    {title || '未命名表单'}
                  </span>
                )}
                <Tag color="volcano" style={{ fontSize: 10 }}>Redux 版</Tag>
              </div>
              <Space size="small">
                <span style={{ fontSize: 12, color: '#999' }}>labelCol:</span>
                <Slider min={2} max={10} value={labelCol}
                  onChange={v => dispatch(formActions.setLabelCol(v))}
                  style={{ width: 80, margin: '0 4px' }} tooltip={{ formatter: v => `${v}` }} />
                <ColumnWidthOutlined style={{ color: '#999', fontSize: 14 }} />
                <Select size="small" style={{ width: 90 }} placeholder="列数"
                  options={COLUMN_OPTIONS} onChange={v => dispatch(formActions.setGlobalSpan(v))} allowClear />
              </Space>
            </div>
          }>
          <DroppableCanvas>
            <CanvasRenderer
              schema={schema}
              selectedId={selectedId}
              isDragging={canvasDragging}
              onSelectField={id => dispatch(formActions.selectField(id))}
              onDeleteField={id => dispatch(formActions.deleteField(id))}
              onCopyField={id => dispatch(formActions.copyField(id))}
            />
          </DroppableCanvas>
        </Card>

        {/* ── 右侧 ── */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <Card style={{ flex: 1, overflow: 'auto' }} styles={{ body: { padding: 0, height: '100%' } }}>
            <Tabs defaultActiveKey="config" style={{ height: '100%' }}
              tabBarStyle={{ padding: '0 16px', marginBottom: 0 }}
              items={[
                {
                  key: 'config', label: '属性配置',
                  children: selectedField ? (
                    <FieldConfig key={selectedField.id} field={selectedField}
                      onChange={f => dispatch(formActions.updateField(f))}
                      onDelete={() => dispatch(formActions.deleteField(selectedField.id))}
                      nameConflict={nameConflict} allFields={fields} />
                  ) : (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                      <Text type="secondary">点击字段进行配置</Text>
                      <div style={{ marginTop: 16, fontSize: 11, color: '#999', lineHeight: 2.2, textAlign: 'left', padding: '0 12px' }}>
                        <div><kbd style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3, border: '1px solid #d9d9d9' }}>Ctrl</kbd>+点击 多选</div>
                        <div><kbd style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3, border: '1px solid #d9d9d9' }}>Shift</kbd>+点击 范围选</div>
                        <div><kbd style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3, border: '1px solid #d9d9d9' }}>Ctrl+A</kbd> 全选</div>
                        <div><kbd style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3, border: '1px solid #d9d9d9' }}>Delete</kbd> 删除</div>
                        <div><kbd style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3, border: '1px solid #d9d9d9' }}>Ctrl+D</kbd> 复制</div>
                        <div><kbd style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3, border: '1px solid #d9d9d9' }}>Ctrl+Z</kbd> 撤销</div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'json', label: 'JSON',
                  children: (
                    <pre style={{
                      padding: 16, margin: 0, fontSize: 11, lineHeight: 1.6,
                      background: '#fafafa', height: '100%', overflow: 'auto',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    }}>{jsonOutput}</pre>
                  ),
                },
                {
                  key: 'history', label: <><HistoryOutlined /> 历史</>,
                  children: <HistoryPanel />,
                },
              ]} />
          </Card>
        </div>

        {/* 导入弹窗 */}
        <Modal title="导入 JSON Schema" open={importOpen}
          onOk={handleImport} onCancel={() => { setImportOpen(false); setImportJson(''); }}
          okText="导入" cancelText="取消" width={600}>
          <Input.TextArea rows={14} value={importJson} onChange={e => setImportJson(e.target.value)}
            placeholder="粘贴 JSON Schema..." style={{ fontFamily: 'monospace', fontSize: 12 }} />
        </Modal>
      </div>

      {/* 拖拽幽灵预览 */}
      <DragOverlayPreview activeType={dragActiveType} />
    </DndContext>
  );
};

const ReduxFormBuilderDemo: React.FC = () => (
  <Provider store={store}>
    <FormBuilderInner />
  </Provider>
);

export default ReduxFormBuilderDemo;
