import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Space, Typography, Tag, Tooltip, Input, Dropdown, Modal, Form, message, Empty, Breadcrumb, Segmented, Table } from 'antd';
import { FolderAddOutlined, DeleteOutlined, EditOutlined, CopyOutlined, ScissorOutlined, SnippetsOutlined, AppstoreOutlined, UnorderedListOutlined, UploadOutlined, HomeOutlined, ArrowUpOutlined, SearchOutlined } from '@ant-design/icons';
import type { FileNode } from './file-manager/types';
import { getCategory, CATEGORY_ICONS, FOLDER_ICON, formatSize, genFileId } from './file-manager/types';
import { MOCK_FILE_TREE } from './file-manager/mock-data';

const { Text } = Typography;

function cloneNode(n: FileNode): FileNode { return { ...n, children: n.children?.map(cloneNode) }; }
function findNode(r: FileNode, id: string): FileNode | null { if (r.id === id) return r; for (const c of r.children || []) { const f = findNode(c, id); if (f) return f; } return null; }
function findParent(r: FileNode, id: string): FileNode | null { if (r.children?.some(c => c.id === id)) return r; for (const c of r.children || []) { const f = findParent(c, id); if (f) return f; } return null; }
function removeNode(r: FileNode, id: string): FileNode { return { ...r, children: r.children?.filter(c => c.id !== id).map(c => removeNode(c, id)) }; }
function getPath(r: FileNode, id: string): FileNode[] { if (r.id === id) return [r]; for (const c of r.children || []) { const p = getPath(c, id); if (p.length) return [r, ...p]; } return []; }

type ViewMode = 'grid' | 'list';
type SortKey = 'name' | 'modifiedAt' | 'size';

