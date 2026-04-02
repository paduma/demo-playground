import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Card, Input, Button, Space, Typography, Tag, Tooltip, Dropdown, Modal,
  Form, Select, Empty, message, Badge,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, ExpandAltOutlined, ShrinkOutlined,
  EditOutlined, DeleteOutlined, CopyOutlined, UserAddOutlined,
  FolderAddOutlined, DownOutlined, RightOutlined, LoadingOutlined,
  TeamOutlined, ApartmentOutlined,
} from '@ant-design/icons';
import type { OrgNode, OrgNodeType } from './org-tree/types';
import { NODE_ICONS, NODE_COLORS } from './org-tree/types';
import { MOCK_ORG_TREE, fetchChildren } from './org-tree/mock-data';
import {
  findInForest, findParentInForest, collectAllIds,
  updateNodeInForest, removeFromForest, searchMatchedIds,
} from '@/utils/tree';

const { Text } = Typography;

// --- 单个树节点组件 ---

interface TreeNodeProps {
  node: OrgNode;
  depth: number;
  expanded: Set<string>;
  selectedId: string | null;
  searchKeyword: string;
  matchedIds: Set<string>;
  loadingIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, node: OrgNode) => void;
}

const TreeNodeItem: React.FC<TreeNodeProps> = ({
  node, depth, expanded, selectedId, searchKeyword, matchedIds,
  loadingIds, onToggle, onSelect, onContextMenu,
}) => {
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const isLoading = loadingIds.has(node.id);
  const hasChildren = (node.children && node.children.length > 0) || node.hasChildren;
  const isSearching = searchKeyword.length > 0;
  const isMatched = matchedIds.has(node.id);

  // 搜索时隐藏不匹配的节点
  if (isSearching && !isMatched) return null;

  // 高亮搜索关键词
  const highlightName = (text: string) => {
    if (!searchKeyword) return text;
    const idx = text.toLowerCase().indexOf(searchKeyword);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span style={{ background: '#fff566', padding: '0 1px', borderRadius: 2 }}>
          {text.slice(idx, idx + searchKeyword.length)}
        </span>
        {text.slice(idx + searchKeyword.length)}
      </>
    );
  };

  return (
    <>
      <div
        onClick={() => onSelect(node.id)}
        onContextMenu={e => onContextMenu(e, node)}
        onDoubleClick={() => hasChildren && onToggle(node.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          paddingLeft: 8 + depth * 20,
          cursor: 'pointer',
          borderRadius: 6,
          background: isSelected ? '#e6f4ff' : undefined,
          borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
          transition: 'all 0.15s',
          fontSize: 13,
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ''; }}
      >
        {/* 展开/折叠箭头 */}
        <span
          style={{ width: 16, display: 'flex', justifyContent: 'center', flexShrink: 0 }}
          onClick={e => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
        >
          {isLoading ? (
            <LoadingOutlined style={{ fontSize: 12, color: '#1677ff' }} />
          ) : hasChildren ? (
            isExpanded
              ? <DownOutlined style={{ fontSize: 10, color: '#999' }} />
              : <RightOutlined style={{ fontSize: 10, color: '#999' }} />
          ) : null}
        </span>

        {/* 图标 */}
        <span style={{ fontSize: 14, flexShrink: 0 }}>{NODE_ICONS[node.type]}</span>

        {/* 名称 */}
        <span style={{
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', fontWeight: node.type === 'company' ? 600 : 400,
        }}>
          {highlightName(node.name)}
        </span>

        {/* 人数标签 */}
        {node.memberCount !== undefined && (
          <Tag
            style={{ fontSize: 11, lineHeight: '18px', padding: '0 4px', margin: 0 }}
            color={NODE_COLORS[node.type]}
          >
            {node.memberCount}人
          </Tag>
        )}

        {/* 职位 */}
        {node.title && (
          <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>{node.title}</Text>
        )}
      </div>

      {/* 递归渲染子节点 */}
      {isExpanded && node.children?.map(child => (
        <TreeNodeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          selectedId={selectedId}
          searchKeyword={searchKeyword}
          matchedIds={matchedIds}
          loadingIds={loadingIds}
          onToggle={onToggle}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
        />
      ))}
    </>
  );
};

