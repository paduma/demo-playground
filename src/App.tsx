import React, { useState, Suspense, lazy } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Spin, theme } from 'antd';
import {
  AuditOutlined, SafetyCertificateOutlined, TableOutlined,
  ApartmentOutlined, FolderOutlined, BellOutlined,
  DatabaseOutlined, HighlightOutlined, ColumnWidthOutlined,
  KeyOutlined, AppstoreOutlined, CloudDownloadOutlined,
  FormOutlined, BranchesOutlined,
} from '@ant-design/icons';

// 路由懒加载
const ApprovalTemplateDemo = lazy(() => import('./demos/approval-template'));
const FormBuilderDemo = lazy(() => import('./demos/form-builder'));
const ReduxFormBuilderDemo = lazy(() => import('./demos/redux-form-builder'));
const FlowDesignerDemo = lazy(() => import('./demos/flow-designer'));
const ConfigurableTableDemo = lazy(() => import('./demos/configurable-table'));
const OrgTreeDemo = lazy(() => import('./demos/org-tree'));
const RbacDemo = lazy(() => import('./demos/rbac'));
const FileManagerDemo = lazy(() => import('./demos/file-manager'));
const NotificationDemo = lazy(() => import('./demos/notification'));
const VirtualEditableTableDemo = lazy(() => import('./demos/virtual-table'));
const TextHighlightDemo = lazy(() => import('./demos/text-highlight'));
const ResizableTableDemo = lazy(() => import('./demos/resizable-table'));
const RequestDemo = lazy(() => import('./demos/request'));
const BatchDownloadDemo = lazy(() => import('./demos/batch-download'));

const { Sider, Content } = Layout;

const menuItems = [
  {
    key: 'grp-designer',
    label: '设计器 / 编辑器',
    type: 'group' as const,
    children: [
      { key: 'approval-template', icon: <AuditOutlined />, label: <Link to="/approval-template">审批模板设计器</Link> },
      { key: 'flow-designer', icon: <BranchesOutlined />, label: <Link to="/flow-designer">流程设计器</Link> },
      { key: 'form-builder', icon: <FormOutlined />, label: <Link to="/form-builder">表单配置器</Link> },
      { key: 'redux-form-builder', icon: <AppstoreOutlined />, label: <Link to="/redux-form-builder">表单设计器(Redux)</Link> },
    ],
  },
  { type: 'divider' as const, key: 'div-1' },
  {
    key: 'grp-business',
    label: '业务场景',
    type: 'group' as const,
    children: [
      { key: 'rbac', icon: <SafetyCertificateOutlined />, label: <Link to="/rbac">权限管理</Link> },
      { key: 'org-tree', icon: <ApartmentOutlined />, label: <Link to="/org-tree">组织架构</Link> },
      { key: 'file-manager', icon: <FolderOutlined />, label: <Link to="/file-manager">文件管理器</Link> },
      { key: 'notification', icon: <BellOutlined />, label: <Link to="/notification">消息通知</Link> },
    ],
  },
  { type: 'divider' as const, key: 'div-2' },
  {
    key: 'grp-engineering',
    label: '工程方案',
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
        height: '100vh',
        overflow: 'hidden',
      }}>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        }>
          <Routes>
            <Route path="/approval-template" element={<ApprovalTemplateDemo />} />
            <Route path="/flow-designer" element={<FlowDesignerDemo />} />
            <Route path="/form-builder" element={<FormBuilderDemo />} />
            <Route path="/redux-form-builder" element={<ReduxFormBuilderDemo />} />
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
        </Suspense>
      </Content>
    </Layout>
  );
};

export default App;
