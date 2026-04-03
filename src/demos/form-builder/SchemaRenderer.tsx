import React, { useEffect, useMemo, useRef } from 'react';
import {
  Form, Input, InputNumber, Select, DatePicker,
  Switch, Radio, Checkbox, Button, Col, Row, Empty, Tooltip, Modal,
} from 'antd';
import { DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import type { FormSchema, FieldSchema, FieldOption, LinkageRule, LinkageAction, LinkageCondition } from './types';

// --- 联动引擎 ---

// 判断单个条件是否满足（宽松比较，处理 string/number 类型不匹配）
function looseEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // string vs number 宽松比较
  if (typeof a === 'number' && typeof b === 'string') return a === Number(b);
  if (typeof a === 'string' && typeof b === 'number') return Number(a) === b;
  return String(a) === String(b);
}

function evalCondition(condition: LinkageCondition, formValues: Record<string, unknown>): boolean {
  const val = formValues[condition.field];
  switch (condition.operator) {
    case '==': return looseEqual(val, condition.value);
    case '!=': return !looseEqual(val, condition.value);
    case 'in': return Array.isArray(condition.value) && condition.value.some(v => looseEqual(val, v));
    case 'notIn': return Array.isArray(condition.value) && !condition.value.some(v => looseEqual(val, v));
    case 'empty': return val === undefined || val === null || val === '';
    case 'notEmpty': return val !== undefined && val !== null && val !== '';
    default: return false;
  }
}

// 判断一条联动规则是否激活（所有条件 AND）
function isRuleActive(rule: LinkageRule, formValues: Record<string, unknown>): boolean {
  return rule.conditions.every(c => evalCondition(c, formValues));
}

// 计算字段的联动结果
interface LinkageResult {
  visible: boolean;
  required: boolean;
  disabled: boolean;
  options?: FieldOption[];
}

function computeLinkage(field: FieldSchema, formValues: Record<string, unknown>): LinkageResult {
  const result: LinkageResult = {
    visible: !field.linkages || field.linkages.length === 0, // 没有联动规则的字段默认可见
    required: !!field.rules?.required,
    disabled: !!field.disabled,
    options: field.options,
  };

  if (!field.linkages) return result;

  // 有联动规则的字段默认隐藏，只有规则激活时才显示
  let hasVisibilityRule = false;
  let anyVisibilityActive = false;

  for (const rule of field.linkages) {
    const active = isRuleActive(rule, formValues);
    for (const action of rule.actions) {
      if (action.type === 'visible') {
        hasVisibilityRule = true;
        if (active) anyVisibilityActive = true;
      }
      if (!active) continue;
      switch (action.type) {
        case 'required': result.required = action.required; break;
        case 'disabled': result.disabled = action.disabled; break;
        case 'options': result.options = action.options; break;
      }
    }
  }

  if (hasVisibilityRule) {
    result.visible = anyVisibilityActive;
  }

  return result;
}

// --- 联动感知的字段包装组件 ---

const LinkedField: React.FC<{
  field: FieldSchema;
  isSelected: boolean;
  schema: FormSchema;
  onSelectField?: (id: string) => void;
  onDeleteField?: (id: string) => void;
  onCopyField?: (id: string) => void;
}> = ({ field, isSelected, schema, onSelectField, onDeleteField, onCopyField }) => {
  const form = Form.useFormInstance();

  // 收集当前字段依赖的所有字段 name
  const depNames = useMemo(
    () => [...new Set(field.linkages?.flatMap(r => r.conditions.map(c => c.field)) || [])],
    [field.linkages],
  );

  // 用 useWatch 监听依赖字段的值
  const depValues = Form.useWatch(depNames.length > 0 ? depNames : ['__noop__'], form) || {};

  // 构建 formValues 对象
  const formValues = useMemo(() => {
    if (depNames.length === 0) return {};
    const values: Record<string, unknown> = {};
    depNames.forEach((name, i) => {
      values[name] = Array.isArray(depValues) ? depValues[i] : depValues?.[name];
    });
    return values;
  }, [depNames, depValues]);

  const linkage = computeLinkage(field, formValues);

  // 字段从可见变为隐藏时，清空表单值防止提交脏数据
  const prevVisibleRef = useRef(linkage.visible);
  useEffect(() => {
    if (prevVisibleRef.current && !linkage.visible) {
      form.setFieldValue(field.name, undefined);
    }
    prevVisibleRef.current = linkage.visible;
  }, [linkage.visible, field.name, form]);

  if (!linkage.visible) return null;

  // 动态构建 rules
  const rules: Record<string, unknown>[] = [];
  if (linkage.required) {
    rules.push({ required: true, message: `${field.label}不能为空` });
  }
  if (field.rules?.pattern) {
    try {
      rules.push({ pattern: new RegExp(field.rules.pattern), message: field.rules.message || '格式不正确' });
    } catch { /* ignore */ }
  }

  return (
    <Col span={field.span || 24}>
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
        <div
          className="field-actions"
          style={{ position: 'absolute', top: 4, right: 4, display: 'none', gap: 2, zIndex: 10 }}
        >
          <Tooltip title="复制字段" mouseEnterDelay={0.5}>
            <Button type="text" size="small"
              icon={<CopyOutlined style={{ fontSize: 12 }} />}
              onClick={e => { e.stopPropagation(); onCopyField?.(field.id); }}
              style={{ width: 24, height: 24, minWidth: 24 }} />
          </Tooltip>
          <Tooltip title="删除字段" mouseEnterDelay={0.5}>
            <Button type="text" danger size="small"
              icon={<DeleteOutlined style={{ fontSize: 12 }} />}
              onClick={e => { e.stopPropagation(); onDeleteField?.(field.id); }}
              style={{ width: 24, height: 24, minWidth: 24 }} />
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
          {renderField(field, linkage)}
        </Form.Item>
      </div>
    </Col>
  );
};

// 根据字段 schema + 联动结果渲染对应的 antd 组件
function renderField(field: FieldSchema, linkage?: LinkageResult): React.ReactNode {
  const d = linkage?.disabled ?? field.disabled;
  const r = field.readonly;
  const opts = linkage?.options ?? field.options;
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
          {opts?.map(opt => (
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
          {opts?.map(opt => (
            <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
          ))}
        </Radio.Group>
      );
    case 'checkbox':
      return (
        <Checkbox.Group
          disabled={d}
          options={opts?.map(opt => ({ label: opt.label, value: opt.value }))}
        />
      );
    default:
      return <Input />;
  }
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
          {schema.fields.map(field => (
            <LinkedField
              key={field.id}
              field={field}
              isSelected={selectedId === field.id}
              schema={schema}
              onSelectField={onSelectField}
              onDeleteField={onDeleteField}
              onCopyField={onCopyField}
            />
          ))}
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
