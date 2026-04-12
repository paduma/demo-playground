import React, { useEffect, useMemo } from 'react';
import {
  Form, Input, InputNumber, Select, DatePicker,
  Switch, Radio, Checkbox, Button, Empty, Tooltip,
} from 'antd';
import { DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCanvasField from './dnd/SortableCanvasField';
import type { FormSchema, FieldSchema } from '../form-builder/types';

/** 根据字段 schema 渲染对应的 antd 组件 */
function renderField(field: FieldSchema): React.ReactNode {
  switch (field.type) {
    case 'input':
      return <Input placeholder={field.placeholder || `请输入${field.label}`} disabled={field.disabled} readOnly={field.readonly} />;
    case 'textarea':
      return <Input.TextArea rows={3} placeholder={field.placeholder || `请输入${field.label}`} disabled={field.disabled} />;
    case 'number':
      return <InputNumber style={{ width: '100%' }} min={field.rules?.min} max={field.rules?.max} placeholder={field.placeholder} disabled={field.disabled} />;
    case 'select':
      return (
        <Select placeholder={field.placeholder || `请选择${field.label}`} disabled={field.disabled}>
          {field.options?.map(o => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}
        </Select>
      );
    case 'date':
      return <DatePicker style={{ width: '100%' }} disabled={field.disabled} />;
    case 'switch':
      return <Switch disabled={field.disabled} />;
    case 'radio':
      return <Radio.Group disabled={field.disabled}>{field.options?.map(o => <Radio key={o.value} value={o.value}>{o.label}</Radio>)}</Radio.Group>;
    case 'checkbox':
      return <Checkbox.Group disabled={field.disabled} options={field.options?.map(o => ({ label: o.label, value: o.value }))} />;
    default:
      return <Input />;
  }
}

interface CanvasFieldProps {
  field: FieldSchema;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onCopy: () => void;
  /** 拖拽中时强制单列 */
  forceFullWidth: boolean;
}

const CanvasField: React.FC<CanvasFieldProps> = React.memo(({
  field, isSelected, onSelect, onDelete, onCopy, forceFullWidth,
}) => {
  const rules: any[] = [];
  if (field.rules?.required) rules.push({ required: true, message: `${field.label}不能为空` });

  const widthPercent = forceFullWidth ? '100%' : `calc(${((field.span || 24) / 24) * 100}% - 8px)`;

  return (
    <div style={{ width: widthPercent, flexShrink: 0, margin: '0 4px' }}>
      <SortableCanvasField id={field.id}>
        <div
          className="field-wrapper"
          onClick={onSelect}
          style={{
            position: 'relative',
            padding: '4px 8px',
            margin: '0 0 4px 0',
            borderRadius: 6,
            border: isSelected ? '2px solid #1677ff' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: isSelected ? 'rgba(22,119,255,0.02)' : undefined,
          }}
        >
          {/* 选中时的操作按钮 */}
          <div
            className="field-actions"
            style={{
              position: 'absolute', top: '50%', right: -32,
              transform: 'translateY(-50%)',
              display: isSelected ? 'flex' : 'none',
              flexDirection: 'column', gap: 2, zIndex: 10,
              background: '#1677ff', borderRadius: '0 6px 6px 0',
              padding: '4px 3px',
            }}
          >
            <Tooltip title="复制" placement="right" mouseEnterDelay={0.5}>
              <Button type="text" size="small"
                icon={<CopyOutlined style={{ fontSize: 12, color: '#fff' }} />}
                onClick={e => { e.stopPropagation(); onCopy(); }}
                style={{ width: 22, height: 22, minWidth: 22 }} />
            </Tooltip>
            <Tooltip title="删除" placement="right" mouseEnterDelay={0.5}>
              <Button type="text" size="small"
                icon={<DeleteOutlined style={{ fontSize: 12, color: '#fff' }} />}
                onClick={e => { e.stopPropagation(); onDelete(); }}
                style={{ width: 22, height: 22, minWidth: 22 }} />
            </Tooltip>
          </div>

          <Form.Item
            label={field.label}
            name={field.name}
            rules={rules}
            valuePropName={field.type === 'switch' ? 'checked' : 'value'}
            initialValue={field.defaultValue}
            style={{ marginBottom: 8 }}
          >
            {renderField(field)}
          </Form.Item>
        </div>
      </SortableCanvasField>
    </div>
  );
});

CanvasField.displayName = 'CanvasField';

interface Props {
  schema: FormSchema;
  selectedId: string | null;
  isDragging: boolean;
  onSelectField: (id: string) => void;
  onDeleteField: (id: string) => void;
  onCopyField: (id: string) => void;
}

/**
 * 预览区画布渲染器
 *
 * 和 SchemaRenderer 的区别：
 * - 每个字段可拖拽排序（Notion 风格手柄）
 * - 拖拽时自动切单列（Fillout/钉钉宜搭风格）
 * - 让位动画平滑（Squarespace 风格）
 */
const CanvasRenderer: React.FC<Props> = ({
  schema, selectedId, isDragging,
  onSelectField, onDeleteField, onCopyField,
}) => {
  const [form] = Form.useForm();

  useEffect(() => { form.resetFields(); }, [form, schema.fields.length]);

  if (schema.fields.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
        <Empty description="从左侧拖入组件，或点击添加" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginBottom: 24, fontSize: 16, fontWeight: 600 }}>{schema.title || '表单预览'}</h3>
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: schema.labelCol || 6 }}
        wrapperCol={{ span: 24 - (schema.labelCol || 6) }}
      >
        <SortableContext items={schema.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {schema.fields.map(field => (
              <CanvasField
                key={field.id}
                field={field}
                isSelected={selectedId === field.id}
                forceFullWidth={isDragging}
                onSelect={() => onSelectField(field.id)}
                onDelete={() => onDeleteField(field.id)}
                onCopy={() => onCopyField(field.id)}
              />
            ))}
          </div>
        </SortableContext>
      </Form>
    </div>
  );
};

export default CanvasRenderer;
