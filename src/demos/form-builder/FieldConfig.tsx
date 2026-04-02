import React from 'react';
import { Form, Input, InputNumber, Switch, Select, Button, Divider, Space, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { FieldSchema, FieldOption } from './types';
import { FIELD_TEMPLATES } from './types';

interface Props {
  field: FieldSchema;
  onChange: (updated: FieldSchema) => void;
  onDelete: () => void;
  nameConflict?: boolean;
}

const SPAN_OPTIONS = [
  { label: '整行 (24)', value: 24 },
  { label: '半行 (12)', value: 12 },
  { label: '1/3 行 (8)', value: 8 },
  { label: '1/4 行 (6)', value: 6 },
];

const FieldConfig: React.FC<Props> = ({ field, onChange, onDelete, nameConflict }) => {
  const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);

  const updateField = (patch: Partial<FieldSchema>) => {
    onChange({ ...field, ...patch });
  };

  const updateRule = (patch: Partial<NonNullable<FieldSchema['rules']>>) => {
    onChange({ ...field, rules: { ...field.rules, ...patch } });
  };

  const updateOption = (index: number, patch: Partial<FieldOption>) => {
    const opts = [...(field.options || [])];
    opts[index] = { ...opts[index], ...patch };
    onChange({ ...field, options: opts });
  };

  const addOption = () => {
    const opts = [...(field.options || [])];
    const n = opts.length + 1;
    opts.push({ label: `选项${n}`, value: `opt${n}` });
    onChange({ ...field, options: opts });
  };

  const removeOption = (index: number) => {
    const opts = (field.options || []).filter((_, i) => i !== index);
    onChange({ ...field, options: opts });
  };


  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{field.label}</span>
          <Tag color="processing">{FIELD_TEMPLATES.find(t => t.type === field.type)?.label || field.type}</Tag>
        </Space>
        <Button danger size="small" icon={<DeleteOutlined />} onClick={onDelete}>
          删除
        </Button>
      </div>

      <Form layout="vertical" size="small">
        <Form.Item label="标签名">
          <Input value={field.label} onChange={e => updateField({ label: e.target.value })} />
        </Form.Item>

        <Form.Item
          label="字段名 (name)"
          validateStatus={nameConflict ? 'error' : undefined}
          help={nameConflict ? '字段名与其他字段重复' : undefined}
        >
          <Input value={field.name} onChange={e => updateField({ name: e.target.value })} />
        </Form.Item>

        <Form.Item label="占位提示">
          <Input
            value={field.placeholder}
            onChange={e => updateField({ placeholder: e.target.value })}
            placeholder="请输入 placeholder"
          />
        </Form.Item>

        <Form.Item label="栅格宽度">
          <Select value={field.span || 24} onChange={v => updateField({ span: v })} options={SPAN_OPTIONS} />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        <Form.Item label="必填">
          <Switch
            checked={field.rules?.required}
            onChange={v => updateRule({ required: v })}
          />
        </Form.Item>

        <Space style={{ width: '100%' }} direction="vertical" size={0}>
          <Form.Item label="禁用" style={{ marginBottom: 8 }}>
            <Switch checked={!!field.disabled} onChange={v => updateField({ disabled: v })} />
          </Form.Item>
          <Form.Item label="只读" style={{ marginBottom: 8 }}>
            <Switch checked={!!field.readonly} onChange={v => updateField({ readonly: v })} />
          </Form.Item>
        </Space>

        {field.type === 'number' && (
          <Space>
            <Form.Item label="最小值">
              <InputNumber value={field.rules?.min} onChange={v => updateRule({ min: v ?? undefined })} />
            </Form.Item>
            <Form.Item label="最大值">
              <InputNumber value={field.rules?.max} onChange={v => updateRule({ max: v ?? undefined })} />
            </Form.Item>
          </Space>
        )}

        {(field.type === 'input' || field.type === 'textarea') && (
          <>
            <Form.Item label="正则校验">
              <Input
                value={field.rules?.pattern}
                onChange={e => updateRule({ pattern: e.target.value })}
                placeholder="如: ^[a-zA-Z]+$"
              />
            </Form.Item>
            {field.rules?.pattern && (
              <Form.Item label="校验失败提示">
                <Input
                  value={field.rules?.message}
                  onChange={e => updateRule({ message: e.target.value })}
                  placeholder="格式不正确"
                />
              </Form.Item>
            )}
          </>
        )}

        {hasOptions && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ marginBottom: 8, fontWeight: 500 }}>选项列表</div>
            {field.options?.map((opt, i) => (
              <Space key={i} style={{ display: 'flex', marginBottom: 8 }} align="center">
                <Input
                  value={opt.label}
                  onChange={e => updateOption(i, { label: e.target.value })}
                  placeholder="标签"
                  style={{ width: 90 }}
                />
                <Input
                  value={opt.value}
                  onChange={e => updateOption(i, { value: e.target.value })}
                  placeholder="值"
                  style={{ width: 80 }}
                />
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeOption(i)}
                  disabled={(field.options?.length || 0) <= 1}
                />
              </Space>
            ))}
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addOption} block>
              添加选项
            </Button>
          </>
        )}
      </Form>
    </div>
  );
};

export default FieldConfig;
