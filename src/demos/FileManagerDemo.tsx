import React, { useState, useCallback, useMemo } from 'react';
import {
  Card, Button, Space, Typography, Tag, Tooltip, Input, Dropdown, Modal,
  Form, message, Empty, Breadcrumb, Segmented, Table,
} from 'antd';
import {
  FolderAddOutlined, DeleteOutlined, EditOutlined, CopyOutlined,
  ScissorOutlined, SnippetsOutlined, AppstoreOutlined, UnorderedListOutlined,
  UploadOutlined, HomeOutlined, ArrowUpOutlined, SearchOutlined,
} from '@ant-design/icons';
import type { FileNode } from './file-manager/types';
import { getCategory, CATEGORY_ICONS, FOLDER_ICON, formatSize, genFileId } from './file-manager/types';
import { MOCK_FILE_TREE } from './file-manager/mock-data';
import {
  cloneNode, findInTree, findParentInTree, removeFromTree, getPathInTree,
} from '@/utils/tree';

const { Text } = Typography;

/* ── 类型 ── */

type ViewMode = 'grid' | 'list';
type SortKey = 'name' | 'modifiedAt' | 'size';

interface Clipboard {
  ids: string[];
  mode: 'copy' | 'cut';
}

/* ── 模拟上传的随机文件名 ── */
const UPLOAD_FILE_NAMES = ['report.pdf', 'photo.jpg', 'data.csv', 'notes.md', 'archive.zip'];

/* ── 主组件 ── */

