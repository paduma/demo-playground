import React, { useState, useCallback, useMemo } from 'react';
import {
  Card, Tree, Table, Checkbox, Button, Space, Typography, Tag, Input,
  Modal, Form, message, Tooltip, Badge, Empty, Popconfirm, Divider,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined,
  SafetyCertificateOutlined, CopyOutlined, UserOutlined,
} from '@ant-design/icons';
import type { Role, MenuItem, ActionType } from './rbac/types';
import { MENU_TREE, ACTION_LABELS, DEFAULT_ROLES, collectAllKeys, collectLeafKeys } from './rbac/types';
import type { DataNode } from 'antd/es/tree';

const { Text } = Typography;

const ALL_ACTIONS: ActionType[] = ['view', 'create', 'edit', 'delete', 'export', 'import'];

/** 将 MenuItem 转为 antd Tree 的 DataNode */
function toTreeData(items: MenuItem[]): DataNode[] {
  return items.map(item => ({
    key: item.key,
    title: `${item.icon ? item.icon + ' ' : ''}${item.label}`,
    children: item.children ? toTreeData(item.children) : undefined,
  }));
}

/** 扁平化菜单（只取叶子节点，用于按钮权限矩阵） */
function flattenLeaves(items: MenuItem[], parentLabel = ''): { key: string; label: string; fullLabel: string }[] {
  const result: { key: string; label: string; fullLabel: string }[] = [];
  for (const item of items) {
    const full = parentLabel ? `${parentLabel} / ${item.label}` : item.label;
    if (item.children && item.children.length > 0) {
      result.push(...flattenLeaves(item.children, full));
    } else {
      result.push({ key: item.key, label: item.label, fullLabel: full });
    }
  }
  return result;
}

const treeData = toTreeData(MENU_TREE);
const allMenuKeys = collectAllKeys(MENU_TREE);
const leafMenus = flattenLeaves(MENU_TREE);

