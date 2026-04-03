import React, { useState, useCallback, useMemo } from 'react';
import { Tabs, Card, Typography, Select, Space, Button, Popconfirm, message, Tooltip, Tag, Modal, Input, Slider } from 'antd';
import { ClearOutlined, ColumnWidthOutlined, ImportOutlined, FileTextOutlined, ApartmentOutlined, FormOutlined } from '@ant-design/icons';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { FormSchema, FieldSchema, FieldType } from './form-builder/types';
import { FIELD_TEMPLATES, FORM_TEMPLATES, createField, genFieldId } from './form-builder/types';
import SchemaRenderer from './form-builder/SchemaRenderer';
import FieldConfig from './form-builder/FieldConfig';
import SortableField from './form-builder/SortableField';
import FlowDesigner from './approval-flow/FlowDesigner';
import '../form-builder.css';

const { Text } = Typography;

const COLUMN_OPTIONS = [
  { label: '1 列', value: 24 },
  { label: '2 列', value: 12 },
  { label: '3 列', value: 8 },
];

const DEFAULT_SCHEMA: FormSchema = {
  title: '请假申请',
  labelCol: 6,
  fields: [
    { id: 'f1', type: 'input', label: '申请人', name: 'applicant', span: 12, rules: { required: true } },
    {
      id: 'f2', type: 'select', label: '请假类型', name: 'leaveType', span: 12, rules: { required: true }, options: [
        { label: '年假', value: 'annual' }, { label: '事假', value: 'personal' }, { label: '病假', value: 'sick' }, { label: '调休', value: 'compensatory' },
      ]
    },
    { id: 'f3', type: 'date', label: '开始日期', name: 'startDate', span: 12, rules: { required: true } },
    { id: 'f4', type: 'date', label: '结束日期', name: 'endDate', span: 12, rules: { required: true } },
    { id: 'f5', type: 'number', label: '请假天数', name: 'days', span: 12, rules: { required: true, min: 0.5, max: 30 } },
    { id: 'f6', type: 'textarea', label: '请假事由', name: 'reason', rules: { required: true } },
  ],
};

const ApprovalTemplateDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('form');
  const [schema, setSchema] = useState<FormSchema>(DEFAULT_SCHEMA);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const selectedField = useMemo(
    () => schema.fields.find(f => f.id === selectedId) || null,
    [schema.fields, selectedId],
  );

  const nameConflict = useMemo(() => {
    if (!selectedField) return false;
    return schema.fields.some(f => f.id !== selectedField.id && f.name === selectedField.name);
  }, [schema.fields, selectedField]);

  const addField = useCallback((type: FieldType) => {
    const field = createField(type);
    setSchema(prev => ({ ...prev, fields: [...prev.fields, field] }));
    setSelectedId(field.id);
  }, []);

  const copyField = useCallback((id: string) => {
    setSchema(prev => {
      const source = prev.fields.find(f => f.id === id);
      if (!source) return prev;
      const newId = genFieldId();
      const copied: FieldSchema = { ...source, id: newId, name: `${source.name}_copy`, label: `${source.label}(副本)` };
      const idx = prev.fields.findIndex(f => f.id === id);
      const fields = [...prev.fields];
      fields.splice(idx + 1, 0, copied);
      return { ...prev, fields };
    });
    message.success('已复制');
  }, []);

  const updateField = useCallback((updated: FieldSchema) => {
    setSchema(prev => ({ ...prev, fields: prev.fields.map(f => f.id === updated.id ? updated : f) }));
  }, []);

  const deleteField = useCallback((id: string) => {
    setSchema(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));
    setSelectedId(prev => prev === id ? null : prev);
  }, []);

  const clearAll = useCallback(() => {
    setSchema(prev => ({ ...prev, fields: [] }));
    setSelectedId(null);
    message.success('已清空');
  }, []);

  const setGlobalColumns = useCallback((span: number) => {
    setSchema(prev => ({ ...prev, fields: prev.fields.map(f => ({ ...f, span })) }));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSchema(prev => {
      const oldIndex = prev.fields.findIndex(f => f.id === active.id);
      const newIndex = prev.fields.findIndex(f => f.id === over.id);
      return { ...prev, fields: arrayMove(prev.fields, oldIndex, newIndex) };
    });
  }, []);

  const loadTemplate = useCallback((key: string) => {
    const tpl = FORM_TEMPLATES.find(t => t.key === key);
    if (!tpl) return;
    setSchema(JSON.parse(JSON.stringify(tpl.schema)));
    setSelectedId(null);
    message.success(`已加载「${tpl.label}」模板`);
  }, []);

  const handleImport = useCallback(() => {
    try {
      const parsed = JSON.parse(importJson) as FormSchema;
      if (!parsed.fields || !Array.isArray(parsed.fields)) { message.error('JSON 格式不正确'); return; }
      setSchema(parsed);
      setSelectedId(null);
      setImportOpen(false);
      setImportJson('');
      message.success('导入成功');
    } catch { message.error('JSON 解析失败'); }
  }, [importJson]);

  const jsonOutput = useMemo(() => JSON.stringify(schema, null, 2), [schema]);

  /* ── 表单设计 Tab 内容 ── */
  const formDesignContent = (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 120px)' }}>
      {/* 左侧 */}
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card size="small" title="快捷操作" style={{ flexShrink: 0 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Select
              size="small" style={{ width: '100%' }} placeholder="选择预设模板..."
              options={FORM_TEMPLATES.map(t => ({ label: t.label, value: t.key }))}
              onChange={loadTemplate} value={null as unknown as string} allowClear
            />
            <Button size="small" icon={<ImportOutlined />} onClick={() => setImportOpen(true)} block>
              导入 JSON Schema
            </Button>
          </Space>
        </Card>

        <Card size="small" title="组件面板" style={{ flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {FIELD_TEMPLATES.map(t => (
              <div key={t.type} className="component-item" onClick={() => addField(t.type)}
                style={{ padding: '6px 8px', borderRadius: 4, border: '1px dashed #d9d9d9', cursor: 'pointer', fontSize: 12, textAlign: 'center', transition: 'all 0.2s' }}>
                <span style={{ marginRight: 4 }}>{t.icon}</span>{t.label}
              </div>
            ))}
          </div>
        </Card>

        <Card size="small" style={{ flex: 1, overflow: 'auto' }}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>字段列表 <Tag color="blue" style={{ marginLeft: 4 }}>{schema.fields.length}</Tag></span>
              {schema.fields.length > 0 && (
                <Popconfirm title="确定清空所有字段？" onConfirm={clearAll} okText="确定" cancelText="取消">
                  <Tooltip title="清空所有"><Button type="text" size="small" danger icon={<ClearOutlined />} /></Tooltip>
                </Popconfirm>
              )}
            </div>
          }>
          {schema.fields.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 12 }}>暂无字段，点击上方组件添加</Text>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={schema.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                {schema.fields.map(f => (
                  <SortableField key={f.id} field={f} isSelected={f.id === selectedId}
                    onSelect={() => setSelectedId(f.id)} onDelete={() => deleteField(f.id)} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </Card>
      </div>

      {/* 中间：预览 */}
      <Card style={{ flex: 1, overflow: 'auto' }} styles={{ body: { height: '100%' } }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileTextOutlined />
              {editingTitle ? (
                <Input size="small" style={{ width: 200 }} value={schema.title}
                  onChange={e => setSchema(prev => ({ ...prev, title: e.target.value }))}
                  onBlur={() => setEditingTitle(false)} onPressEnter={() => setEditingTitle(false)} autoFocus />
              ) : (
                <span style={{ cursor: 'pointer', borderBottom: '1px dashed #d9d9d9' }}
                  onClick={() => setEditingTitle(true)} title="点击编辑标题">
                  {schema.title || '未命名表单'}
                </span>
              )}
            </div>
            <Space size="small">
              <span style={{ fontSize: 12, color: '#999' }}>labelCol:</span>
              <Slider min={2} max={10} value={schema.labelCol || 6}
                onChange={v => setSchema(prev => ({ ...prev, labelCol: v }))}
                style={{ width: 80, margin: '0 4px' }} tooltip={{ formatter: v => `${v}` }} />
              <ColumnWidthOutlined style={{ color: '#999', fontSize: 14 }} />
              <Select size="small" style={{ width: 90 }} placeholder="列数"
                options={COLUMN_OPTIONS} onChange={setGlobalColumns} allowClear />
            </Space>
          </div>
        }>
        <SchemaRenderer schema={schema} selectedId={selectedId}
          onSelectField={setSelectedId} onDeleteField={deleteField} onCopyField={copyField} />
      </Card>

      {/* 右侧：配置 */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <Card style={{ flex: 1, overflow: 'auto' }} styles={{ body: { padding: 0, height: '100%' } }}>
          <Tabs defaultActiveKey="config" style={{ height: '100%' }}
            tabBarStyle={{ padding: '0 16px', marginBottom: 0 }}
            items={[
              {
                key: 'config', label: '属性配置',
                children: selectedField ? (
                  <FieldConfig key={selectedField.id} field={selectedField}
                    onChange={updateField} onDelete={() => deleteField(selectedField.id)} nameConflict={nameConflict} allFields={schema.fields} />
                ) : (
                  <div style={{ padding: 24, textAlign: 'center' }}><Text type="secondary">点击预览区字段进行配置</Text></div>
                ),
              },
              {
                key: 'json', label: 'JSON Schema',
                children: (
                  <pre style={{ padding: 16, margin: 0, fontSize: 11, lineHeight: 1.6, background: '#fafafa', height: '100%', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {jsonOutput}
                  </pre>
                ),
              },
            ]}
          />
        </Card>
      </div>

      <Modal title="导入 JSON Schema" open={importOpen} onOk={handleImport}
        onCancel={() => { setImportOpen(false); setImportJson(''); }} okText="导入" cancelText="取消" width={600}>
        <Input.TextArea rows={14} value={importJson} onChange={e => setImportJson(e.target.value)}
          placeholder={'粘贴 JSON Schema...'} style={{ fontFamily: 'monospace', fontSize: 12 }} />
      </Modal>
    </div>
  );

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="large"
        tabBarStyle={{ marginBottom: 12 }}
        items={[
          {
            key: 'form',
            label: <span><FormOutlined style={{ marginRight: 6 }} />表单设计</span>,
            children: formDesignContent,
          },
          {
            key: 'flow',
            label: (
              <span>
                <ApartmentOutlined style={{ marginRight: 6 }} />
                流程设计
                <Tag color="blue" style={{ marginLeft: 6, fontSize: 11 }}>{schema.fields.length} 字段可引用</Tag>
              </span>
            ),
            children: <FlowDesigner formFields={schema.fields} />,
          },
        ]}
      />
    </div>
  );
};

export default ApprovalTemplateDemo;
