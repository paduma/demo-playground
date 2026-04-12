import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Form, Input, InputNumber, Select, DatePicker,
  Switch, Radio, Checkbox, Button, Col, Row, Empty,
  Card, Result, Typography, Space, Tag, Alert, Modal,
} from 'antd';
import { CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { FormSchema, FieldSchema, FieldOption, LinkageRule, LinkageCondition, LinkageAction } from './types';

const { Text, Paragraph } = Typography;

// --- 联动引擎（复用 SchemaRenderer 的逻辑） ---

function looseEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
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

function isRuleActive(rule: LinkageRule, formValues: Record<string, unknown>): boolean {
  return rule.conditions.every(c => evalCondition(c, formValues));
}

interface LinkageResult {
  visible: boolean;
  required: boolean;
  disabled: boolean;
  options?: FieldOption[];
}

function computeLinkage(field: FieldSchema, formValues: Record<string, unknown>): LinkageResult {
  const result: LinkageResult = {
    visible: !field.linkages || field.linkages.length === 0,
    required: !!field.rules?.required,
    disabled: !!field.disabled,
    options: field.options,
  };
  if (!field.linkages) return result;

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
  if (hasVisibilityRule) result.visible = anyVisibilityActive;
  return result;
}

// --- 运行时字段组件 ---

const RuntimeField: React.FC<{ field: FieldSchema }> = ({ field }) => {
  const form = Form.useFormInstance();
  const depNames = useMemo(
    () => [...new Set(field.linkages?.flatMap(r => r.conditions.map(c => c.field)) || [])],
    [field.linkages],
  );
  const depValues = Form.useWatch(depNames.length > 0 ? depNames : ['__noop__'], form) || {};

  const formValues = useMemo(() => {
    if (depNames.length === 0) return {};
    const values: Record<string, unknown> = {};
    depNames.forEach((name, i) => {
      values[name] = Array.isArray(depValues) ? depValues[i] : depValues?.[name];
    });
    return values;
  }, [depNames, depValues]);

  const linkage = computeLinkage(field, formValues);

  const prevVisibleRef = useRef(linkage.visible);
  useEffect(() => {
    if (prevVisibleRef.current && !linkage.visible) {
      form.setFieldValue(field.name, undefined);
    }
    prevVisibleRef.current = linkage.visible;
  }, [linkage.visible, field.name, form]);

  if (!linkage.visible) return null;

  const rules: Record<string, unknown>[] = [];
  if (linkage.required) rules.push({ required: true, message: `${field.label}不能为空` });
  if (field.rules?.pattern) {
    try { rules.push({ pattern: new RegExp(field.rules.pattern), message: field.rules.message || '格式不正确' }); } catch { }
  }

  const d = linkage.disabled;
  const opts = linkage.options ?? field.options;

  let control: React.ReactNode;
  switch (field.type) {
    case 'input': control = <Input placeholder={field.placeholder || `请输入${field.label}`} disabled={d} readOnly={field.readonly} />; break;
    case 'textarea': control = <Input.TextArea rows={3} placeholder={field.placeholder || `请输入${field.label}`} disabled={d} readOnly={field.readonly} />; break;
    case 'number': control = <InputNumber style={{ width: '100%' }} min={field.rules?.min} max={field.rules?.max} placeholder={field.placeholder} disabled={d} />; break;
    case 'select': control = <Select placeholder={field.placeholder || `请选择${field.label}`} disabled={d} options={opts?.map(o => ({ label: o.label, value: o.value }))} />; break;
    case 'date': control = <DatePicker style={{ width: '100%' }} disabled={d} />; break;
    case 'switch': control = <Switch disabled={d} />; break;
    case 'radio': control = <Radio.Group disabled={d}>{opts?.map(o => <Radio key={o.value} value={o.value}>{o.label}</Radio>)}</Radio.Group>; break;
    case 'checkbox': control = <Checkbox.Group disabled={d} options={opts?.map(o => ({ label: o.label, value: o.value }))} />; break;
    default: control = <Input />;
  }

  return (
    <Col span={field.span || 24}>
      <Form.Item
        label={field.label}
        name={field.name}
        rules={rules}
        valuePropName={field.type === 'switch' ? 'checked' : 'value'}
        initialValue={field.defaultValue}
      >
        {control}
      </Form.Item>
    </Col>
  );
};

// --- 主组件 ---

interface Props {
  schema: FormSchema;
}

const FormPreview: React.FC<Props> = ({ schema }) => {
  const [form] = Form.useForm();
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    form.resetFields();
    setSubmitted(false);
    setSubmittedData(null);
  }, [form, schema]);

  const linkedFieldCount = useMemo(
    () => schema.fields.filter(f => f.linkages && f.linkages.length > 0).length,
    [schema.fields],
  );

  if (schema.fields.length === 0) {
    return <Empty description="暂无字段，请先在编辑模式中添加" />;
  }

  const handleSubmit = () => {
    form.validateFields().then(values => {
      // 过滤掉 undefined 值
      const cleaned = Object.fromEntries(
        Object.entries(values).filter(([_, v]) => v !== undefined && v !== null)
      );
      setSubmittedData(cleaned);
      setSubmitted(true);
    });
  };

  const handleReset = () => {
    form.resetFields();
    setSubmitted(false);
    setSubmittedData(null);
  };

  if (submitted && submittedData) {
    return (
      <div style={{ padding: 24 }}>
        <Result
          status="success"
          title="表单提交成功"
          subTitle="以下是提交的数据"
          extra={[
            <Button key="back" icon={<ReloadOutlined />} onClick={handleReset}>
              重新填写
            </Button>,
          ]}
        />
        <Card size="small" title="提交数据" style={{ maxWidth: 600, margin: '0 auto' }}>
          <pre style={{ fontSize: 12, lineHeight: 1.8, margin: 0 }}>
            {JSON.stringify(submittedData, null, 2)}
          </pre>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {linkedFieldCount > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              此表单包含 <Tag color="blue">{linkedFieldCount}</Tag> 个联动字段，
              填写时部分字段会根据条件动态显隐/变化。
            </span>
          }
        />
      )}

      <Card title={schema.title || '表单填写'}>
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ span: schema.labelCol || 6 }}
          wrapperCol={{ span: 24 - (schema.labelCol || 6) }}
        >
          <Row gutter={16}>
            {schema.fields.map(field => (
              <RuntimeField key={field.id} field={field} />
            ))}
          </Row>
          <Form.Item wrapperCol={{ offset: schema.labelCol || 6 }}>
            <Space>
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleSubmit}>
                提交
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default FormPreview;
