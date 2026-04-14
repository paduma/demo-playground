import React from 'react';
import { Typography, Tag } from 'antd';
import FlowDesigner from './FlowDesigner';
import type { FieldSchema } from '../form-builder/types';

const { Title, Paragraph } = Typography;

/**
 * 独立的流程设计器 Demo
 * 展示：SVG 画布、节点拖拽、贝塞尔连线、条件分支编排
 */

/** 模拟表单字段，供条件分支引用 */
const MOCK_FORM_FIELDS: FieldSchema[] = [
  { id: 'f1', type: 'input', label: '申请人', name: 'applicant', rules: { required: true } },
  {
    id: 'f2', type: 'select', label: '请假类型', name: 'leaveType', options: [
      { label: '年假', value: 'annual' }, { label: '病假', value: 'sick' }, { label: '事假', value: 'personal' },
    ]
  },
  { id: 'f3', type: 'number', label: '请假天数', name: 'days', rules: { min: 0.5, max: 30 } },
  { id: 'f4', type: 'number', label: '金额', name: 'amount', rules: { min: 0 } },
  {
    id: 'f5', type: 'select', label: '部门', name: 'department', options: [
      { label: '技术部', value: 'tech' }, { label: '产品部', value: 'product' },
    ]
  },
];

const FlowDesignerDemo: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Title level={4} style={{ margin: 0 }}>流程设计器</Title>
        <Tag color="blue">SVG 画布</Tag>
        <Tag color="green">节点拖拽</Tag>
        <Tag color="orange">条件分支</Tag>
      </div>
      <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
        拖拽节点编排审批流程，条件分支可引用表单字段。双击节点编辑属性。
      </Paragraph>
      <FlowDesigner formFields={MOCK_FORM_FIELDS} />
    </div>
  );
};

export default FlowDesignerDemo;