// 节点类型中文映射
const NODE_TYPE_LABELS: Record<OrgNodeType, string> = {
  company: '公司',
  department: '部门',
  team: '小组',
  person: '人员',
};

// --- 主组件 ---

const OrgTreeDemo: React.FC = () => {
  const [tree, setTree] = useState<OrgNode[]>(() =>
    JSON.parse(JSON.stringify(MOCK_ORG_TREE)),
  );
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(['root', 'dept-tech']),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addType, setAddType] = useState<OrgNodeType>('department');

  // 右键菜单和编辑/添加弹窗的目标节点
  const [contextNode, setContextNode] = useState<OrgNode | null>(null);

  const [editForm] = Form.useForm();
  const [addForm] = Form.useForm();
  const treeRef = useRef<HTMLDivElement>(null);

  // --- 派生数据 ---

  const selectedNode = useMemo(
    () => (selectedId ? findInForest(tree, selectedId) : null),
    [tree, selectedId],
  );

  const keyword = searchKeyword.trim().toLowerCase();

  const matchedIds = useMemo(
    () => (keyword
      ? searchMatchedIds<OrgNode>(tree, node =>
        node.name.toLowerCase().includes(keyword) ||
        (node.title != null && node.title.toLowerCase().includes(keyword)))
      : new Set<string>()),
    [tree, keyword],
  );

  // 搜索时自动展开匹配节点
  const effectiveExpanded = useMemo(() => {
    if (!keyword) return expanded;
    return new Set([...expanded, ...matchedIds]);
  }, [expanded, keyword, matchedIds]);

  // --- 展开/折叠（含懒加载） ---

  const handleToggle = useCallback(async (id: string) => {
    const node = findInForest(tree, id);
    if (!node) return;

    // 懒加载：有子节点标记但尚未加载
    if (node.hasChildren && !node.children) {
      setLoadingIds(prev => new Set([...prev, id]));
      const children = await fetchChildren(id);
      setTree(prev =>
        updateNodeInForest<OrgNode>(prev, id, n => ({ ...n, children, hasChildren: false })),
      );
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setExpanded(prev => new Set([...prev, id]));
      return;
    }

    // 普通展开/折叠
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [tree]);

  const expandAll = useCallback(() => {
    setExpanded(new Set(collectAllIds(tree)));
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  // --- 右键菜单 ---

  const handleContextMenu = useCallback((e: React.MouseEvent, node: OrgNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextNode(node);
    setSelectedId(node.id);
  }, []);

  // 构建右键菜单项，基于传入的 node 而非 contextNode state
  const buildContextMenuItems = useCallback((node: OrgNode) => {
    const items: any[] = [];

    if (node.type !== 'person') {
      items.push(
        {
          key: 'add-dept',
          label: '添加子部门',
          icon: <FolderAddOutlined />,
          onClick: () => {
            setContextNode(node);
            setAddType('department');
            addForm.resetFields();
            setAddModalOpen(true);
          },
        },
        {
          key: 'add-person',
          label: '添加成员',
          icon: <UserAddOutlined />,
          onClick: () => {
            setContextNode(node);
            setAddType('person');
            addForm.resetFields();
            setAddModalOpen(true);
          },
        },
      );
    }

    items.push(
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => {
          setContextNode(node);
          editForm.setFieldsValue({ name: node.name, title: node.title || '' });
          setEditModalOpen(true);
        },
      },
      {
        key: 'copy',
        label: '复制名称',
        icon: <CopyOutlined />,
        onClick: () => {
          navigator.clipboard.writeText(node.name).then(() => message.success('已复制'));
        },
      },
    );

    if (node.id !== 'root') {
      items.push(
        { type: 'divider' },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => {
            Modal.confirm({
              title: '确认删除',
              content: `确定删除「${node.name}」${node.children?.length ? '及其所有子节点' : ''}？`,
              okText: '删除',
              okType: 'danger',
              onOk: () => {
                setTree(prev => removeFromForest(prev, node.id));
                setSelectedId(prev => (prev === node.id ? null : prev));
                message.success('已删除');
              },
            });
          },
        },
      );
    }

    return items;
  }, [editForm, addForm]);

  // --- 编辑保存 ---

  const handleEditSave = useCallback(() => {
    editForm.validateFields().then(values => {
      setTree(prev =>
        updateNodeInForest<OrgNode>(prev, contextNode!.id, node => ({
          ...node,
          name: values.name,
          title: node.type === 'person' ? values.title : node.title,
        })),
      );
      setEditModalOpen(false);
      message.success('已保存');
    });
  }, [editForm, contextNode]);

  // --- 添加节点 ---

  const handleAddSave = useCallback(() => {
    addForm.validateFields().then(values => {
      const newNode: OrgNode = {
        id: `node-${Date.now()}`,
        name: values.name,
        type: addType,
        title: addType === 'person' ? values.title : undefined,
        memberCount: addType !== 'person' ? 0 : undefined,
      };
      setTree(prev =>
        updateNodeInForest<OrgNode>(prev, contextNode!.id, parent => ({
          ...parent,
          children: [...(parent.children || []), newNode],
        })),
      );
      setExpanded(prev => new Set([...prev, contextNode!.id]));
      setAddModalOpen(false);
      setSelectedId(newNode.id);
      message.success('已添加');
    });
  }, [addForm, addType, contextNode]);

  // --- 统计 ---

  const stats = useMemo(() => {
    let depts = 0;
    let teams = 0;
    let persons = 0;
    const walk = (nodes: OrgNode[]) => {
      for (const node of nodes) {
        if (node.type === 'department') depts++;
        else if (node.type === 'team') teams++;
        else if (node.type === 'person') persons++;
        if (node.children) walk(node.children);
      }
    };
    walk(tree);
    return { depts, teams, persons };
  }, [tree]);

  // --- 渲染 ---

  const renderTreeNodes = useCallback((nodes: OrgNode[], depth: number) => {
    return nodes.map(node => {
      const isSearching = keyword.length > 0;
      const isMatched = matchedIds.has(node.id);
      if (isSearching && !isMatched) return null;

      return (
        <Dropdown
          key={node.id}
          menu={{ items: buildContextMenuItems(node) }}
          trigger={['contextMenu']}
        >
          <div>
            <TreeNodeItem
              node={node}
              depth={depth}
              expanded={effectiveExpanded}
              selectedId={selectedId}
              searchKeyword={keyword}
              matchedIds={matchedIds}
              loadingIds={loadingIds}
              onToggle={handleToggle}
              onSelect={setSelectedId}
              onContextMenu={handleContextMenu}
            />
          </div>
        </Dropdown>
      );
    });
  }, [keyword, matchedIds, buildContextMenuItems, effectiveExpanded, selectedId, loadingIds, handleToggle, handleContextMenu]);

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 64px)' }}>

      {/* 左侧：组织架构树 */}
      <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 搜索 + 工具栏 */}
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Input
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              placeholder="搜索部门或人员..."
              allowClear
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space size={4}>
                <Tag icon={<ApartmentOutlined />} color="purple">{stats.depts} 部门</Tag>
                <Tag icon={<TeamOutlined />} color="cyan">{stats.teams} 小组</Tag>
                <Tag color="green">{stats.persons} 人</Tag>
              </Space>
              <Space size={4}>
                <Tooltip title="展开全部">
                  <Button size="small" type="text" icon={<ExpandAltOutlined />} onClick={expandAll} />
                </Tooltip>
                <Tooltip title="折叠全部">
                  <Button size="small" type="text" icon={<ShrinkOutlined />} onClick={collapseAll} />
                </Tooltip>
              </Space>
            </div>
          </Space>
        </Card>

        {/* 树 */}
        <Card
          size="small"
          style={{ flex: 1, overflow: 'auto' }}
          styles={{ body: { padding: '8px 4px' } }}
        >
          <div ref={treeRef}>
            {tree.length === 0 ? (
              <Empty description="暂无组织数据" />
            ) : keyword && matchedIds.size === 0 ? (
              <Empty
                description={`未找到「${searchKeyword}」相关结果`}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              renderTreeNodes(tree, 0)
            )}
          </div>
        </Card>
      </div>

      {/* 右侧：详情面板 */}
      <Card style={{ flex: 1 }} styles={{ body: { padding: 24 } }}>
        {selectedNode ? (
          <div>
            {/* 头部 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: `${NODE_COLORS[selectedNode.type]}15`,
                border: `2px solid ${NODE_COLORS[selectedNode.type]}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>
                {NODE_ICONS[selectedNode.type]}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{selectedNode.name}</div>
                <Space size={4}>
                  <Tag color={NODE_COLORS[selectedNode.type]}>
                    {NODE_TYPE_LABELS[selectedNode.type]}
                  </Tag>
                  {selectedNode.title && <Text type="secondary">{selectedNode.title}</Text>}
                </Space>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setContextNode(selectedNode);
                      editForm.setFieldsValue({
                        name: selectedNode.name,
                        title: selectedNode.title || '',
                      });
                      setEditModalOpen(true);
                    }}
                  >
                    编辑
                  </Button>
                  {selectedNode.type !== 'person' && (
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setContextNode(selectedNode);
                        setAddType('person');
                        addForm.resetFields();
                        setAddModalOpen(true);
                      }}
                    >
                      添加成员
                    </Button>
                  )}
                </Space>
              </div>
            </div>

            {/* 基本信息 */}
            <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>基本信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13 }}>
                <div><Text type="secondary">节点 ID：</Text>{selectedNode.id}</div>
                <div>
                  <Text type="secondary">类型：</Text>
                  {NODE_ICONS[selectedNode.type]} {NODE_TYPE_LABELS[selectedNode.type]}
                </div>
                {selectedNode.memberCount !== undefined && (
                  <div><Text type="secondary">人数：</Text>{selectedNode.memberCount} 人</div>
                )}
                {selectedNode.title && (
                  <div><Text type="secondary">职位：</Text>{selectedNode.title}</div>
                )}
                <div>
                  <Text type="secondary">上级：</Text>
                  {findParentInForest(tree, selectedNode.id)?.name ?? '—'}
                </div>
                <div>
                  <Text type="secondary">下级数量：</Text>
                  {selectedNode.children?.length ?? (selectedNode.hasChildren ? '未加载' : 0)}
                </div>
              </div>
            </div>

            {/* 子节点列表 */}
            {selectedNode.children && selectedNode.children.length > 0 && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                  下级节点 <Badge count={selectedNode.children.length} style={{ backgroundColor: '#1677ff' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {selectedNode.children.map(child => (
                    <div
                      key={child.id}
                      onClick={() => setSelectedId(child.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                        border: '1px solid #f0f0f0', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#1677ff';
                        e.currentTarget.style.background = '#e6f4ff';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#f0f0f0';
                        e.currentTarget.style.background = '';
                      }}
                    >
                      <span>{NODE_ICONS[child.type]}</span>
                      <span style={{ flex: 1, fontSize: 13 }}>{child.name}</span>
                      {child.title && (
                        <Text type="secondary" style={{ fontSize: 12 }}>{child.title}</Text>
                      )}
                      {child.memberCount !== undefined && (
                        <Tag style={{ margin: 0, fontSize: 11 }}>{child.memberCount}人</Tag>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 懒加载提示 */}
            {selectedNode.hasChildren && !selectedNode.children && (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Button
                  icon={loadingIds.has(selectedNode.id) ? <LoadingOutlined /> : <DownOutlined />}
                  onClick={() => handleToggle(selectedNode.id)}
                  loading={loadingIds.has(selectedNode.id)}
                >
                  加载子节点
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Empty description="点击左侧节点查看详情" />
          </div>
        )}
      </Card>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑节点"
        open={editModalOpen}
        onOk={handleEditSave}
        onCancel={() => setEditModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={400}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          {contextNode?.type === 'person' && (
            <Form.Item label="职位" name="title">
              <Input placeholder="如：前端工程师" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 添加弹窗 */}
      <Modal
        title={`添加${addType === 'person' ? '成员' : '子部门'}`}
        open={addModalOpen}
        onOk={handleAddSave}
        onCancel={() => setAddModalOpen(false)}
        okText="添加"
        cancelText="取消"
        width={400}
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="类型">
            <Select
              value={addType}
              onChange={setAddType}
              options={[
                { label: '📁 部门', value: 'department' },
                { label: '👥 小组', value: 'team' },
                { label: '👤 人员', value: 'person' },
              ]}
            />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder={addType === 'person' ? '姓名' : '部门/小组名称'} />
          </Form.Item>
          {addType === 'person' && (
            <Form.Item label="职位" name="title">
              <Input placeholder="如：前端工程师" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default OrgTreeDemo;
