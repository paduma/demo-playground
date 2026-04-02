import React, { useState, useMemo } from 'react';
import {
  Card, Button, Space, Typography, Tag, Progress, Checkbox, message,
  Slider, InputNumber, Empty, Tooltip, Badge,
} from 'antd';
import {
  DownloadOutlined, PauseCircleOutlined, ReloadOutlined,
  DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined,
  LoadingOutlined, ClockCircleOutlined, StopOutlined,
  FileImageOutlined, FilePdfOutlined, FileZipOutlined,
  FileExcelOutlined, FileWordOutlined,
} from '@ant-design/icons';
import { useConcurrentDownload } from '@/hooks/useConcurrentDownload';
import type { DownloadTask, TaskStatus } from '@/hooks/useConcurrentDownload';

const { Text } = Typography;

// --- Mock 图片/文件列表 ---

interface FileItem {
  id: string;
  fileName: string;
  url: string;
  size: number;
  type: 'image' | 'pdf' | 'excel' | 'word' | 'zip';
  thumbnail: string;
}

const FILE_TYPE_ICONS: Record<FileItem['type'], React.ReactNode> = {
  image: <FileImageOutlined style={{ fontSize: 32, color: '#1677ff' }} />,
  pdf: <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />,
  excel: <FileExcelOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
  word: <FileWordOutlined style={{ fontSize: 32, color: '#1677ff' }} />,
  zip: <FileZipOutlined style={{ fontSize: 32, color: '#faad14' }} />,
};

const STATUS_CONFIG: Record<TaskStatus, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: 'default', icon: <ClockCircleOutlined />, label: '等待中' },
  downloading: { color: 'processing', icon: <LoadingOutlined />, label: '下载中' },
  done: { color: 'success', icon: <CheckCircleOutlined />, label: '已完成' },
  error: { color: 'error', icon: <CloseCircleOutlined />, label: '失败' },
  cancelled: { color: 'warning', icon: <StopOutlined />, label: '已取消' },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 确定性伪随机
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const MOCK_FILES: FileItem[] = Array.from({ length: 20 }, (_, i) => {
  const types: FileItem['type'][] = ['image', 'image', 'image', 'pdf', 'excel', 'word', 'zip'];
  const type = types[i % types.length];
  const names: Record<FileItem['type'], string[]> = {
    image: ['产品主图', '详情图', '场景图', '包装图', '证书扫描'],
    pdf: ['合同文件', '技术规格书', '检测报告'],
    excel: ['订单汇总表', '库存报表', '销售数据'],
    word: ['需求文档', '会议纪要', '操作手册'],
    zip: ['设计源文件', '素材包', '备份归档'],
  };
  const nameList = names[type];
  const name = nameList[i % nameList.length];
  const ext = { image: '.png', pdf: '.pdf', excel: '.xlsx', word: '.docx', zip: '.zip' }[type];
  const size = Math.round(seededRandom(i + 1) * 8 * 1024 * 1024 + 500 * 1024);

  return {
    id: `file-${i + 1}`,
    fileName: `${name}-${String(i + 1).padStart(2, '0')}${ext}`,
    url: `https://mock-cdn.example.com/files/${i + 1}${ext}`,
    size,
    type,
    thumbnail: '',
  };
});

// --- 主组件 ---

