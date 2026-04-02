import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { Layout, Menu } from 'antd';
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

const { Sider, Content } = Layout;

const menuItems = [
  { key: 'approval-template', label: <Link to="/approval-template">审批模板设计器</Link> },
  { key: 'rbac', label: <Link to="/rbac">权限管理可视化</Link> },
  { key: 'configurable-table', label: <Link to="/configurable-table">可配置表格表头</Link> },
  { key: 'org-tree', label: <Link to="/org-tree">树形组织架构</Link> },
  { key: 'file-manager', label: <Link to="/file-manager">文件管理器</Link> },
  { key: 'notification', label: <Link to="/notification">消息通知中心</Link> },
  { key: 'virtual-table', label: <Link to="/virtual-table">虚拟滚动可编辑表格</Link> },
  { key: 'text-highlight', label: <Link to="/text-highlight">多关键词文本高亮</Link> },
  { key: 'resizable-table', label: <Link to="/resizable-table">可拖拽列宽表格</Link> },
  { key: 'request', label: <Link to="/request">Token 自动刷新</Link> },
];

const App: React.FC = () => (
  <Layout style={{ minHeight: '100vh' }}>
    <Sider width={240} style={{ background: '#fff' }}>
      <h2 style={{ padding: '16px', textAlign: 'center', margin: 0 }}>Toolkit Demo</h2>
      <Menu mode="inline" defaultSelectedKeys={['virtual-table']} items={menuItems} />
    </Sider>
    <Content style={{ padding: 24, background: '#f5f5f5' }}>
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
        <Route path="*" element={<Navigate to="/approval-template" replace />} />
      </Routes>
    </Content>
  </Layout>
);

export default App;
