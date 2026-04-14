import React from 'react';
import { Card } from 'antd';
import ResizableTable from './ResizableTable';
import type { ResizableColumnType } from './ResizableTable';
import './resizable.css';

interface DataType {
  key: string;
  name: string;
  department: string;
  role: string;
  email: string;
  status: string;
}

const dataSource: DataType[] = Array.from({ length: 20 }, (_, i) => ({
  key: String(i),
  name: `员工 ${i + 1}`,
  department: ['技术部', '产品部', '运营部', '市场部'][i % 4],
  role: ['开发', '测试', '产品经理', '设计师'][i % 4],
  email: `user${i + 1}@example.com`,
  status: i % 3 === 0 ? '在职' : i % 3 === 1 ? '休假' : '出差',
}));

const columns: ResizableColumnType<DataType>[] = [
  { key: 'name', title: '姓名', dataIndex: 'name', label: '姓名', width: 120 },
  { key: 'department', title: '部门', dataIndex: 'department', label: '部门', width: 120 },
  { key: 'role', title: '角色', dataIndex: 'role', label: '角色', width: 120 },
  { key: 'email', title: '邮箱', dataIndex: 'email', label: '邮箱', width: 200 },
  { key: 'status', title: '状态', dataIndex: 'status', label: '状态', width: 100 },
];

const ResizableTableDemo: React.FC = () => (
  <Card title="可拖拽列宽 + 列配置持久化">
    <p style={{ color: '#666', marginBottom: 16 }}>
      拖拽表头边缘调整列宽，点击"自定义列"控制列显隐。设置自动保存到 localStorage，刷新页面后恢复。
    </p>
    <ResizableTable<DataType>
      tableId="demo-resizable"
      columns={columns}
      dataSource={dataSource}
      pagination={{ pageSize: 10 }}
    />
  </Card>
);

export default ResizableTableDemo;
