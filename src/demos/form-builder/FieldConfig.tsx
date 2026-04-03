import React from 'react';
import { Form, Input, InputNumber, Switch, Select, Button, Divider, Space, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { FieldSchema, FieldOption, LinkageRule, LinkageCondition, LinkageAction, LinkageOperator } from './types';
import { FIELD_TEMPLATES } from './types';

interface Props {
  field: FieldSchema;
  onChange: (updated: FieldSchema) => void;
  onDelete: () => void;
  allFields?: FieldSchema[];  // 所有字段列表，用于联动配置中选择依赖字段
  nameConflict?: boolean;
}

const SPAN_OPTIONS = [
  { label: '整行 (24)', value: 24 },
  { label: '半行 (12)', value: 12 },
  { label: '1/3 行 (8)', value: 8 },
  { label: '1/4 行 (6)', value: 6 },
];

const FieldConfig: React.FC<Props> = ({ field, onChange, onDelete, nameConflict, allFields = [] }) => {
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

        {/* 联动规则配置 */}
        <Divider style={{ margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 500 }}>联动规则</span>
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              const newRule: LinkageRule = {
                conditions: [{ field: '', operator: '==', value: '' }],
                actions: [{ type: 'visible', visible: true }],
              };
              onChange({ ...field, linkages: [...(field.linkages || []), newRule] });
            }}
          >
            添加规则
          </Button>
        </div>
        {(!field.linkages || field.linkages.length === 0) && (
          <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
            暂无联动规则。添加后可控制字段的显隐、必填、禁用、选项。
          </div>
        )}
        {field.linkages?.map((rule, ruleIdx) => {
          const updateCondition = (condIdx: number, patch: Partial<LinkageCondition>) => {
            const newLinkages = [...(field.linkages || [])];
            const newConditions = [...newLinkages[ruleIdx].conditions];
            newConditions[condIdx] = { ...newConditions[condIdx], ...patch };
            newLinkages[ruleIdx] = { ...newLinkages[ruleIdx], conditions: newConditions };
            onChange({ ...field, linkages: newLinkages });
          };
          const updateAction = (actIdx: number, action: LinkageAction) => {
            const newLinkages = [...(field.linkages || [])];
            const newActions = [...newLinkages[ruleIdx].actions];
            newActions[actIdx] = action;
            newLinkages[ruleIdx] = { ...newLinkages[ruleIdx], actions: newActions };
            onChange({ ...field, linkages: newLinkages });
          };
          const removeRule = () => {
            onChange({ ...field, linkages: field.linkages?.filter((_, i) => i !== ruleIdx) });
          };

          // 可选的依赖字段（排除自身）
          const otherFields = allFields.filter(f => f.name !== field.name);

          return (
            <div key={ruleIdx} style={{
              border: '1px solid #f0f0f0', borderRadius: 6, padding: 8, marginBottom: 8, background: '#fafafa',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Tag color="blue" style={{ fontSize: 11 }}>规则 {ruleIdx + 1}</Tag>
                <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={removeRule} />
              </div>

              {/* 条件 */}
              {rule.conditions.map((cond, condIdx) => (
                <Space key={condIdx} style={{ display: 'flex', marginBottom: 4 }} size={4}>
                  <Select
                    size="small"
                    style={{ width: 90 }}
                    placeholder="字段"
                    value={cond.field || undefined}
                    onChange={v => updateCondition(condIdx, { field: v })}
                    options={otherFields.map(f => ({ label: f.label, value: f.name }))}
                  />
                  <Select
                    size="small"
                    style={{ width: 72 }}
                    value={cond.operator}
                    onChange={v => updateCondition(condIdx, { operator: v as LinkageOperator })}
                    options={[
                      { label: '等于', value: '==' },
                      { label: '不等于', value: '!=' },
                      { label: '包含', value: 'in' },
                      { label: '为空', value: 'empty' },
                      { label: '非空', value: 'notEmpty' },
                    ]}
                  />
                  {!['empty', 'notEmpty'].includes(cond.operator) && (
                    <Input
                      size="small"
                      style={{ width: 70 }}
                      placeholder="值"
                      value={String(cond.value ?? '')}
                      onChange={e => updateCondition(condIdx, { value: e.target.value })}
                    />
                  )}
                </Space>
              ))}

              {/* 动作 */}
              {rule.actions.map((action, actIdx) => (
                <Space key={actIdx} style={{ display: 'flex', marginTop: 4 }} size={4}>
                  <span style={{ fontSize: 11, color: '#999' }}>则</span>
                  <Select
                    size="small"
                    style={{ width: 80 }}
                    value={action.type}
                    onChange={v => {
                      const defaults: Record<string, LinkageAction> = {
                        visible: { type: 'visible', visible: true },
                        required: { type: 'required', required: true },
                        disabled: { type: 'disabled', disabled: true },
                        options: { type: 'options', options: [] },
                      };
                      updateAction(actIdx, defaults[v] || { type: 'visible', visible: true });
                    }}
                    options={[
                      { label: '显示', value: 'visible' },
                      { label: '必填', value: 'required' },
                      { label: '禁用', value: 'disabled' },
                      { label: '选项', value: 'options' },
                    ]}
                  />
                  {action.type === 'visible' && <Tag color="green">显示此字段</Tag>}
                  {action.type === 'required' && <Tag color="orange">设为必填</Tag>}
                  {action.type === 'disabled' && <Tag color="default">设为禁用</Tag>}
                  {action.type === 'options' && <Tag color="blue">替换选项</Tag>}
                </Space>
              ))}
            </div>
          );
        })}
      </Form>
    </div>
  );
};

export default FieldConfig;
