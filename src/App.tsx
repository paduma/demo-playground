import React, { useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import {
  AuditOutlined, SafetyCertificateOutlined, TableOutlined,
  ApartmentOutlined, FolderOutlined, BellOutlined,
  DatabaseOutlined, HighlightOutlined, ColumnWidthOutlined,
  KeyOutlined, AppstoreOutlined, CloudDownloadOutlined,
} from '@ant-design/icons';
import VirtualEditableTableDemo from './demos/VirtualEditableTableDemo';
import TextHighlightDemo from './demos/TextHighlightDemo';
import ResizableTableDemo from './demos/ResizableTableDemo';
import RequestDemo from './demos/RequestDemo';
import FormBuilderDemo from './demos/FormBuilderDemo';
import ApprovalTemplateDemo from './demos/ApprovalTemplateDemo';
import ConfigurableTableDemo from './demos/ConfigurableTableDemo';
import OrgTreeDemo from './demos/OrgTreeDemo';
import RbacDemo from './demos/RbacDemo';
import FileManagerDemo from './demos/FileManagerDemo';
import NotificationDemo from './demos/NotificationDemo';
import BatchDownloadDemo from './demos/BatchDownloadDemo';

const { Sider, Content } = Layout;

const menuItems = [
  {
    key: 'grp-product',
    label: '产品形态',
    type: 'group' as const,
    children: [
      { key: 'approval-template', icon: <AuditOutlined />, label: <Link to="/approval-template">审批模板设计器</Link> },
      { key: 'rbac', icon: <SafetyCertificateOutlined />, label: <Link to="/rbac">权限管理</Link> },
      { key: 'org-tree', icon: <ApartmentOutlined />, label: <Link to="/org-tree">组织架构</Link> },
      { key: 'file-manager', icon: <FolderOutlined />, label: <Link to="/file-manager">文件管理器</Link> },
      { key: 'notification', icon: <BellOutlined />, label: <Link to="/notification">消息通知</Link> },
    ],
  },
  {
    key: 'grp-engineering',
    label: '工程难点',
    type: 'group' as const,
    children: [
      { key: 'configurable-table', icon: <TableOutlined />, label: <Link to="/configurable-table">可配置表格</Link> },
      { key: 'virtual-table', icon: <DatabaseOutlined />, label: <Link to="/virtual-table">虚拟滚动表格</Link> },
      { key: 'text-highlight', icon: <HighlightOutlined />, label: <Link to="/text-highlight">文本高亮</Link> },
      { key: 'resizable-table', icon: <ColumnWidthOutlined />, label: <Link to="/resizable-table">拖拽列宽</Link> },
      { key: 'request', icon: <KeyOutlined />, label: <Link to="/request">Token 刷新</Link> },
      { key: 'batch-download', icon: <CloudDownloadOutlined />, label: <Link to="/batch-download">批量下载</Link> },
    ],
  },
];

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { token: { colorBgContainer } } = theme.useToken();

  // Derive selected key from current path
  const selectedKey = location.pathname.replace('/', '') || 'approval-template';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        collapsedWidth={56}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          background: colorBgContainer,
          borderRight: '1px solid #f0f0f0',
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
        }}
        theme="light"
      >
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          gap: 8,
        }}>
          <AppstoreOutlined style={{ fontSize: 18, color: '#1677ff' }} />
          {!collapsed && <span style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>Toolkit Demo</span>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ border: 'none', fontSize: 13 }}
        />
      </Sider>
      <Content style={{
        padding: 20,
        background: '#f5f5f5',
        minHeight: '100vh',
        overflow: 'auto',
      }}>
        <Routes>
          <Route path="/approval-template" element={<ApprovalTemplateDemo />} />
          <Route path="/form-builder" element={<FormBuilderDemo />} />
          <Route path="/configurable-table" element={<ConfigurableTableDemo />} />
          <Route path="/org-tree" element={<OrgTreeDemo />} />
          <Route path="/rbac" element={<RbacDemo />} />
          <Route path="/file-manager" element={<FileManagerDemo />} />
          <Route path="/notification" element={<NotificationDemo />} />
          <Route path="/virtual-table" element={<VirtualEditableTableDemo />} />
          <Route path="/text-highlight" element={<TextHighlightDemo />} />
          <Route path="/resizable-table" element={<ResizableTableDemo />} />
          <Route path="/request" element={<RequestDemo />} />
          <Route path="/batch-download" element={<BatchDownloadDemo />} />
          <Route path="*" element={<Navigate to="/approval-template" replace />} />
        </Routes>
      </Content>
    </Layout>
  );
};

export default App;
