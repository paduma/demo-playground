import React, { useState } from 'react';
import { Card, message, Tag, Rate, Switch } from 'antd';
import VirtualEditableTable from '@/components/VirtualEditableTable';
import type { EditableColumnProps } from '@/components/VirtualEditableTable';

interface AdType {
  key: string;
  adName: string;
  budget: number;
  channel: string;
  status: string;
  quality: number;
  enabled: boolean;
  landingUrl: string;
  isNew?: boolean;
}

const channels = [
  { label: '信息流', value: '信息流' },
  { label: '搜索广告', value: '搜索广告' },
  { label: '开屏广告', value: '开屏广告' },
  { label: '激励视频', value: '激励视频' },
  { label: '横幅广告', value: '横幅广告' },
];

const statusOptions = [
  { label: '投放中', value: '投放中' },
  { label: '审核中', value: '审核中' },
  { label: '已暂停', value: '已暂停' },
  { label: '已拒绝', value: '已拒绝' },
];

const statusColorMap: Record<string, string> = {
  '投放中': 'green',
  '审核中': 'blue',
  '已暂停': 'default',
  '已拒绝': 'red',
};

const generateAds = (count: number): AdType[] =>
  Array.from({ length: count }, (_, i) => ({
    key: String(i),
    adName: `广告计划 ${i + 1}`,
    budget: +(Math.random() * 10000 + 100).toFixed(2),
    channel: channels[i % channels.length].value,
    status: statusOptions[i % statusOptions.length].value,
    quality: (i % 5) + 1,
    enabled: i % 3 !== 0,
    landingUrl: `https://example.com/landing/${i + 1}`,
  }));

const columns: EditableColumnProps<AdType>[] = [
  { title: '广告名称', dataIndex: 'adName', editable: true, width: 150 },
  {
    title: '日预算 (¥)',
    dataIndex: 'budget',
    editable: true,
    inputType: { type: 'number', min: 0, precision: 2 },
    width: 120,
    render: (val: number) => `¥${val.toFixed(2)}`,
  },
  {
    title: '投放渠道',
    dataIndex: 'channel',
    editable: true,
    inputType: { type: 'select', options: channels },
    width: 120,
    render: (val: string) => <Tag color="blue">{val}</Tag>,
  },
  {
    title: '投放状态',
    dataIndex: 'status',
    editable: true,
    inputType: { type: 'select', options: statusOptions },
    width: 100,
    render: (val: string) => <Tag color={statusColorMap[val]}>{val}</Tag>,
  },
  {
    title: '素材质量',
    dataIndex: 'quality',
    editable: true,
    inputType: {
      type: 'custom',
      renderInput: () => <Rate style={{ fontSize: 14 }} />,
    },
    width: 160,
    render: (val: number) => <Rate disabled value={val} style={{ fontSize: 14 }} />,
  },
  {
    title: '启用',
    dataIndex: 'enabled',
    editable: true,
    inputType: {
      type: 'custom',
      renderInput: () => <Switch />,
    },
    width: 80,
    render: (val: boolean) => (
      <Tag color={val ? 'green' : 'default'}>{val ? '开' : '关'}</Tag>
    ),
  },
  { title: '落地页 URL', dataIndex: 'landingUrl', editable: true, width: 240 },
];

const VirtualEditableTableDemo: React.FC = () => {
  const [data] = useState(() => generateAds(200));

  const handleSave = async (record: AdType) => {
    message.success(`已保存: ${record.adName}`);
    return true;
  };

  return (
    <Card title="广告计划批量编辑">
      <p style={{ marginBottom: 16, color: '#666' }}>
        模拟广告后台管理场景，200 条广告计划虚拟滚动渲染。支持文本、预算（数字）、渠道/状态（下拉）、素材质量（Rate）、启用开关（Switch）等多种编辑类型。
        编辑某行后滚动再滚回来，编辑中的数据不会丢失。
      </p>
      <VirtualEditableTable<AdType>
        dataSource={data}
        columns={columns}
        onSave={handleSave}
        allowAddRow
        scrollY={600}
      />
    </Card>
  );
};

export default VirtualEditableTableDemo;