const BatchDownloadDemo: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [maxConcurrency, setMaxConcurrency] = useState(3);

  const {
    tasks, isRunning,
    startDownload, retryFailed, cancelAll, cancelOne, reset,
  } = useConcurrentDownload({ concurrency: maxConcurrency, retryCount: 1 });

  // --- 选择逻辑 ---

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === MOCK_FILES.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(MOCK_FILES.map(f => f.id)));
    }
  };

  // --- 开始下载 ---

  const handleStartDownload = () => {
    const selected = MOCK_FILES.filter(f => selectedIds.has(f.id));
    if (selected.length === 0) {
      message.warning('请先选择要下载的文件');
      return;
    }
    startDownload(selected.map(f => ({
      id: f.id,
      fileName: f.fileName,
      url: f.url,
      size: f.size,
    })));
  };

  // --- 模拟打包下载 ---

  const handlePackDownload = () => {
    const doneTasks = tasks.filter(t => t.status === 'done');
    if (doneTasks.length === 0) {
      message.warning('没有已完成的文件');
      return;
    }
    message.success(`已打包 ${doneTasks.length} 个文件为 ZIP 下载（模拟）`);
  };

  // --- 统计 ---

  const taskMap = useMemo(
    () => new Map(tasks.map(t => [t.id, t])),
    [tasks],
  );

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const error = tasks.filter(t => t.status === 'error').length;
    const cancelled = tasks.filter(t => t.status === 'cancelled').length;
    const downloading = tasks.filter(t => t.status === 'downloading').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const totalBytes = tasks.reduce((sum, t) => sum + t.size, 0);
    const loadedBytes = tasks.reduce((sum, t) => sum + t.loaded, 0);
    const overallProgress = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;
    return { total, done, error, cancelled, downloading, pending, totalBytes, loadedBytes, overallProgress };
  }, [tasks]);

  // --- 查找任务对应的文件类型 ---

  const fileTypeMap = useMemo(
    () => new Map(MOCK_FILES.map(f => [f.id, f.type])),
    [],
  );

  const getFileType = (taskId: string): FileItem['type'] => {
    return fileTypeMap.get(taskId) || 'image';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* 顶部控制栏 */}
      <Card size="small" styles={{ body: { padding: '8px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <DownloadOutlined style={{ fontSize: 18 }} />
            <Text strong style={{ fontSize: 16 }}>批量下载</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              勾选文件 → 设置并发数 → 开始下载 → 打包 ZIP
            </Text>
          </Space>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>并发数：</Text>
            <Slider
              min={1} max={6} value={maxConcurrency}
              onChange={setMaxConcurrency}
              disabled={isRunning}
              style={{ width: 100 }}
              tooltip={{ formatter: v => `${v}` }}
            />
            <InputNumber
              size="small" min={1} max={6}
              value={maxConcurrency}
              onChange={v => v && setMaxConcurrency(v)}
              disabled={isRunning}
              style={{ width: 56 }}
            />
          </Space>
        </div>
      </Card>

      {/* 文件选择区 */}
      <Card
        size="small"
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Checkbox
                checked={selectedIds.size === MOCK_FILES.length}
                indeterminate={selectedIds.size > 0 && selectedIds.size < MOCK_FILES.length}
                onChange={selectAll}
                disabled={isRunning}
              >
                全选
              </Checkbox>
              <Text type="secondary" style={{ fontSize: 12 }}>
                已选 {selectedIds.size}/{MOCK_FILES.length} 个文件
                {selectedIds.size > 0 && (
                  <span>
                    ，共 {formatSize(MOCK_FILES.filter(f => selectedIds.has(f.id)).reduce((s, f) => s + f.size, 0))}
                  </span>
                )}
              </Text>
            </Space>
            <Space>
              {!isRunning && tasks.length === 0 && (
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleStartDownload}
                  disabled={selectedIds.size === 0}
                >
                  开始下载 ({selectedIds.size})
                </Button>
              )}
              {isRunning && (
                <Button danger icon={<PauseCircleOutlined />} onClick={cancelAll}>
                  取消全部
                </Button>
              )}
              {!isRunning && tasks.length > 0 && (
                <>
                  {stats.error > 0 && (
                    <Button icon={<ReloadOutlined />} onClick={retryFailed}>
                      重试失败 ({stats.error})
                    </Button>
                  )}
                  {stats.done > 0 && (
                    <Button type="primary" icon={<FileZipOutlined />} onClick={handlePackDownload}>
                      打包下载 ({stats.done})
                    </Button>
                  )}
                  <Button icon={<DeleteOutlined />} onClick={reset}>
                    清空
                  </Button>
                </>
              )}
            </Space>
          </div>
        }
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
        }}>
          {MOCK_FILES.map(file => {
            const isSelected = selectedIds.has(file.id);
            const task = taskMap.get(file.id);
            return (
              <div
                key={file.id}
                onClick={() => !isRunning && toggleSelect(file.id)}
                style={{
                  padding: 12, borderRadius: 8, textAlign: 'center',
                  cursor: isRunning ? 'default' : 'pointer',
                  border: isSelected ? '2px solid #1677ff' : '2px solid #f0f0f0',
                  background: isSelected ? '#e6f4ff' : undefined,
                  transition: 'all 0.15s',
                  position: 'relative',
                  opacity: isRunning && !task ? 0.4 : 1,
                }}
              >
                {/* 选中勾 */}
                {!isRunning && (
                  <Checkbox
                    checked={isSelected}
                    style={{ position: 'absolute', top: 6, left: 6 }}
                    onClick={e => e.stopPropagation()}
                    onChange={() => toggleSelect(file.id)}
                  />
                )}

                {/* 任务状态角标 */}
                {task && (
                  <div style={{ position: 'absolute', top: 6, right: 6 }}>
                    <Tag
                      color={STATUS_CONFIG[task.status].color}
                      icon={STATUS_CONFIG[task.status].icon}
                      style={{ fontSize: 11, margin: 0, padding: '0 4px' }}
                    >
                      {STATUS_CONFIG[task.status].label}
                    </Tag>
                  </div>
                )}

                {/* 文件图标 */}
                <div style={{ margin: '8px 0' }}>
                  {FILE_TYPE_ICONS[file.type]}
                </div>

                {/* 文件名 */}
                <div style={{
                  fontSize: 12, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {file.fileName}
                </div>

                {/* 文件大小 */}
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                  {formatSize(file.size)}
                </div>

                {/* 下载进度条 */}
                {task && task.status === 'downloading' && (
                  <Progress
                    percent={task.progress}
                    size="small"
                    style={{ marginTop: 4, padding: '0 4px' }}
                    strokeColor="#1677ff"
                  />
                )}

                {/* 失败信息 */}
                {task && task.status === 'error' && (
                  <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 4 }}>
                    {task.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 下载任务面板 */}
      {tasks.length > 0 && (
        <Card
          size="small"
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Text strong>下载任务</Text>
                <Badge count={stats.downloading} style={{ backgroundColor: '#1677ff' }} />
                {stats.pending > 0 && <Tag>等待 {stats.pending}</Tag>}
                {stats.done > 0 && <Tag color="success">完成 {stats.done}</Tag>}
                {stats.error > 0 && <Tag color="error">失败 {stats.error}</Tag>}
                {stats.cancelled > 0 && <Tag color="warning">取消 {stats.cancelled}</Tag>}
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatSize(stats.loadedBytes)} / {formatSize(stats.totalBytes)}
              </Text>
            </div>
          }
        >
          {/* 总进度 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 13 }}>总进度</Text>
              <Text style={{ fontSize: 13 }}>{stats.overallProgress}%</Text>
            </div>
            <Progress
              percent={stats.overallProgress}
              status={stats.error > 0 ? 'exception' : isRunning ? 'active' : 'success'}
              strokeColor={isRunning ? '#1677ff' : stats.error > 0 ? '#ff4d4f' : '#52c41a'}
            />
          </div>

          {/* 任务列表 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tasks.map(task => (
              <div
                key={task.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 6,
                  border: '1px solid #f0f0f0', fontSize: 13,
                }}
              >
                {/* 文件图标 */}
                <span style={{ fontSize: 18, flexShrink: 0 }}>
                  {FILE_TYPE_ICONS[getFileType(task.id)] || <FileImageOutlined />}
                </span>

                {/* 文件名 + 大小 */}
                <div style={{ width: 180, flexShrink: 0 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.fileName}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {formatSize(task.loaded)} / {formatSize(task.size)}
                  </Text>
                </div>

                {/* 进度条 */}
                <div style={{ flex: 1 }}>
                  <Progress
                    percent={task.progress}
                    size="small"
                    status={
                      task.status === 'error' ? 'exception'
                        : task.status === 'done' ? 'success'
                          : task.status === 'downloading' ? 'active'
                            : 'normal'
                    }
                    format={p => `${p}%`}
                  />
                </div>

                {/* 状态标签 */}
                <Tag
                  color={STATUS_CONFIG[task.status].color}
                  icon={STATUS_CONFIG[task.status].icon}
                  style={{ margin: 0, flexShrink: 0 }}
                >
                  {STATUS_CONFIG[task.status].label}
                </Tag>

                {/* 取消按钮 */}
                {(task.status === 'downloading' || task.status === 'pending') && (
                  <Tooltip title="取消">
                    <Button
                      type="text" size="small" danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => cancelOne(task.id)}
                    />
                  </Tooltip>
                )}

                {/* 错误信息 */}
                {task.status === 'error' && (
                  <Text type="danger" style={{ fontSize: 11, flexShrink: 0 }}>
                    {task.error}
                  </Text>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 实现说明 */}
      {tasks.length === 0 && (
        <Card size="small" title="工程要点">
          <div style={{ fontSize: 13, lineHeight: 2, color: '#666' }}>
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li>并发数限制：用队列 + activeCount 控制同时进行的请求数（默认 3，可调）</li>
              <li>单文件进度：每个任务独立 progress，通过 onDownloadProgress / 模拟 chunk 更新</li>
              <li>总进度：累加所有任务的 loaded / total 字节数</li>
              <li>失败重试：自动重试 1 次，仍失败则标记 error，用户可手动重试</li>
              <li>取消下载：AbortController 中断进行中的请求，支持单个取消和全部取消</li>
              <li>打包下载：所有完成的文件用 JSZip 打成 zip（本 demo 为模拟）</li>
            </ol>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BatchDownloadDemo;
