import React, { useState, useCallback, useMemo } from 'react';
import { Tabs, Card, Typography, Tag, Button, Space, message } from 'antd';
import { ApartmentOutlined, FormOutlined, EyeOutlined } from '@ant-design/icons';
import type { FormSchema } from '../form-builder/types';
import { FORM_TEMPLATES } from '../form-builder/types';
import SchemaRenderer from '../form-builder/SchemaRenderer';
import FlowDesigner from '../flow-designer/FlowDesigner';

const { Title, Paragraph, Text } = Typography;

/**
 * 审批模板设计器 — 组合演示
 *
 * 展示 FormBuilder 的 schema 输出 + FlowDesigner 的流程编排如何协作：
 * - 表单字段被流程的条件分支引用
 * - 整体构成一个完整的审批模板
 *
 * 不再内嵌完整的表单编辑逻辑，而是引用预设模板展示协作关系。
 */

const APPROVAL_TEMPLATES = [
  {
    key: 'leave',
    label: '请假审批',
    schema: {
      title: '请假申请',
      labelCol: 6,
      fields: [
        { id: 'f1', type: 'input' as const, label: '申请人', name: 'applicant', span: 12, rules: { required: true } },
        {
          id: 'f2', type: 'select' as const, label: '请假类型', name: 'leaveType', span: 12, rules: { required: true }, options: [
            { label: '年假', value: 'annual' }, { label: '事假', value: 'personal' }, { label: '病假', value: 'sick' },
          ]
        },
        { id: 'f3', type: 'date' as const, label: '开始日期', name: 'startDate', span: 12, rules: { required: true } },
        { id: 'f4', type: 'date' as const, label: '结束日期', name: 'endDate', span: 12, rules: { required: true } },
        { id: 'f5', type: 'number' as const, label: '请假天数', name: 'days', span: 12, rules: { required: true, min: 0.5, max: 30 } },
        { id: 'f6', type: 'textarea' as const, label: '请假事由', name: 'reason', rules: { required: true } },
      ],
    },
  },
  {
    key: 'expense',
    label: '报销审批',
    schema: {
      title: '费用报销',
      labelCol: 6,
      fields: [
        { id: 'e1', type: 'input' as const, label: '申请人', name: 'applicant', span: 12, rules: { required: true } },
        {
          id: 'e2', type: 'select' as const, label: '费用类型', name: 'expenseType', span: 12, rules: { required: true }, options: [
            { label: '差旅', value: 'travel' }, { label: '办公', value: 'office' }, { label: '招待', value: 'entertainment' },
          ]
        },
        { id: 'e3', type: 'number' as const, label: '金额', name: 'amount', span: 12, rules: { required: true, min: 0 } },
        { id: 'e4', type: 'date' as const, label: '发生日期', name: 'date', span: 12, rules: { required: true } },
        { id: 'e5', type: 'textarea' as const, label: '说明', name: 'description', rules: { required: true } },
      ],
    },
  },
];

const ApprovalTemplateDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTemplate, setSelectedTemplate] = useState(APPROVAL_TEMPLATES[0]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, marginBottom: 8 }}>审批模板设计器</Title>
        <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
          组合演示：表单 Schema 配置 + 流程编排协作。条件分支可引用表单字段实现动态路由。
        </Paragraph>
      </div>

      {/* 模板选择 */}
      <Space style={{ marginBottom: 16 }}>
        {APPROVAL_TEMPLATES.map(t => (
          <Button
            key={t.key}
            type={selectedTemplate.key === t.key ? 'primary' : 'default'}
            onClick={() => setSelectedTemplate(t)}
          >
            {t.label}
          </Button>
        ))}
      </Space>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'overview',
            label: <span><EyeOutlined style={{ marginRight: 6 }} />表单预览</span>,
            children: (
              <Card title={
                <span>
                  {selectedTemplate.schema.title}
                  <Tag color="green" style={{ marginLeft: 8 }}>{selectedTemplate.schema.fields.length} 个字段</Tag>
                </span>
              }>
                <SchemaRenderer
                  schema={selectedTemplate.schema}
                  selectedId={null}
                  onSelectField={() => { }}
                  onDeleteField={() => { }}
                  onCopyField={() => { }}
                />
                <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 6, fontSize: 12 }}>
                  <Text type="secondary">
                    💡 提示：完整的表单编辑功能请前往「Schema 表单配置器」或「Redux 表单设计器」demo。
                    此处展示表单与流程的协作关系。
                  </Text>
                </div>
              </Card>
            ),
          },
          {
            key: 'flow',
            label: (
              <span>
                <ApartmentOutlined style={{ marginRight: 6 }} />
                流程设计
                <Tag color="blue" style={{ marginLeft: 6, fontSize: 11 }}>
                  {selectedTemplate.schema.fields.length} 字段可引用
                </Tag>
              </span>
            ),
            children: <FlowDesigner formFields={selectedTemplate.schema.fields} />,
          },
        ]}
      />
    </div>
  );
};

export default ApprovalTemplateDemo;