const FileManagerDemo: React.FC = () => {
  /* ── State ── */
  const [root, setRoot] = useState<FileNode>(() => cloneNode(MOCK_FILE_TREE));
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [searchKeyword, setSearchKeyword] = useState('');

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileNode | null>(null);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);

  const [clipboard, setClipboard] = useState<Clipboard | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [renameForm] = Form.useForm();
  const [newFolderForm] = Form.useForm();

  /* ── 派生数据 ── */
  const currentFolder = useMemo(
    () => findInTree(root, currentFolderId),
    [root, currentFolderId],
  );

  const breadcrumbs = useMemo(
    () => getPathInTree(root, currentFolderId),
    [root, currentFolderId],
  );

  const selectedKeysArray = useMemo(() => [...selectedIds], [selectedIds]);

  /** 当前文件夹内容：搜索过滤 + 排序（文件夹优先） */
  const displayItems = useMemo(() => {
    let list = currentFolder?.children || [];

    // 搜索过滤
    const keyword = searchKeyword.trim().toLowerCase();
    if (keyword) {
      list = list.filter(item => item.name.toLowerCase().includes(keyword));
    }

    // 排序：文件夹始终在前
    return [...list].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'modifiedAt') return b.modifiedAt.localeCompare(a.modifiedAt);
      return (b.size || 0) - (a.size || 0);
    });
  }, [currentFolder, searchKeyword, sortKey]);

  const folderCount = displayItems.filter(i => i.type === 'folder').length;
  const fileCount = displayItems.filter(i => i.type === 'file').length;

  /* ── 导航 ── */

  const navigateTo = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
    setSelectedIds(new Set());
    setSearchKeyword('');
  }, []);

  const navigateUp = useCallback(() => {
    const parent = findParentInTree(root, currentFolderId);
    if (parent) navigateTo(parent.id);
  }, [root, currentFolderId, navigateTo]);

  /* ── 打开文件/文件夹 ── */

  const openItem = useCallback((item: FileNode) => {
    if (item.type === 'folder') {
      navigateTo(item.id);
      return;
    }
    Modal.info({
      title: item.name,
      width: 400,
      content: (
        <div style={{ fontSize: 13, lineHeight: 2 }}>
          <p>类型：{getCategory(item.name)}</p>
          <p>大小：{formatSize(item.size)}</p>
          <p>修改：{item.modifiedAt}</p>
        </div>
      ),
    });
  }, [navigateTo]);

  /* ── 选择 ── */

  const toggleSelection = useCallback((id: string, isMultiSelect: boolean) => {
    setSelectedIds(prev => {
      const next = isMultiSelect ? new Set(prev) : new Set<string>();
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /* ── 新建文件夹 ── */

  const handleCreateFolder = useCallback(() => {
    newFolderForm.validateFields().then(values => {
      const newFolder: FileNode = {
        id: genFileId(),
        name: values.name,
        type: 'folder',
        modifiedAt: new Date().toISOString().slice(0, 10),
        children: [],
      };
      setRoot(prev => {
        const next = cloneNode(prev);
        findInTree(next, currentFolderId)?.children?.push(newFolder);
        return next;
      });
      setNewFolderModalOpen(false);
      newFolderForm.resetFields();
      message.success('已创建');
    });
  }, [newFolderForm, currentFolderId]);

  /* ── 重命名 ── */

  const handleRename = useCallback(() => {
    renameForm.validateFields().then(values => {
      setRoot(prev => {
        const next = cloneNode(prev);
        const target = findInTree(next, renameTarget!.id);
        if (target) target.name = values.name;
        return next;
      });
      setRenameModalOpen(false);
      message.success('已重命名');
    });
  }, [renameForm, renameTarget]);

  const openRenameModal = useCallback((node: FileNode) => {
    setRenameTarget(node);
    renameForm.setFieldsValue({ name: node.name });
    setRenameModalOpen(true);
  }, [renameForm]);

  /* ── 删除 ── */

  const handleDelete = useCallback((ids: string[]) => {
    Modal.confirm({
      title: '确认删除',
      content: `删除 ${ids.length} 项？`,
      okText: '删除',
      okType: 'danger',
      onOk: () => {
        setRoot(prev => {
          let next = cloneNode(prev);
          for (const id of ids) {
            next = removeFromTree(next, id);
          }
          return next;
        });
        setSelectedIds(new Set());
        message.success('已删除');
      },
    });
  }, []);

  /* ── 复制 / 剪切 / 粘贴 ── */

  const handleCopy = useCallback((ids: string[]) => {
    setClipboard({ ids, mode: 'copy' });
    message.info('已复制');
  }, []);

  const handleCut = useCallback((ids: string[]) => {
    setClipboard({ ids, mode: 'cut' });
    message.info('已剪切');
  }, []);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;

    setRoot(prev => {
      let next = cloneNode(prev);
      for (const id of clipboard.ids) {
        const source = findInTree(next, id);
        if (!source) continue;

        const cloned = cloneNode(source);
        if (clipboard.mode === 'copy') {
          cloned.id = genFileId();
        } else {
          next = removeFromTree(next, id);
        }
        findInTree(next, currentFolderId)?.children?.push(cloned);
      }
      return next;
    });

    if (clipboard.mode === 'cut') setClipboard(null);
    setSelectedIds(new Set());
    message.success('已粘贴');
  }, [clipboard, currentFolderId]);

  /* ── 模拟上传 ── */

  const handleUpload = useCallback(() => {
    const fileName = UPLOAD_FILE_NAMES[Math.floor(Math.random() * UPLOAD_FILE_NAMES.length)];
    const newFile: FileNode = {
      id: genFileId(),
      name: fileName,
      type: 'file',
      size: Math.floor(Math.random() * 5e6) + 1024,
      modifiedAt: new Date().toISOString().slice(0, 10),
    };
    setRoot(prev => {
      const next = cloneNode(prev);
      findInTree(next, currentFolderId)?.children?.push(newFile);
      return next;
    });
    message.success(`已上传 ${fileName}`);
  }, [currentFolderId]);

  /* ── 右键菜单 ── */

  const buildContextMenu = useCallback((node?: FileNode): any[] => {
    // 文件/文件夹上的右键菜单
    if (node) {
      return [
        {
          key: 'open',
          label: node.type === 'folder' ? '打开' : '预览',
          onClick: () => openItem(node),
        },
        { type: 'divider' },
        {
          key: 'rename',
          label: '重命名',
          icon: <EditOutlined />,
          onClick: () => openRenameModal(node),
        },
        {
          key: 'copy',
          label: '复制',
          icon: <CopyOutlined />,
          onClick: () => handleCopy([node.id]),
        },
        {
          key: 'cut',
          label: '剪切',
          icon: <ScissorOutlined />,
          onClick: () => handleCut([node.id]),
        },
        { type: 'divider' },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete([node.id]),
        },
      ];
    }

    // 空白区域的右键菜单
    return [
      {
        key: 'new-folder',
        label: '新建文件夹',
        icon: <FolderAddOutlined />,
        onClick: () => { newFolderForm.resetFields(); setNewFolderModalOpen(true); },
      },
      {
        key: 'upload',
        label: '上传文件',
        icon: <UploadOutlined />,
        onClick: handleUpload,
      },
      ...(clipboard ? [{
        key: 'paste',
        label: '粘贴',
        icon: <SnippetsOutlined />,
        onClick: handlePaste,
      }] : []),
    ];
  }, [openItem, openRenameModal, handleCopy, handleCut, handleDelete, handleUpload, handlePaste, clipboard, newFolderForm]);

  /* ── 列表视图的列定义 ── */

  const listColumns = useMemo(() => [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: FileNode) => (
        <Space>
          <span style={{ fontSize: 16 }}>
            {record.type === 'folder' ? FOLDER_ICON : CATEGORY_ICONS[getCategory(record.name)]}
          </span>
          <a onClick={() => openItem(record)}>{record.name}</a>
        </Space>
      ),
      sorter: (a: FileNode, b: FileNode) => a.name.localeCompare(b.name),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (value: number | undefined, record: FileNode) =>
        record.type === 'folder' ? '—' : formatSize(value),
    },
    {
      title: '修改时间',
      dataIndex: 'modifiedAt',
      key: 'modifiedAt',
      width: 120,
    },
    {
      title: '类型',
      key: 'type',
      width: 100,
      render: (_: unknown, record: FileNode) => (
        <Tag>{record.type === 'folder' ? '文件夹' : getCategory(record.name)}</Tag>
      ),
    },
  ], [openItem]);

  /* ── 渲染 ── */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* 导航栏 */}
      <Card size="small" styles={{ body: { padding: '8px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Space>
            <Tooltip title="返回上级">
              <Button
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={currentFolderId === 'root'}
                onClick={navigateUp}
              />
            </Tooltip>
            <Breadcrumb
              items={breadcrumbs.map((node, index) => ({
                title: index === breadcrumbs.length - 1
                  ? <Text strong>{node.name}</Text>
                  : <a onClick={() => navigateTo(node.id)}>
                    {node.id === 'root' ? <HomeOutlined /> : node.name}
                  </a>,
              }))}
            />
          </Space>
          <Space>
            <Input
              size="small"
              prefix={<SearchOutlined />}
              placeholder="搜索..."
              allowClear
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              style={{ width: 160 }}
            />
            <Segmented
              size="small"
              value={sortKey}
              onChange={v => setSortKey(v as SortKey)}
              options={[
                { label: '名称', value: 'name' },
                { label: '时间', value: 'modifiedAt' },
                { label: '大小', value: 'size' },
              ]}
            />
            <Segmented
              size="small"
              value={viewMode}
              onChange={v => setViewMode(v as ViewMode)}
              options={[
                { label: <AppstoreOutlined />, value: 'grid' },
                { label: <UnorderedListOutlined />, value: 'list' },
              ]}
            />
          </Space>
        </div>
      </Card>

      {/* 工具栏 */}
      <Card size="small" styles={{ body: { padding: '6px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="small">
            <Button
              size="small"
              icon={<FolderAddOutlined />}
              onClick={() => { newFolderForm.resetFields(); setNewFolderModalOpen(true); }}
            >
              新建文件夹
            </Button>
            <Button size="small" icon={<UploadOutlined />} onClick={handleUpload}>
              上传文件
            </Button>
            {clipboard && (
              <Button size="small" icon={<SnippetsOutlined />} onClick={handlePaste}>
                粘贴
              </Button>
            )}
            {selectedKeysArray.length > 0 && (
              <>
                <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopy(selectedKeysArray)}>
                  复制
                </Button>
                <Button size="small" icon={<ScissorOutlined />} onClick={() => handleCut(selectedKeysArray)}>
                  剪切
                </Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(selectedKeysArray)}>
                  删除
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  已选 {selectedKeysArray.length} 项
                </Text>
              </>
            )}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {folderCount} 个文件夹，{fileCount} 个文件
          </Text>
        </div>
      </Card>

      {/* 文件内容区 */}
      <Dropdown menu={{ items: buildContextMenu() }} trigger={['contextMenu']}>
        <Card
          style={{ minHeight: 400 }}
          styles={{ body: { padding: viewMode === 'grid' ? 16 : 0, position: 'relative' } }}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={e => { e.preventDefault(); setIsDragOver(false); handleUpload(); }}
        >
          {/* 拖拽上传遮罩 */}
          {isDragOver && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(22,119,255,0.06)', border: '2px dashed #1677ff',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#1677ff', pointerEvents: 'none',
            }}>
              释放文件到此处上传
            </div>
          )}

          {/* 空状态 */}
          {displayItems.length === 0 ? (
            <Empty
              description={searchKeyword ? '未找到匹配文件' : '空文件夹'}
              style={{ padding: 48 }}
            />
          ) : viewMode === 'grid' ? (
            /* 网格视图 */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 8,
            }}>
              {displayItems.map(item => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <Dropdown key={item.id} menu={{ items: buildContextMenu(item) }} trigger={['contextMenu']}>
                    <div
                      onClick={e => toggleSelection(item.id, e.ctrlKey || e.metaKey)}
                      onDoubleClick={() => openItem(item)}
                      style={{
                        padding: 12, borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                        border: isSelected ? '2px solid #1677ff' : '2px solid transparent',
                        background: isSelected ? '#e6f4ff' : undefined,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ''; }}
                    >
                      <div style={{ fontSize: 36, lineHeight: 1.2 }}>
                        {item.type === 'folder' ? FOLDER_ICON : CATEGORY_ICONS[getCategory(item.name)]}
                      </div>
                      <div style={{
                        fontSize: 12, marginTop: 6,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.name}
                      </div>
                      {item.type === 'file' && (
                        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                          {formatSize(item.size)}
                        </div>
                      )}
                    </div>
                  </Dropdown>
                );
              })}
            </div>
          ) : (
            /* 列表视图 */
            <Table
              dataSource={displayItems}
              columns={listColumns}
              rowKey="id"
              size="small"
              pagination={false}
              rowSelection={{
                selectedRowKeys: selectedKeysArray,
                onChange: keys => setSelectedIds(new Set(keys as string[])),
              }}
              onRow={record => ({ onDoubleClick: () => openItem(record) })}
            />
          )}
        </Card>
      </Dropdown>

      {/* 新建文件夹弹窗 */}
      <Modal
        title="新建文件夹"
        open={newFolderModalOpen}
        onOk={handleCreateFolder}
        onCancel={() => setNewFolderModalOpen(false)}
        okText="创建"
        cancelText="取消"
        width={360}
      >
        <Form form={newFolderForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="文件夹名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="新建文件夹" autoFocus />
          </Form.Item>
        </Form>
      </Modal>

      {/* 重命名弹窗 */}
      <Modal
        title="重命名"
        open={renameModalOpen}
        onOk={handleRename}
        onCancel={() => setRenameModalOpen(false)}
        okText="确定"
        cancelText="取消"
        width={360}
      >
        <Form form={renameForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FileManagerDemo;