const RbacDemo: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('admin');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [roleForm] = Form.useForm();

  const currentRole = useMemo(() => roles.find(r => r.id === selectedRoleId) || null, [roles, selectedRoleId]);

  /* ── 菜单权限变更 ── */
  const handleMenuCheck = useCallback((checkedKeys: React.Key[]) => {
    setRoles(prev => prev.map(r =>
      r.id === selectedRoleId ? { ...r, menuKeys: checkedKeys as string[] } : r
    ));
    setDirty(true);
  }, [selectedRoleId]);

  /* ── 按钮权限变更 ── */
  const toggleAction = useCallback((menuKey: string, action: ActionType) => {
    setRoles(prev => prev.map(r => {
      if (r.id !== selectedRoleId) return r;
      const current = r.actionMap[menuKey] || [];
      const has = current.includes(action);
      const next = has ? current.filter(a => a !== action) : [...current, action];
      return { ...r, actionMap: { ...r.actionMap, [menuKey]: next } };
    }));
    setDirty(true);
  }, [selectedRoleId]);

  /* ── 行全选/全不选 ── */
  const toggleRowAll = useCallback((menuKey: string) => {
    setRoles(prev => prev.map(r => {
      if (r.id !== selectedRoleId) return r;
      const current = r.actionMap[menuKey] || [];
      const allChecked = ALL_ACTIONS.every(a => current.includes(a));
      return { ...r, actionMap: { ...r.actionMap, [menuKey]: allChecked ? [] : [...ALL_ACTIONS] } };
    }));
    setDirty(true);
  }, [selectedRoleId]);

  /* ── 列全选/全不选 ── */
  const toggleColAll = useCallback((action: ActionType) => {
    setRoles(prev => prev.map(r => {
      if (r.id !== selectedRoleId) return r;
      const visibleLeaves = leafMenus.filter(m => r.menuKeys.includes(m.key));
      const allChecked = visibleLeaves.every(m => (r.actionMap[m.key] || []).includes(action));
      const newMap = { ...r.actionMap };
      for (const m of visibleLeaves) {
        const current = newMap[m.key] || [];
        if (allChecked) {
          newMap[m.key] = current.filter(a => a !== action);
        } else if (!current.includes(action)) {
          newMap[m.key] = [...current, action];
        }
      }
      return { ...r, actionMap: newMap };
    }));
    setDirty(true);
  }, [selectedRoleId]);

  /* ── 保存 ── */
  const handleSave = useCallback(() => {
    message.success(`角色「${currentRole?.name}」权限已保存（模拟）`);
    setDirty(false);
  }, [currentRole]);

  /* ── 角色 CRUD ── */
  const openAddRole = useCallback(() => {
    setEditingRoleId(null);
    roleForm.resetFields();
    setRoleModalOpen(true);
  }, [roleForm]);

  const openEditRole = useCallback((role: Role) => {
    setEditingRoleId(role.id);
    roleForm.setFieldsValue({ name: role.name, description: role.description });
    setRoleModalOpen(true);
  }, [roleForm]);

  const handleRoleSave = useCallback(() => {
    roleForm.validateFields().then(values => {
      if (editingRoleId) {
        setRoles(prev => prev.map(r => r.id === editingRoleId ? { ...r, ...values } : r));
        message.success('角色已更新');
      } else {
        const newRole: Role = {
          id: `role-${Date.now()}`,
          name: values.name,
          description: values.description || '',
          menuKeys: ['dashboard'],
          actionMap: {},
        };
        setRoles(prev => [...prev, newRole]);
        setSelectedRoleId(newRole.id);
        message.success('角色已创建');
      }
      setRoleModalOpen(false);
    });
  }, [roleForm, editingRoleId]);

  const deleteRole = useCallback((id: string) => {
    setRoles(prev => prev.filter(r => r.id !== id));
    if (selectedRoleId === id) {
      setSelectedRoleId(roles[0]?.id || '');
    }
    message.success('角色已删除');
  }, [selectedRoleId, roles]);

  const copyRole = useCallback((role: Role) => {
    const newRole: Role = {
      ...JSON.parse(JSON.stringify(role)),
      id: `role-${Date.now()}`,
      name: `${role.name}(副本)`,
    };
    setRoles(prev => [...prev, newRole]);
    setSelectedRoleId(newRole.id);
    message.success('角色已复制');
  }, []);

  /* ── 按钮权限矩阵：只显示已勾选菜单的叶子节点 ── */
  const visibleLeaves = useMemo(() => {
    if (!currentRole) return [];
    return leafMenus.filter(m => currentRole.menuKeys.includes(m.key));
  }, [currentRole]);

  const matrixColumns = useMemo(() => {
    const cols: any[] = [
      {
        title: '菜单',
        dataIndex: 'fullLabel',
        width: 200,
        fixed: 'left' as const,
        render: (text: string) => <Text style={{ fontSize: 13 }}>{text}</Text>,
      },
      {
        title: (
          <Tooltip title="行全选切换">
            <span>全选</span>
          </Tooltip>
        ),
        width: 60,
        dataIndex: 'key',
        render: (menuKey: string) => {
          const actions = currentRole?.actionMap[menuKey] || [];
          const allChecked = ALL_ACTIONS.every(a => actions.includes(a));
          const someChecked = actions.length > 0 && !allChecked;
          return (
            <Checkbox
              checked={allChecked}
              indeterminate={someChecked}
              onChange={() => toggleRowAll(menuKey)}
            />
          );
        },
      },
    ];

    for (const action of ALL_ACTIONS) {
      const allChecked = visibleLeaves.length > 0 && visibleLeaves.every(m => (currentRole?.actionMap[m.key] || []).includes(action));
      const someChecked = visibleLeaves.some(m => (currentRole?.actionMap[m.key] || []).includes(action)) && !allChecked;

      cols.push({
        title: (
          <Space direction="vertical" size={0} style={{ textAlign: 'center' }}>
            <span>{ACTION_LABELS[action]}</span>
            <Checkbox
              checked={allChecked}
              indeterminate={someChecked}
              onChange={() => toggleColAll(action)}
              style={{ marginTop: 2 }}
            />
          </Space>
        ),
        width: 80,
        align: 'center' as const,
        render: (_: unknown, record: { key: string }) => {
          const actions = currentRole?.actionMap[record.key] || [];
          return (
            <Checkbox
              checked={actions.includes(action)}
              onChange={() => toggleAction(record.key, action)}
            />
          );
        },
      });
    }

    return cols;
  }, [currentRole, visibleLeaves, toggleAction, toggleRowAll, toggleColAll]);

  /* ── 统计 ── */
  const menuCount = currentRole?.menuKeys.length || 0;
  const actionCount = currentRole ? Object.values(currentRole.actionMap).reduce((sum, arr) => sum + arr.length, 0) : 0;

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 64px)' }}>

      {/* ── 左侧：角色列表 ── */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card size="small" title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>角色列表</span>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddRole}>新增</Button>
          </div>
        } style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {roles.map(role => (
              <div
                key={role.id}
                onClick={() => { setSelectedRoleId(role.id); setDirty(false); }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  border: selectedRoleId === role.id ? '1px solid #1677ff' : '1px solid #f0f0f0',
                  background: selectedRoleId === role.id ? '#e6f4ff' : '#fff',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size={4}>
                    <SafetyCertificateOutlined style={{ color: selectedRoleId === role.id ? '#1677ff' : '#999' }} />
                    <Text strong style={{ fontSize: 13 }}>{role.name}</Text>
                  </Space>
                  <Space size={2}>
                    <Tooltip title="编辑">
                      <Button type="text" size="small" icon={<EditOutlined style={{ fontSize: 12 }} />}
                        onClick={e => { e.stopPropagation(); openEditRole(role); }} />
                    </Tooltip>
                    <Tooltip title="复制">
                      <Button type="text" size="small" icon={<CopyOutlined style={{ fontSize: 12 }} />}
                        onClick={e => { e.stopPropagation(); copyRole(role); }} />
                    </Tooltip>
                    {role.id !== 'admin' && (
                      <Popconfirm title={`删除角色「${role.name}」？`} onConfirm={() => deleteRole(role.id)} okText="删除" okType="danger">
                        <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                          onClick={e => e.stopPropagation()} />
                      </Popconfirm>
                    )}
                  </Space>
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>{role.description}</Text>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── 中间：菜单权限树 ── */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card size="small" title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>菜单权限</span>
            <Tag color="blue">{menuCount}/{allMenuKeys.length}</Tag>
          </div>
        } style={{ flex: 1, overflow: 'auto' }}>
          {currentRole ? (
            <Tree
              checkable
              defaultExpandAll
              checkedKeys={currentRole.menuKeys}
              onCheck={(checked) => handleMenuCheck(Array.isArray(checked) ? checked : checked.checked)}
              treeData={treeData}
              style={{ fontSize: 13 }}
            />
          ) : (
            <Empty description="请选择角色" />
          )}
        </Card>
      </div>

      {/* ── 右侧：按钮权限矩阵 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 工具栏 */}
        <Card size="small" styles={{ body: { padding: '8px 16px' } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              {currentRole && (
                <>
                  <UserOutlined />
                  <Text strong>{currentRole.name}</Text>
                  <Divider type="vertical" />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {menuCount} 个菜单 · {actionCount} 个操作权限
                  </Text>
                  {dirty && <Tag color="warning">未保存</Tag>}
                </>
              )}
            </Space>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} disabled={!dirty}>
              保存配置
            </Button>
          </div>
        </Card>

        {/* 矩阵表格 */}
        <Card size="small" title="按钮级权限" style={{ flex: 1, overflow: 'auto' }}
          styles={{ body: { padding: 0 } }}>
          {visibleLeaves.length > 0 ? (
            <Table
              columns={matrixColumns}
              dataSource={visibleLeaves}
              rowKey="key"
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 'max-content' }}
            />
          ) : (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Empty description={currentRole ? '请先在左侧勾选菜单权限' : '请选择角色'} />
            </div>
          )}
        </Card>
      </div>

      {/* ── 角色编辑弹窗 ── */}
      <Modal
        title={editingRoleId ? '编辑角色' : '新增角色'}
        open={roleModalOpen}
        onOk={handleRoleSave}
        onCancel={() => setRoleModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={400}
      >
        <Form form={roleForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="角色名称" name="name" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="如：销售经理" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="角色描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RbacDemo;
