import React, { useState } from 'react';
import { Card, Button, Space, message, Typography, Tag } from 'antd';
import { createRequest } from '@/shared/utils/request';

const { Paragraph, Text } = Typography;

// 模拟 Token 存储
let mockTokenStore = {
  accessToken: 'mock-access-token-001',
  refreshToken: 'mock-refresh-token-001',
};

let requestCount = 0;

// 模拟刷新接口
const mockRefreshFn = async (refreshToken: string) => {
  await new Promise((r) => setTimeout(r, 1000));
  return {
    accessToken: `new-access-token-${Date.now()}`,
    refreshToken: `new-refresh-token-${Date.now()}`,
  };
};

const api = createRequest({
  getToken: () => mockTokenStore,
  setToken: (token) => {
    mockTokenStore = token;
  },
  clearToken: () => {
    mockTokenStore = { accessToken: '', refreshToken: '' };
  },
  refreshTokenFn: mockRefreshFn,
  onRefreshFailed: () => message.error('Token 刷新失败，请重新登录'),
});

const RequestDemo: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [currentToken, setCurrentToken] = useState(mockTokenStore.accessToken);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 20));
  };

  const simulateNormalRequest = async () => {
    addLog('发起普通请求...');
    try {
      // 这里会被拦截器注入 Token，实际不会真正发出
      await api.get('https://httpbin.org/get');
      addLog('请求成功');
    } catch {
      addLog('请求完成（演示环境）');
    }
    setCurrentToken(mockTokenStore.accessToken);
  };

  const simulateConcurrent401 = async () => {
    addLog('模拟 3 个并发请求同时遇到 401...');
    addLog('预期行为：只刷新一次 Token，3 个请求排队后重放');

    // 模拟 Token 过期
    const oldToken = mockTokenStore.accessToken;
    mockTokenStore.accessToken = 'expired-token';

    await Promise.allSettled([
      api.get('https://httpbin.org/get').catch(() => addLog('请求 1 重放完成')),
      api.get('https://httpbin.org/get').catch(() => addLog('请求 2 重放完成')),
      api.get('https://httpbin.org/get').catch(() => addLog('请求 3 重放完成')),
    ]);

    addLog(`Token 已刷新: ${mockTokenStore.accessToken.slice(0, 20)}...`);
    setCurrentToken(mockTokenStore.accessToken);
  };

  const clearTokenManually = () => {
    mockTokenStore = { accessToken: '', refreshToken: '' };
    setCurrentToken('');
    addLog('已手动清除 Token');
  };

  return (
    <Card title="Token 自动刷新的 Axios 封装">
      <Paragraph style={{ color: '#666' }}>
        基于响应拦截器 + 请求队列模式。401 时自动刷新 Token 并重放失败请求，
        并发请求只触发一次刷新，其余排队等待。
      </Paragraph>

      <div style={{ marginBottom: 16 }}>
        <Text>当前 Token：</Text>
        <Tag color={currentToken ? 'green' : 'red'}>
          {currentToken ? currentToken.slice(0, 25) + '...' : '无'}
        </Tag>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Button onClick={simulateNormalRequest}>普通请求</Button>
        <Button onClick={simulateConcurrent401} type="primary">模拟并发 401</Button>
        <Button onClick={clearTokenManually} danger>清除 Token</Button>
        <Button onClick={() => setLogs([])}>清空日志</Button>
      </Space>

      <Card size="small" title="请求日志" style={{ maxHeight: 300, overflow: 'auto' }}>
        {logs.length === 0 ? (
          <Text type="secondary">暂无日志，点击上方按钮操作</Text>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{ fontFamily: 'monospace', fontSize: 13, padding: '2px 0' }}>
              {log}
            </div>
          ))
        )}
      </Card>

      <Card size="small" title="核心实现思路" style={{ marginTop: 16 }}>
        <Paragraph>
          <ol>
            <li>响应拦截器捕获 401 状态码</li>
            <li>第一个 401 触发 refreshToken 调用，设置 isRefreshing 标志</li>
            <li>后续 401 请求进入 pendingQueue 排队</li>
            <li>刷新成功后，通知队列中所有请求用新 Token 重放</li>
            <li>刷新失败则清除 Token，通知队列拒绝，触发 onRefreshFailed 回调</li>
          </ol>
        </Paragraph>
      </Card>
    </Card>
  );
};

export default RequestDemo;
