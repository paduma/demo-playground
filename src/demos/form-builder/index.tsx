import React, { useState, useCallback, useMemo } from 'react';
import { Card, Tabs, Typography, Select, Space, Button, Popconfirm, message, Tooltip, Tag, Modal, Input, Slider } from 'antd';
import { ClearOutlined, ColumnWidthOutlined, ImportOutlined, FileTextOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { FormSchema, FieldSchema, FieldType } from './types';
import { FIELD_TEMPLATES, FORM_TEMPLATES, createField, genFieldId } from './types';
import SchemaRenderer from './SchemaRenderer';
import FieldConfig from './FieldConfig';
import SortableField from './SortableField';
import FormPreview from './FormPreview';
import '../form-builder.css';

const { Text } = Typography;

const COLUMN_OPTIONS = [
  { label: '1 列', value: 24 },
  { label: '2 列', value: 12 },
  { label: '3 列', value: 8 },
];

/** 默认 schema，展示多列布局能力 */
const DEFAULT_SCHEMA: FormSchema = {
  title: '用户信息表单',
  labelCol: 6,
  fields: [
    { id: 'f1', type: 'input', label: '姓名', name: 'name', span: 12, rules: { required: true } },
    { id: 'f2', type: 'input', label: '手机号', name: 'phone', span: 12, placeholder: '请输入手机号', rules: { required: true, pattern: '^1[3-9]\\d{9}$', message: '手机号格式不正确' } },
    {
      id: 'f3', type: 'select', label: '部门', name: 'dept', span: 12, options: [
        { label: '技术部', value: 'tech' }, { label: '产品部', value: 'product' }, { label: '设计部', value: 'design' },
      ]
    },
    { id: 'f4', type: 'date', label: '入职日期', name: 'joinDate', span: 12 },
    {
      id: 'f5', type: 'radio', label: '性别', name: 'gender', options: [
        { label: '男', value: 'male' }, { label: '女', value: 'female' },
      ]
    },
    { id: 'f6', type: 'switch', label: '是否在职', name: 'active', defaultValue: true },
  ],
};

const FormBuilderDemo: React.FC = () => {
  const [schema, setSchema] = useState<FormSchema>(DEFAULT_SCHEMA);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const selectedField = useMemo(
    () => schema.fields.find(f => f.id === selectedId) || null,
    [schema.fields, selectedId],
  );

  /* 字段名重复检测 */
  const nameConflict = useMemo(() => {
    if (!selectedField) return false;
    return schema.fields.some(f => f.id !== selectedField.id && f.name === selectedField.name);
  }, [schema.fields, selectedField]);

  /* 添加字段 */
  const addField = useCallback((type: FieldType) => {
    const field = createField(type);
    setSchema(prev => ({ ...prev, fields: [...prev.fields, field] }));
    setSelectedId(field.id);
  }, []);

  /* 复制字段 */
  const copyField = useCallback((id: string) => {
    setSchema(prev => {
      const source = prev.fields.find(f => f.id === id);
      if (!source) return prev;
      const newId = genFieldId();
      const copied: FieldSchema = {
        ...source,
        id: newId,
        name: `${source.name}_copy`,
        label: `${source.label}(副本)`,
      };
      const idx = prev.fields.findIndex(f => f.id === id);
      const fields = [...prev.fields];
      fields.splice(idx + 1, 0, copied);
      return { ...prev, fields };
    });
    message.success('已复制');
  }, []);

  /* 更新字段 */
  const updateField = useCallback((updated: FieldSchema) => {
    setSchema(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === updated.id ? updated : f),
    }));
  }, []);

  /* 删除字段 */
  const deleteField = useCallback((id: string) => {
    setSchema(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));
    setSelectedId(prev => prev === id ? null : prev);
  }, []);

  /* 清空所有字段 */
  const clearAll = useCallback(() => {
    setSchema(prev => ({ ...prev, fields: [] }));
    setSelectedId(null);
    message.success('已清空');
  }, []);

  /* 全局列数设置 */
  const setGlobalColumns = useCallback((span: number) => {
    setSchema(prev => ({
      ...prev,
      fields: prev.fields.map(f => ({ ...f, span })),
    }));
  }, []);

  /* 拖拽排序 */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSchema(prev => {
      const oldIndex = prev.fields.findIndex(f => f.id === active.id);
      const newIndex = prev.fields.findIndex(f => f.id === over.id);
      return { ...prev, fields: arrayMove(prev.fields, oldIndex, newIndex) };
    });
  }, []);

  /* 加载预设模板 */
  const loadTemplate = useCallback((key: string) => {
    const tpl = FORM_TEMPLATES.find(t => t.key === key);
    if (!tpl) return;

    const doLoad = () => {
      setSchema(JSON.parse(JSON.stringify(tpl.schema)));
      setSelectedId(null);
      message.success(`已加载「${tpl.label}」模板`);
    };

    if (schema.fields.length > 0) {
      Modal.confirm({
        title: '加载模板',
        content: `当前已有 ${schema.fields.length} 个字段，加载模板将覆盖所有内容，确定继续？`,
        okText: '确定加载',
        okType: 'danger',
        cancelText: '取消',
        onOk: doLoad,
      });
    } else {
      doLoad();
    }
  }, [schema.fields.length]);

  /* JSON 导入 */
  const handleImport = useCallback(() => {
    try {
      const parsed = JSON.parse(importJson) as FormSchema;
      if (!parsed.fields || !Array.isArray(parsed.fields)) {
        message.error('JSON 格式不正确：缺少 fields 数组');
        return;
      }
      for (let i = 0; i < parsed.fields.length; i++) {
        const f = parsed.fields[i];
        if (!f.id || !f.type || !f.label || !f.name) {
          message.error(`第 ${i + 1} 个字段缺少必填属性（id/type/label/name）`);
          return;
        }
      }
      setSchema(parsed);
      setSelectedId(null);
      setImportOpen(false);
      setImportJson('');
      message.success('导入成功');
    } catch {
      message.error('JSON 解析失败，请检查格式');
    }
  }, [importJson]);

  /* 导出的 JSON Schema */
  const jsonOutput = useMemo(() => JSON.stringify(schema, null, 2), [schema]);

  return (
    <div>
      {/* 顶部模式切换 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space>
          <Button
            type={mode === 'edit' ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={() => setMode('edit')}
          >
            编辑模式
          </Button>
          <Button
            type={mode === 'preview' ? 'primary' : 'default'}
            icon={<EyeOutlined />}
            onClick={() => setMode('preview')}
          >
            运行时预览
          </Button>
        </Space>
        {mode === 'preview' && (
          <Tag color="green">联动规则实时生效，可实际填写并提交</Tag>
        )}
      </div>

      {mode === 'preview' ? (
        <FormPreview schema={schema} />
      ) : (
        <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 110px)' }}>

          {/* ── 左侧：组件面板 + 字段列表 ── */}
          <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 模板选择 + JSON 导入 */}
            <Card size="small" title="快捷操作" style={{ flexShrink: 0 }}>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Select
                  size="small"
                  style={{ width: '100%' }}
                  placeholder="选择预设模板..."
                  options={FORM_TEMPLATES.map(t => ({ label: t.label, value: t.key }))}
                  onChange={loadTemplate}
                  value={null as unknown as string}
                  allowClear
                />
                <Button
                  size="small"
                  icon={<ImportOutlined />}
                  onClick={() => setImportOpen(true)}
                  block
                >
                  导入 JSON Schema
                </Button>
              </Space>
            </Card>

            {/* 组件面板 */}
            <Card size="small" title="组件面板" style={{ flexShrink: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {FIELD_TEMPLATES.map(t => (
                  <div
                    key={t.type}
                    className="component-item"
                    onClick={() => addField(t.type)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 4,
                      border: '1px dashed #d9d9d9',
                      cursor: 'pointer',
                      fontSize: 12,
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ marginRight: 4 }}>{t.icon}</span>
                    {t.label}
                  </div>
                ))}
              </div>
            </Card>

            {/* 字段列表（可拖拽排序） */}
            <Card
              size="small"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>字段列表 <Tag color="blue" style={{ marginLeft: 4 }}>{schema.fields.length}</Tag></span>
                  {schema.fields.length > 0 && (
                    <Popconfirm title="确定清空所有字段？" onConfirm={clearAll} okText="确定" cancelText="取消">
                      <Tooltip title="清空所有">
                        <Button type="text" size="small" danger icon={<ClearOutlined />} />
                      </Tooltip>
                    </Popconfirm>
                  )}
                </div>
              }
              style={{ flex: 1, overflow: 'auto' }}
            >
              {schema.fields.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 12 }}>暂无字段，点击上方组件添加</Text>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={schema.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {schema.fields.map(f => (
                      <SortableField
                        key={f.id}
                        field={f}
                        isSelected={f.id === selectedId}
                        onSelect={() => setSelectedId(f.id)}
                        onDelete={() => deleteField(f.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </Card>
          </div>

          {/* ── 中间：表单预览 ── */}
          <Card
            style={{ flex: 1, overflow: 'auto' }}
            styles={{ body: { height: '100%' } }}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileTextOutlined />
                  {editingTitle ? (
                    <Input
                      size="small"
                      style={{ width: 200 }}
                      value={schema.title}
                      onChange={e => setSchema(prev => ({ ...prev, title: e.target.value }))}
                      onBlur={() => setEditingTitle(false)}
                      onPressEnter={() => setEditingTitle(false)}
                      autoFocus
                    />
                  ) : (
                    <span
                      style={{ cursor: 'pointer', borderBottom: '1px dashed #d9d9d9' }}
                      onClick={() => setEditingTitle(true)}
                      title="点击编辑标题"
                    >
                      {schema.title || '未命名表单'}
                    </span>
                  )}
                </div>
                <Space size="small">
                  <Tooltip title="标签列宽">
                    <span style={{ fontSize: 12, color: '#999' }}>labelCol:</span>
                  </Tooltip>
                  <Slider
                    min={2}
                    max={10}
                    value={schema.labelCol || 6}
                    onChange={v => setSchema(prev => ({ ...prev, labelCol: v }))}
                    style={{ width: 80, margin: '0 4px' }}
                    tooltip={{ formatter: v => `${v}` }}
                  />
                  <ColumnWidthOutlined style={{ color: '#999', fontSize: 14 }} />
                  <Select
                    size="small"
                    style={{ width: 90 }}
                    placeholder="列数"
                    options={COLUMN_OPTIONS}
                    onChange={setGlobalColumns}
                    allowClear
                  />
                </Space>
              </div>
            }
          >
            <SchemaRenderer
              schema={schema}
              selectedId={selectedId}
              onSelectField={setSelectedId}
              onDeleteField={deleteField}
              onCopyField={copyField}
            />
          </Card>

          {/* ── 右侧：属性配置 + JSON 预览 ── */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <Card
              style={{ flex: 1, overflow: 'auto' }}
              styles={{ body: { padding: 0, height: '100%' } }}
            >
              <Tabs
                defaultActiveKey="config"
                style={{ height: '100%' }}
                tabBarStyle={{ padding: '0 16px', marginBottom: 0 }}
                items={[
                  {
                    key: 'config',
                    label: '属性配置',
                    children: selectedField ? (
                      <FieldConfig
                        key={selectedField.id}
                        field={selectedField}
                        onChange={updateField}
                        onDelete={() => deleteField(selectedField.id)}
                        nameConflict={nameConflict}
                        allFields={schema.fields}
                      />
                    ) : (
                      <div style={{ padding: 24, textAlign: 'center' }}>
                        <Text type="secondary">点击预览区字段进行配置</Text>
                      </div>
                    ),
                  },
                  {
                    key: 'json',
                    label: 'JSON Schema',
                    children: (
                      <pre style={{
                        padding: 16,
                        margin: 0,
                        fontSize: 11,
                        lineHeight: 1.6,
                        background: '#fafafa',
                        height: '100%',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}>
                        {jsonOutput}
                      </pre>
                    ),
                  },
                ]}
              />
            </Card>
          </div>

          {/* JSON 导入弹窗 */}
          <Modal
            title="导入 JSON Schema"
            open={importOpen}
            onOk={handleImport}
            onCancel={() => { setImportOpen(false); setImportJson(''); }}
            okText="导入"
            cancelText="取消"
            width={600}
          >
            <Input.TextArea
              rows={14}
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              placeholder={'粘贴 JSON Schema，格式如：\n{\n  "title": "表单标题",\n  "fields": [...]\n}'}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Modal>
        </div>
      )}
    </div>
  );
};

export default FormBuilderDemo;
