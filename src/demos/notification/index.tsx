import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Card, Tabs, List, Badge, Button, Space, Typography, Tag, Avatar,
  Empty, Tooltip, Checkbox, message, Segmented, Switch,
} from 'antd';
import {
  BellOutlined, CheckOutlined, DeleteOutlined, ReloadOutlined,
  CheckCircleOutlined, InfoCircleOutlined, WarningOutlined,
  CloseCircleOutlined, SoundOutlined, PauseOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

type MsgType = 'system' | 'approval' | 'task' | 'alert';
type MsgLevel = 'info' | 'success' | 'warning' | 'error';

interface NotificationItem {
  id: string;
  type: MsgType;
  level: MsgLevel;
  title: string;
  content: string;
  time: string;
  read: boolean;
  sender?: string;
}

const TYPE_CONFIG: Record<MsgType, { label: string; color: string }> = {
  system: { label: '系统通知', color: 'blue' },
  approval: { label: '审批消息', color: 'purple' },
  task: { label: '任务提醒', color: 'cyan' },
  alert: { label: '告警通知', color: 'red' },
};

const LEVEL_ICONS: Record<MsgLevel, React.ReactNode> = {
  info: <InfoCircleOutlined style={{ color: '#1677ff' }} />,
  success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  warning: <WarningOutlined style={{ color: '#faad14' }} />,
  error: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
};

let _uid = 0;
function genId() { return `msg-${Date.now()}-${++_uid}`; }

const INITIAL_MESSAGES: NotificationItem[] = [
  { id: 'm1', type: 'approval', level: 'info', title: '请假审批待处理', content: 'Alice Chen 提交了一份年假申请（3天），请尽快审批。', time: '2026-03-25 09:30', read: false, sender: 'Alice Chen' },
  { id: 'm2', type: 'system', level: 'success', title: '系统升级完成', content: '平台已升级至 v3.2.0，新增审批流程设计器功能。', time: '2026-03-25 08:00', read: false },
  { id: 'm3', type: 'alert', level: 'error', title: '服务器 CPU 告警', content: '生产环境 Node-03 CPU 使用率超过 95%，持续 5 分钟。', time: '2026-03-25 07:45', read: false },
  { id: 'm4', type: 'task', level: 'warning', title: '任务即将到期', content: '「Q1 产品需求评审」将于明天截止，当前完成度 80%。', time: '2026-03-24 18:00', read: false, sender: 'PM Bot' },
  { id: 'm5', type: 'approval', level: 'success', title: '报销审批已通过', content: '您提交的差旅报销（¥3,280）已由财务部审批通过。', time: '2026-03-24 16:30', read: true },
  { id: 'm6', type: 'system', level: 'info', title: '密码即将过期', content: '您的账号密码将于 7 天后过期，请及时修改。', time: '2026-03-24 10:00', read: true },
  { id: 'm7', type: 'task', level: 'info', title: '新任务分配', content: '您被分配了新任务「前端权限模块重构」，优先级：高。', time: '2026-03-23 14:00', read: true, sender: 'Bob Wang' },
  { id: 'm8', type: 'alert', level: 'warning', title: '磁盘空间不足', content: '数据库服务器磁盘使用率达到 85%，建议清理。', time: '2026-03-23 09:00', read: true },
  { id: 'm9', type: 'system', level: 'info', title: '新功能上线', content: '文件管理器已上线，支持拖拽上传和在线预览。', time: '2026-03-22 11:00', read: true },
  { id: 'm10', type: 'approval', level: 'info', title: '加班审批待处理', content: 'Carol Li 提交了周末加班申请，请审批。', time: '2026-03-22 08:30', read: false, sender: 'Carol Li' },
];

/* 模拟实时推送的消息池 */
const PUSH_POOL: Omit<NotificationItem, 'id' | 'time' | 'read'>[] = [
  { type: 'approval', level: 'info', title: '新的审批请求', content: 'David Zhao 提交了采购申请（¥12,000），请审批。', sender: 'David Zhao' },
  { type: 'alert', level: 'error', title: 'API 响应超时', content: '订单服务 /api/orders 接口 P99 延迟超过 3s。' },
  { type: 'task', level: 'info', title: '代码评审提醒', content: '您有 2 个 Pull Request 等待 Review。', sender: 'GitBot' },
  { type: 'system', level: 'success', title: '数据备份完成', content: '每日数据备份已完成，备份大小 2.3 GB。' },
  { type: 'task', level: 'warning', title: '迭代即将结束', content: 'Sprint 12 将于后天结束，剩余 3 个未完成任务。', sender: 'PM Bot' },
  { type: 'alert', level: 'warning', title: '异常登录检测', content: '检测到您的账号在新设备上登录，请确认是否本人操作。' },
];

const NotificationDemo: React.FC = () => {
  const [messages, setMessages] = useState<NotificationItem[]>(INITIAL_MESSAGES);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [pushEnabled, setPushEnabled] = useState(true);
  const pushIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── 模拟实时推送 ── */
  useEffect(() => {
    if (pushEnabled) {
      timerRef.current = setInterval(() => {
        const template = PUSH_POOL[pushIndexRef.current % PUSH_POOL.length];
        pushIndexRef.current++;
        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const newMsg: NotificationItem = { ...template, id: genId(), time: timeStr, read: false };
        setMessages(prev => [newMsg, ...prev]);
        message.info({ content: `📨 ${newMsg.title}`, duration: 2 });
      }, 8000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pushEnabled]);

  /* ── 过滤 ── */
  const filtered = useMemo(() => {
    if (activeTab === 'all') return messages;
    if (activeTab === 'unread') return messages.filter(m => !m.read);
    return messages.filter(m => m.type === activeTab);
  }, [messages, activeTab]);

  const unreadCount = useMemo(() => messages.filter(m => !m.read).length, [messages]);
  const unreadByType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of messages) {
      if (!m.read) map[m.type] = (map[m.type] || 0) + 1;
    }
    return map;
  }, [messages]);

  /* ── 操作 ── */
  const markRead = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  }, []);

  const markAllRead = useCallback(() => {
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
    message.success('已全部标记为已读');
  }, []);

  const deleteMsg = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const clearRead = useCallback(() => {
    setMessages(prev => prev.filter(m => !m.read));
    message.success('已清除已读消息');
  }, []);

  const tabItems = useMemo(() => [
    { key: 'all', label: <Badge count={unreadCount} size="small" offset={[8, 0]}>全部</Badge> },
    { key: 'unread', label: <Badge count={unreadCount} size="small" offset={[8, 0]}>未读</Badge> },
    ...Object.entries(TYPE_CONFIG).map(([key, cfg]) => ({
      key,
      label: <Badge count={unreadByType[key] || 0} size="small" offset={[8, 0]}>{cfg.label}</Badge>,
    })),
  ], [unreadCount, unreadByType]);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* 顶部统计 */}
      <Card size="small" style={{ marginBottom: 12 }} styles={{ body: { padding: '8px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <BellOutlined style={{ fontSize: 18 }} />
            <Text strong style={{ fontSize: 16 }}>消息中心</Text>
            <Badge count={unreadCount} style={{ backgroundColor: '#ff4d4f' }} />
          </Space>
          <Space>
            <Tooltip title={pushEnabled ? '暂停实时推送' : '开启实时推送'}>
              <Space size={4}>
                <Text type="secondary" style={{ fontSize: 12 }}>实时推送</Text>
                <Switch size="small" checked={pushEnabled} onChange={setPushEnabled}
                  checkedChildren={<SoundOutlined />} unCheckedChildren={<PauseOutlined />} />
              </Space>
            </Tooltip>
            <Button size="small" icon={<CheckOutlined />} onClick={markAllRead} disabled={unreadCount === 0}>
              全部已读
            </Button>
            <Button size="small" icon={<DeleteOutlined />} onClick={clearRead}>
              清除已读
            </Button>
          </Space>
        </div>
      </Card>

      {/* 消息列表 */}
      <Card styles={{ body: { padding: 0 } }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} tabBarStyle={{ padding: '0 16px', marginBottom: 0 }}
          items={tabItems.map(t => ({
            ...t,
            children: (
              <List
                dataSource={filtered}
                locale={{ emptyText: <Empty description="暂无消息" style={{ padding: 32 }} /> }}
                renderItem={item => (
                  <List.Item
                    key={item.id}
                    style={{
                      padding: '12px 16px',
                      background: item.read ? undefined : 'rgba(22,119,255,0.02)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => markRead(item.id)}
                    actions={[
                      !item.read && (
                        <Tooltip title="标记已读" key="read">
                          <Button type="text" size="small" icon={<CheckOutlined />}
                            onClick={e => { e.stopPropagation(); markRead(item.id); }} />
                        </Tooltip>
                      ),
                      <Tooltip title="删除" key="del">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />}
                          onClick={e => { e.stopPropagation(); deleteMsg(item.id); }} />
                      </Tooltip>,
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge dot={!item.read} offset={[-2, 2]}>
                          <Avatar style={{ backgroundColor: `${TYPE_CONFIG[item.type].color === 'blue' ? '#1677ff' : TYPE_CONFIG[item.type].color === 'purple' ? '#722ed1' : TYPE_CONFIG[item.type].color === 'cyan' ? '#13c2c2' : '#ff4d4f'}15` }}
                            icon={LEVEL_ICONS[item.level]} />
                        </Badge>
                      }
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text strong={!item.read} style={{ fontSize: 14 }}>{item.title}</Text>
                          <Tag color={TYPE_CONFIG[item.type].color} style={{ fontSize: 11, margin: 0 }}>
                            {TYPE_CONFIG[item.type].label}
                          </Tag>
                        </div>
                      }
                      description={
                        <div>
                          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 4 }} ellipsis={{ rows: 2 }}>
                            {item.content}
                          </Paragraph>
                          <Space size={12}>
                            <Text type="secondary" style={{ fontSize: 11 }}>{item.time}</Text>
                            {item.sender && <Text type="secondary" style={{ fontSize: 11 }}>来自 {item.sender}</Text>}
                          </Space>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ),
          }))}
        />
      </Card>
    </div>
  );
};

export default NotificationDemo;
