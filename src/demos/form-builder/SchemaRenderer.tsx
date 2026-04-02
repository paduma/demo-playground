import React, { useEffect } from 'react';
import {
  Form, Input, InputNumber, Select, DatePicker,
  Switch, Radio, Checkbox, Button, Col, Row, Empty, Tooltip, Modal,
} from 'antd';
import { DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import type { FormSchema, FieldSchema } from './types';

/** 根据字段 schema 渲染对应的 antd 组件 */
function renderField(field: FieldSchema): React.ReactNode {
  const d = field.disabled;
  const r = field.readonly;
  switch (field.type) {
    case 'input':
      return <Input placeholder={field.placeholder || `请输入${field.label}`} disabled={d} readOnly={r} />;
    case 'textarea':
      return <Input.TextArea rows={3} placeholder={field.placeholder || `请输入${field.label}`} disabled={d} readOnly={r} />;
    case 'number':
      return (
        <InputNumber
          style={{ width: '100%' }}
          min={field.rules?.min}
          max={field.rules?.max}
          placeholder={field.placeholder || `请输入${field.label}`}
          disabled={d}
          readOnly={r}
        />
      );
    case 'select':
      return (
        <Select placeholder={field.placeholder || `请选择${field.label}`} disabled={d}>
          {field.options?.map(opt => (
            <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
          ))}
        </Select>
      );
    case 'date':
      return <DatePicker style={{ width: '100%' }} disabled={d} />;
    case 'switch':
      return <Switch disabled={d} />;
    case 'radio':
      return (
        <Radio.Group disabled={d}>
          {field.options?.map(opt => (
            <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
          ))}
        </Radio.Group>
      );
    case 'checkbox':
      return (
        <Checkbox.Group
          disabled={d}
          options={field.options?.map(opt => ({ label: opt.label, value: opt.value }))}
        />
      );
    default:
      return <Input />;
  }
}


/** 构建 antd Form.Item 的 rules */
function buildRules(field: FieldSchema) {
  const rules: Record<string, unknown>[] = [];
  if (field.rules?.required) {
    rules.push({ required: true, message: `${field.label}不能为空` });
  }
  if (field.rules?.pattern) {
    try {
      rules.push({ pattern: new RegExp(field.rules.pattern), message: field.rules.message || '格式不正确' });
    } catch { /* ignore invalid regex */ }
  }
  return rules;
}

interface Props {
  schema: FormSchema;
  selectedId?: string | null;
  onSelectField?: (id: string) => void;
  onDeleteField?: (id: string) => void;
  onCopyField?: (id: string) => void;
}

const SchemaRenderer: React.FC<Props> = ({ schema, selectedId, onSelectField, onDeleteField, onCopyField }) => {
  const [form] = Form.useForm();

  // 字段变化时重置表单，解决 initialValue 不更新的问题
  useEffect(() => {
    form.resetFields();
  }, [form, schema.fields.length]);

  const handleSubmit = () => {
    form.validateFields().then(values => {
      Modal.info({
        title: '表单提交数据',
        width: 520,
        content: (
          <pre style={{ maxHeight: 400, overflow: 'auto', fontSize: 12, background: '#fafafa', padding: 12, borderRadius: 6 }}>
            {JSON.stringify(values, null, 2)}
          </pre>
        ),
      });
    });
  };

  if (schema.fields.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Empty description="从左侧点击组件添加字段" />
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
        <Row gutter={16}>
          {schema.fields.map(field => {
            const isSelected = selectedId === field.id;
            return (
              <Col key={field.id} span={field.span || 24}>
                <div
                  className="field-wrapper"
                  onClick={() => onSelectField?.(field.id)}
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
                  {/* hover / 选中时显示操作按钮 */}
                  <div
                    className="field-actions"
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      display: 'none',
                      gap: 2,
                      zIndex: 10,
                    }}
                  >
                    <Tooltip title="复制字段" mouseEnterDelay={0.5}>
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined style={{ fontSize: 12 }} />}
                        onClick={e => { e.stopPropagation(); onCopyField?.(field.id); }}
                        style={{ width: 24, height: 24, minWidth: 24 }}
                      />
                    </Tooltip>
                    <Tooltip title="删除字段" mouseEnterDelay={0.5}>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                        onClick={e => { e.stopPropagation(); onDeleteField?.(field.id); }}
                        style={{ width: 24, height: 24, minWidth: 24 }}
                      />
                    </Tooltip>
                  </div>
                  <Form.Item
                    label={field.label}
                    name={field.name}
                    rules={buildRules(field)}
                    valuePropName={field.type === 'switch' ? 'checked' : 'value'}
                    initialValue={field.defaultValue}
                    style={{ marginBottom: 8 }}
                  >
                    {renderField(field)}
                  </Form.Item>
                </div>
              </Col>
            );
          })}
        </Row>
        <Form.Item wrapperCol={{ offset: schema.labelCol || 6 }}>
          <Button type="primary" onClick={handleSubmit}>
            提交
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={() => form.resetFields()}>
            重置
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SchemaRenderer;