const FileManagerDemo: React.FC = () => {
  const [root, setRoot] = useState<FileNode>(() => cloneNode(MOCK_FILE_TREE));
  const [fid, setFid] = useState('root');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [vm, setVm] = useState<ViewMode>('grid');
  const [sk, setSk] = useState<SortKey>('name');
  const [kw, setKw] = useState('');
  const [rnOpen, setRnOpen] = useState(false);
  const [rnTgt, setRnTgt] = useState<FileNode | null>(null);
  const [nfOpen, setNfOpen] = useState(false);
  const [clip, setClip] = useState<{ ids: string[]; mode: 'copy' | 'cut' } | null>(null);
  const [dragO, setDragO] = useState(false);
  const [rnForm] = Form.useForm();
  const [nfForm] = Form.useForm();
  const folder = useMemo(() => findNode(root, fid), [root, fid]);
  const crumbs = useMemo(() => getPath(root, fid), [root, fid]);
  const selArr = useMemo(() => [...sel], [sel]);
  const items = useMemo(() => {
    let l = folder?.children || [];
    if (kw.trim()) { const k = kw.toLowerCase(); l = l.filter(i => i.name.toLowerCase().includes(k)); }
    return [...l].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      if (sk === 'name') return a.name.localeCompare(b.name);
      if (sk === 'modifiedAt') return b.modifiedAt.localeCompare(a.modifiedAt);
      return (b.size || 0) - (a.size || 0);
    });
  }, [folder, kw, sk]);
  const nav = useCallback((id: string) => { setFid(id); setSel(new Set()); setKw(''); }, []);
  const navUp = useCallback(() => { const p = findParent(root, fid); if (p) nav(p.id); }, [root, fid, nav]);
  const openItem = useCallback((it: FileNode) => {
    if (it.type === 'folder') { nav(it.id); return; }
    Modal.info({ title: it.name, width: 400, content: (<div style={{ fontSize: 13, lineHeight: 2 }}><p>类型：{getCategory(it.name)}</p><p>大小：{formatSize(it.size)}</p><p>修改：{it.modifiedAt}</p></div>) });
  }, [nav]);
  const toggle = useCallback((id: string, multi: boolean) => { setSel(p => { const n = multi ? new Set(p) : new Set<string>(); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }, []);
  const addFolder = useCallback(() => { nfForm.validateFields().then(v => { const f: FileNode = { id: genFileId(), name: v.name, type: 'folder', modifiedAt: new Date().toISOString().slice(0, 10), children: [] }; setRoot(p => { const n = cloneNode(p); findNode(n, fid)?.children?.push(f); return n; }); setNfOpen(false); nfForm.resetFields(); message.success('已创建'); }); }, [nfForm, fid]);
  const doRename = useCallback(() => { rnForm.validateFields().then(v => { setRoot(p => { const n = cloneNode(p); const t = findNode(n, rnTgt!.id); if (t) t.name = v.name; return n; }); setRnOpen(false); message.success('已重命名'); }); }, [rnForm, rnTgt]);
  const del = useCallback((ids: string[]) => { Modal.confirm({ title: '确认删除', content: `删除 ${ids.length} 项？`, okText: '删除', okType: 'danger', onOk: () => { setRoot(p => { let n = cloneNode(p); for (const id of ids) n = removeNode(n, id); return n; }); setSel(new Set()); message.success('已删除'); } }); }, []);
  const doCopy = useCallback((ids: string[]) => { setClip({ ids, mode: 'copy' }); message.info('已复制'); }, []);
  const doCut = useCallback((ids: string[]) => { setClip({ ids, mode: 'cut' }); message.info('已剪切'); }, []);
  const doPaste = useCallback(() => { if (!clip) return; setRoot(p => { let n = cloneNode(p); for (const id of clip.ids) { const s = findNode(n, id); if (!s) continue; const c = cloneNode(s); if (clip.mode === 'copy') c.id = genFileId(); else n = removeNode(n, id); findNode(n, fid)?.children?.push(c); } return n; }); if (clip.mode === 'cut') setClip(null); setSel(new Set()); message.success('已粘贴'); }, [clip, fid]);
  const upload = useCallback(() => { const ns = ['report.pdf', 'photo.jpg', 'data.csv', 'notes.md', 'archive.zip']; const nm = ns[Math.floor(Math.random() * ns.length)]; const f: FileNode = { id: genFileId(), name: nm, type: 'file', size: Math.floor(Math.random() * 5e6) + 1024, modifiedAt: new Date().toISOString().slice(0, 10) }; setRoot(p => { const n = cloneNode(p); findNode(n, fid)?.children?.push(f); return n; }); message.success('已上传 ' + nm); }, [fid]);
  const ctxMenu = useCallback((nd?: FileNode): any[] => {
    if (nd) return [
      { key: 'open', label: nd.type === 'folder' ? '打开' : '预览', onClick: () => openItem(nd) },
      { type: 'divider' },
      { key: 'rename', label: '重命名', icon: <EditOutlined />, onClick: () => { setRnTgt(nd); rnForm.setFieldsValue({ name: nd.name }); setRnOpen(true); } },
      { key: 'copy', label: '复制', icon: <CopyOutlined />, onClick: () => doCopy([nd.id]) },
      { key: 'cut', label: '剪切', icon: <ScissorOutlined />, onClick: () => doCut([nd.id]) },
      { type: 'divider' },
      { key: 'del', label: '删除', icon: <DeleteOutlined />, danger: true, onClick: () => del([nd.id]) },
    ];
    return [
      { key: 'nf', label: '新建文件夹', icon: <FolderAddOutlined />, onClick: () => { nfForm.resetFields(); setNfOpen(true); } },
      { key: 'up', label: '上传文件', icon: <UploadOutlined />, onClick: upload },
      ...(clip ? [{ key: 'paste', label: '粘贴', icon: <SnippetsOutlined />, onClick: doPaste }] : []),
    ];
  }, [openItem, rnForm, doCopy, doCut, del, upload, doPaste, clip, nfForm]);
  const fc = items.filter(i => i.type === 'folder').length;
  const flc = items.filter(i => i.type === 'file').length;
  const cols = useMemo(() => [
    { title: '名称', dataIndex: 'name', key: 'name', render: (_: string, r: FileNode) => <Space><span style={{ fontSize: 16 }}>{r.type === 'folder' ? FOLDER_ICON : CATEGORY_ICONS[getCategory(r.name)]}</span><a onClick={() => openItem(r)}>{r.name}</a></Space>, sorter: (a: FileNode, b: FileNode) => a.name.localeCompare(b.name) },
    { title: '大小', dataIndex: 'size', key: 'size', width: 100, render: (v: number | undefined, r: FileNode) => r.type === 'folder' ? '—' : formatSize(v) },
    { title: '修改时间', dataIndex: 'modifiedAt', key: 'mod', width: 120 },
    { title: '类型', key: 'type', width: 100, render: (_: unknown, r: FileNode) => <Tag>{r.type === 'folder' ? '文件夹' : getCategory(r.name)}</Tag> },
  ], [openItem]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card size="small" styles={{ body: { padding: '8px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Space>
            <Tooltip title="返回上级"><Button size="small" icon={<ArrowUpOutlined />} disabled={fid === 'root'} onClick={navUp} /></Tooltip>
            <Breadcrumb items={crumbs.map((p, i) => ({ title: i === crumbs.length - 1 ? <Text strong>{p.name}</Text> : <a onClick={() => nav(p.id)}>{p.id === 'root' ? <HomeOutlined /> : p.name}</a> }))} />
          </Space>
          <Space>
            <Input size="small" prefix={<SearchOutlined />} placeholder="搜索..." allowClear value={kw} onChange={e => setKw(e.target.value)} style={{ width: 160 }} />
            <Segmented size="small" value={sk} onChange={v => setSk(v as SortKey)} options={[{ label: '名称', value: 'name' }, { label: '时间', value: 'modifiedAt' }, { label: '大小', value: 'size' }]} />
            <Segmented size="small" value={vm} onChange={v => setVm(v as ViewMode)} options={[{ label: <AppstoreOutlined />, value: 'grid' }, { label: <UnorderedListOutlined />, value: 'list' }]} />
          </Space>
        </div>
      </Card>
      <Card size="small" styles={{ body: { padding: '6px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="small">
            <Button size="small" icon={<FolderAddOutlined />} onClick={() => { nfForm.resetFields(); setNfOpen(true); }}>新建文件夹</Button>
            <Button size="small" icon={<UploadOutlined />} onClick={upload}>上传文件</Button>
            {clip && <Button size="small" icon={<SnippetsOutlined />} onClick={doPaste}>粘贴</Button>}
            {selArr.length > 0 && (<><Button size="small" icon={<CopyOutlined />} onClick={() => doCopy(selArr)}>复制</Button><Button size="small" icon={<ScissorOutlined />} onClick={() => doCut(selArr)}>剪切</Button><Button size="small" danger icon={<DeleteOutlined />} onClick={() => del(selArr)}>删除</Button><Text type="secondary" style={{ fontSize: 12 }}>已选 {selArr.length} 项</Text></>)}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>{fc} 个文件夹，{flc} 个文件</Text>
        </div>
      </Card>
      <Dropdown menu={{ items: ctxMenu() }} trigger={['contextMenu']}>
        <Card style={{ minHeight: 400 }} styles={{ body: { padding: vm === 'grid' ? 16 : 0, position: 'relative' } }} onDragOver={e => { e.preventDefault(); setDragO(true); }} onDragLeave={() => setDragO(false)} onDrop={e => { e.preventDefault(); setDragO(false); upload(); }}>
          {dragO && <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(22,119,255,0.06)', border: '2px dashed #1677ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#1677ff', pointerEvents: 'none' }}>释放文件到此处上传</div>}
          {items.length === 0 ? <Empty description={kw ? '未找到匹配文件' : '空文件夹'} style={{ padding: 48 }} /> : vm === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
              {items.map(it => { const s = sel.has(it.id); return (
                <Dropdown key={it.id} menu={{ items: ctxMenu(it) }} trigger={['contextMenu']}>
                  <div onClick={e => toggle(it.id, e.ctrlKey || e.metaKey)} onDoubleClick={() => openItem(it)} style={{ padding: 12, borderRadius: 8, textAlign: 'center', cursor: 'pointer', border: s ? '2px solid #1677ff' : '2px solid transparent', background: s ? '#e6f4ff' : undefined, transition: 'all 0.15s' }} onMouseEnter={e => { if (!s) e.currentTarget.style.background = '#fafafa'; }} onMouseLeave={e => { if (!s) e.currentTarget.style.background = ''; }}>
                    <div style={{ fontSize: 36, lineHeight: 1.2 }}>{it.type === 'folder' ? FOLDER_ICON : CATEGORY_ICONS[getCategory(it.name)]}</div>
                    <div style={{ fontSize: 12, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                    {it.type === 'file' && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{formatSize(it.size)}</div>}
                  </div>
                </Dropdown>); })}
            </div>
          ) : (
            <Table dataSource={items} columns={cols} rowKey="id" size="small" pagination={false} rowSelection={{ selectedRowKeys: selArr, onChange: k => setSel(new Set(k as string[])) }} onRow={r => ({ onDoubleClick: () => openItem(r) })} />
          )}
        </Card>
      </Dropdown>
      <Modal title="新建文件夹" open={nfOpen} onOk={addFolder} onCancel={() => setNfOpen(false)} okText="创建" cancelText="取消" width={360}>
        <Form form={nfForm} layout="vertical" style={{ marginTop: 16 }}><Form.Item label="文件夹名称" name="name" rules={[{ required: true, message: '请输入名称' }]}><Input placeholder="新建文件夹" autoFocus /></Form.Item></Form>
      </Modal>
      <Modal title="重命名" open={rnOpen} onOk={doRename} onCancel={() => setRnOpen(false)} okText="确定" cancelText="取消" width={360}>
        <Form form={rnForm} layout="vertical" style={{ marginTop: 16 }}><Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}><Input autoFocus /></Form.Item></Form>
      </Modal>
    </div>
  );
};

export default FileManagerDemo;
